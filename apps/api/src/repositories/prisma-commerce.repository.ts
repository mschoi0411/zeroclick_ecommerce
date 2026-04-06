import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AddToCartRequest,
  AnalyticsSummary,
  CartSummary,
  CheckoutPreviewRequest,
  CompareResult,
  OrderSummary,
  Product,
  ProductVariant,
  RecommendationResult,
  SearchRequest,
  ShipmentStatus,
} from '@zeroclick/domain';
import {
  CartStatus,
  InventoryStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  ShipmentStatusEnum,
  type Prisma,
  type Price,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CommerceRepository } from './commerce.repository';

const productInclude = {
  category: true,
  variants: {
    include: {
      inventory: true,
      prices: { orderBy: { startsAt: 'desc' as const } },
    },
  },
  reviews: true,
} satisfies Prisma.ProductInclude;

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: true,
          inventory: true,
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

type ProductRecord = Prisma.ProductGetPayload<{
  include: typeof productInclude;
}>;
type CartRecord = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

@Injectable()
export class PrismaCommerceRepository implements CommerceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async searchProducts(request: SearchRequest): Promise<RecommendationResult> {
    const items = await this.findProducts(request, 3);

    return {
      title: '추천 결과',
      description: '요청 조건과 현재 구매 가능성을 함께 반영한 결과입니다.',
      items,
      reasoning: [
        request.maxPrice
          ? `${request.maxPrice.toLocaleString()}원 이하 가격 조건을 우선 반영했습니다.`
          : '가격 제한이 없어 적합도와 최신성을 우선 반영했습니다.',
        request.color
          ? `${request.color} 색상 조건을 반영했습니다.`
          : '색상 제한 없이 가장 적합한 결과를 추렸습니다.',
        '재고와 배송 가능성을 같이 고려했습니다.',
      ],
    };
  }

  async getFeaturedProducts(): Promise<RecommendationResult> {
    const items = await this.findProducts({}, 3);
    return {
      title: '오늘의 제안',
      description: '최근 등록된 상품과 구매 가능 상태를 기준으로 선별했습니다.',
      items,
      reasoning: [
        '현재 판매 가능한 상품 위주로 구성했습니다.',
        '비교하거나 장바구니에 담기 쉬운 상품입니다.',
      ],
    };
  }

  async getProduct(productId: string): Promise<Product> {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, status: ProductStatus.ACTIVE },
      include: productInclude,
    });

    if (!product) {
      throw new NotFoundException('상품을 찾을 수 없습니다.');
    }

    return this.mapProduct(product);
  }

  async compareProducts(productIds: string[]): Promise<CompareResult> {
    const products = await Promise.all(
      productIds.map((productId) => this.getProduct(productId)),
    );

    return {
      products,
      summary: this.buildCompareSummary(products),
      differences: [
        {
          label: '가격',
          values: products.map(
            (product) => `₩${product.salePrice.toLocaleString()}`,
          ),
        },
        {
          label: '평점',
          values: products.map((product) => product.rating.toFixed(1)),
        },
        {
          label: '배송',
          values: products.map((product) => product.shippingEta),
        },
        {
          label: '핵심 특징',
          values: products.map((product) => product.highlights[0] ?? '-'),
        },
      ],
    };
  }

  async getCart(): Promise<CartSummary> {
    const cart = await this.getOrCreateActiveCart();
    return this.mapCart(cart);
  }

  async addToCart(request: AddToCartRequest): Promise<CartSummary> {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: request.variantId, productId: request.productId },
      include: {
        product: true,
        inventory: true,
        prices: { orderBy: { startsAt: 'desc' } },
      },
    });

    if (!variant) {
      throw new NotFoundException('선택한 옵션을 찾을 수 없습니다.');
    }

    if (variant.product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('현재 판매 중인 상품이 아닙니다.');
    }

    if ((variant.inventory?.availableQty ?? 0) < request.quantity) {
      throw new NotFoundException('재고가 부족합니다.');
    }

    const activeCart = await this.getOrCreateActiveCart();
    const latestPrice = this.getLatestPrice(variant.prices);
    if (!latestPrice || latestPrice.salePrice <= 0) {
      throw new NotFoundException('유효한 가격 정보가 없습니다.');
    }
    const unitPrice = latestPrice.salePrice;

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.cartItem.findFirst({
        where: { cartId: activeCart.id, variantId: request.variantId },
      });

      if (existing) {
        const quantity = existing.quantity + request.quantity;
        await tx.cartItem.update({
          where: { id: existing.id },
          data: { quantity, lineTotal: quantity * unitPrice, unitPrice },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: activeCart.id,
            variantId: request.variantId,
            quantity: request.quantity,
            unitPrice,
            lineTotal: request.quantity * unitPrice,
          },
        });
      }

      await this.recalculateCart(activeCart.id, tx);
    });

    const cart = await this.getOrCreateActiveCart();
    return this.mapCart(cart);
  }

  async removeFromCart(itemId: string): Promise<CartSummary> {
    const existing = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });
    if (!existing) {
      throw new NotFoundException('장바구니 항목을 찾을 수 없습니다.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.cartItem.delete({ where: { id: itemId } });
      await this.recalculateCart(existing.cartId, tx);
    });

    const cart = await this.getOrCreateActiveCart();
    return this.mapCart(cart);
  }

  async previewCheckout(
    request: CheckoutPreviewRequest,
  ): Promise<OrderSummary> {
    const cart = await this.getOrCreateActiveCart();
    const mappedCart = this.mapCart(cart);

    if (mappedCart.items.length === 0) {
      throw new NotFoundException(
        '주문 미리보기를 생성할 장바구니 상품이 없습니다.',
      );
    }

    return {
      orderId: 'preview',
      status: 'pending_confirmation',
      items: mappedCart.items,
      shippingAddress: request.shippingAddress ?? '서울시 성수동 기본 배송지',
      paymentMethod: request.paymentMethod ?? '기본 카드 ·•••• 1024',
      totals: {
        subtotal: mappedCart.subtotal,
        discountTotal: mappedCart.discountTotal,
        shippingFee: mappedCart.shippingFee,
        grandTotal: mappedCart.grandTotal,
      },
      eta: this.deriveEtaFromCart(mappedCart),
    };
  }

  async placeOrder(): Promise<OrderSummary> {
    const cart = await this.getOrCreateActiveCart();
    const mappedCart = this.mapCart(cart);

    if (mappedCart.items.length === 0) {
      throw new NotFoundException('주문할 장바구니 상품이 없습니다.');
    }

    for (const item of cart.items) {
      const stock = item.variant.inventory?.availableQty ?? 0;
      if (stock < item.quantity) {
        throw new NotFoundException(
          `${item.variant.product.name} 재고가 부족합니다.`,
        );
      }

      if (item.unitPrice <= 0) {
        throw new NotFoundException(
          `${item.variant.product.name}의 가격 정보가 올바르지 않습니다.`,
        );
      }
    }

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      const orderNo = `ZC-${Date.now()}`;
      const order = await tx.order.create({
        data: {
          orderNo,
          status: OrderStatus.PLACED,
          shippingAddress: '서울시 성수동 기본 배송지',
          paymentMethod: '기본 카드 ·•••• 1024',
          subtotal: mappedCart.subtotal,
          discountTotal: mappedCart.discountTotal,
          shippingFee: mappedCart.shippingFee,
          grandTotal: mappedCart.grandTotal,
          eta: this.deriveEtaFromCart(mappedCart),
        },
      });

      for (const item of cart.items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            variantId: item.variantId,
            productName: item.variant.product.name,
            variantLabel: item.variant.label,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
          },
        });

        if (item.variant.inventory) {
          await tx.inventory.update({
            where: { variantId: item.variantId },
            data: {
              availableQty: { decrement: item.quantity },
            },
          });
        }
      }

      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: 'manual',
          amount: mappedCart.grandTotal,
          status: PaymentStatus.PENDING,
        },
      });

      await tx.shipment.create({
        data: {
          orderId: order.id,
          carrier: 'CJ대한통운',
          trackingNo: `ZX${Date.now()}`,
          shipmentStatus: ShipmentStatusEnum.PENDING,
          timelineJson: [],
        },
      });

      await tx.cart.update({
        where: { id: cart.id },
        data: { status: CartStatus.CONVERTED },
      });
      await tx.cart.create({ data: { status: CartStatus.ACTIVE } });

      return order;
    });

    return this.getOrderSummaryById(createdOrder.id);
  }

  async getRecentShipment(): Promise<ShipmentStatus> {
    const shipment = await this.prisma.shipment.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { order: true },
    });

    if (!shipment) {
      throw new NotFoundException('최근 배송 정보가 없습니다.');
    }

    const timeline = Array.isArray(shipment.timelineJson)
      ? shipment.timelineJson
      : [];

    return {
      orderId: shipment.order.orderNo,
      currentStatus: this.mapShipmentStatus(shipment.shipmentStatus),
      lastUpdatedAt: (shipment.lastEventAt ?? shipment.updatedAt).toISOString(),
      trackingNumber: shipment.trackingNo,
      timeline: timeline.map((item) => ({
        status:
          typeof item === 'object' &&
          item &&
          !Array.isArray(item) &&
          'status' in item
            ? (this.jsonFieldToString(item.status) ??
              this.mapShipmentStatus(shipment.shipmentStatus))
            : this.mapShipmentStatus(shipment.shipmentStatus),
        description:
          typeof item === 'object' &&
          item &&
          !Array.isArray(item) &&
          'description' in item
            ? (this.jsonFieldToString(item.description) ??
              '배송 상태가 업데이트되었습니다.')
            : '배송 상태가 업데이트되었습니다.',
        at:
          typeof item === 'object' &&
          item &&
          !Array.isArray(item) &&
          'at' in item
            ? (this.jsonFieldToString(item.at) ??
              (shipment.lastEventAt ?? shipment.updatedAt).toISOString())
            : (shipment.lastEventAt ?? shipment.updatedAt).toISOString(),
      })),
    };
  }

  async cancelOrder(orderId: string): Promise<OrderSummary> {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ id: orderId }, { orderNo: orderId }] },
      include: { shipment: true, payment: true },
    });

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: OrderStatus.CANCELLED },
    });

    if (order.shipment) {
      await this.prisma.shipment.update({
        where: { orderId: order.id },
        data: { shipmentStatus: ShipmentStatusEnum.PENDING },
      });
    }

    if (order.payment) {
      await this.prisma.payment.update({
        where: { orderId: order.id },
        data: { status: PaymentStatus.CANCELLED },
      });
    }

    return this.getOrderSummaryById(order.id);
  }

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const [
      sessions,
      messagesAggregate,
      actionCount,
      actionSuccessCount,
      fallbackCount,
      orderAggregate,
      intentGroups,
    ] = await Promise.all([
      this.prisma.chatSession.count(),
      this.prisma.chatMessage.count(),
      this.prisma.actionExecutionLog.count(),
      this.prisma.actionExecutionLog.count({
        where: { responseStatus: 'success' },
      }),
      this.prisma.fallbackLog.count(),
      this.prisma.order.aggregate({
        _sum: { grandTotal: true },
        _count: { id: true },
      }),
      this.prisma.intentLog.groupBy({
        by: ['predictedIntent'],
        _count: { predictedIntent: true },
        orderBy: { _count: { predictedIntent: 'desc' } },
        take: 5,
      }),
    ]);

    const avgMessagesPerSession =
      sessions === 0 ? 0 : Number((messagesAggregate / sessions).toFixed(1));
    const actionSuccessRate =
      actionCount === 0
        ? 0
        : Number(((actionSuccessCount / actionCount) * 100).toFixed(1));
    const fallbackRate =
      sessions === 0
        ? 0
        : Number(((fallbackCount / sessions) * 100).toFixed(1));
    const conversationalRevenue = orderAggregate._sum.grandTotal ?? 0;
    const conversionRate =
      sessions === 0
        ? 0
        : Number(
            (((orderAggregate._count.id ?? 0) / sessions) * 100).toFixed(1),
          );

    return {
      sessions,
      avgMessagesPerSession,
      actionSuccessRate,
      fallbackRate,
      handoffRate: 0,
      conversionRate,
      conversationalRevenue,
      topIntents: intentGroups.map((group) => ({
        intent: this.normalizeIntentName(group.predictedIntent),
        count: group._count.predictedIntent,
      })),
    };
  }

  private async findProducts(
    request: Partial<SearchRequest>,
    limit: number,
  ): Promise<Product[]> {
    const andFilters: Prisma.ProductWhereInput[] = [
      { status: ProductStatus.ACTIVE },
    ];

    if (request.color) {
      andFilters.push({ color: { equals: request.color } });
    }

    if (request.category) {
      andFilters.push({
        OR: [
          { category: { name: { contains: request.category } } },
          { name: { contains: request.category } },
        ],
      });
    }

    if (request.query) {
      andFilters.push({
        OR: [
          { name: { contains: request.query } },
          { brand: { contains: request.query } },
          { category: { name: { contains: request.query } } },
        ],
      });
    }

    const where: Prisma.ProductWhereInput = {
      AND: andFilters,
    };

    const products = await this.prisma.product.findMany({
      where,
      include: productInclude,
      orderBy: { createdAt: 'desc' },
      take: limit * 4,
    });

    return products
      .map((product) => this.mapProduct(product))
      .filter((product) =>
        request.maxPrice
          ? product.salePrice > 0 && product.salePrice <= request.maxPrice
          : product.salePrice > 0,
      )
      .slice(0, limit);
  }

  private async getOrCreateActiveCart() {
    let cart = await this.prisma.cart.findFirst({
      where: { status: CartStatus.ACTIVE },
      orderBy: { updatedAt: 'desc' },
      include: cartInclude,
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { status: CartStatus.ACTIVE },
        include: cartInclude,
      });
    }

    return cart;
  }

  private async recalculateCart(cartId: string, tx: Prisma.TransactionClient) {
    const items = await tx.cartItem.findMany({ where: { cartId } });
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discountTotal = subtotal >= 45000 ? 3000 : 0;
    const shippingFee = subtotal >= 30000 || subtotal === 0 ? 0 : 3000;
    const grandTotal = subtotal - discountTotal + shippingFee;

    await tx.cart.update({
      where: { id: cartId },
      data: { subtotal, discountTotal, shippingFee, grandTotal },
    });
  }

  private async getOrderSummaryById(orderId: string): Promise<OrderSummary> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('주문을 찾을 수 없습니다.');
    }

    return {
      orderId: order.orderNo,
      status: this.mapOrderStatus(order.status),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.variant.productId,
        productName: item.productName,
        variantId: item.variantId,
        variantLabel: item.variantLabel,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      totals: {
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        shippingFee: order.shippingFee,
        grandTotal: order.grandTotal,
      },
      eta: order.eta ?? '배송 일정 미정',
    };
  }

  private mapProduct(product: ProductRecord): Product {
    const variants: ProductVariant[] = product.variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      size: variant.size ?? undefined,
      color: variant.color ?? undefined,
      stock: variant.inventory?.availableQty ?? 0,
    }));

    const priceCandidates = product.variants
      .map((variant) => this.getLatestPrice(variant.prices))
      .filter((price): price is Price => Boolean(price));

    const basePrice =
      priceCandidates.length > 0
        ? Math.min(...priceCandidates.map((price) => price.basePrice))
        : 0;
    const salePrice =
      priceCandidates.length > 0
        ? Math.min(...priceCandidates.map((price) => price.salePrice))
        : 0;
    const rating =
      product.reviews.length > 0
        ? product.reviews.reduce((sum, review) => sum + review.rating, 0) /
          product.reviews.length
        : 0;

    return {
      id: product.id,
      name: product.name,
      category: product.category.name,
      brand: product.brand,
      basePrice,
      salePrice,
      rating: Number(rating.toFixed(1)),
      reviewCount: product.reviews.length,
      image: product.imageUrl ?? '/demo-products/fallback.svg',
      color: product.color ?? 'unknown',
      tags: this.parseStringArray(product.tagsJson),
      highlights: this.parseStringArray(product.highlightsJson),
      recommendationReasons: this.parseStringArray(product.recommendationJson),
      variants,
      inventoryStatus: this.mapInventoryStatus(product.inventoryStatus),
      shippingEta: product.shippingEta ?? '배송 일정 미정',
    };
  }

  private mapCart(cart: CartRecord): CartSummary {
    return {
      id: cart.id,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cart.subtotal,
      discountTotal: cart.discountTotal,
      shippingFee: cart.shippingFee,
      grandTotal: cart.grandTotal,
      items: cart.items.map((item) => ({
        id: item.id,
        productId: item.variant.product.id,
        productName: item.variant.product.name,
        variantId: item.variantId,
        variantLabel: item.variant.label,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    };
  }

  private buildCompareSummary(products: Product[]): string[] {
    if (products.length < 2) {
      return ['비교할 상품이 충분하지 않습니다.'];
    }

    const cheapest = [...products].sort((a, b) => a.salePrice - b.salePrice)[0];
    const highestRated = [...products].sort((a, b) => b.rating - a.rating)[0];

    return [
      `${cheapest.name}는 가격 경쟁력이 가장 좋습니다.`,
      `${highestRated.name}는 평점 기준 만족도가 가장 높습니다.`,
    ];
  }

  private deriveEtaFromCart(cart: CartSummary): string {
    return cart.items.length > 0 ? '2일 내 도착' : '배송 일정 미정';
  }

  private parseStringArray(value: Prisma.JsonValue | null): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  private getLatestPrice(prices: Price[]): Price | null {
    return prices[0] ?? null;
  }

  private mapInventoryStatus(
    status: InventoryStatus,
  ): Product['inventoryStatus'] {
    switch (status) {
      case InventoryStatus.IN_STOCK:
        return 'in_stock';
      case InventoryStatus.LOW_STOCK:
        return 'low_stock';
      case InventoryStatus.OUT_OF_STOCK:
        return 'out_of_stock';
    }
  }

  private mapOrderStatus(status: OrderStatus): OrderSummary['status'] {
    switch (status) {
      case OrderStatus.PENDING_CONFIRMATION:
        return 'pending_confirmation';
      case OrderStatus.PLACED:
        return 'placed';
      case OrderStatus.SHIPPED:
        return 'shipped';
      case OrderStatus.DELIVERED:
        return 'delivered';
      case OrderStatus.CANCELLED:
        return 'cancelled';
    }
  }

  private mapShipmentStatus(status: ShipmentStatusEnum): string {
    switch (status) {
      case ShipmentStatusEnum.PENDING:
        return '배송 준비 중';
      case ShipmentStatusEnum.SHIPPED:
        return '출고 완료';
      case ShipmentStatusEnum.IN_TRANSIT:
        return '배송 중';
      case ShipmentStatusEnum.DELIVERED:
        return '배송 완료';
    }
  }

  private normalizeIntentName(
    intent: string,
  ): AnalyticsSummary['topIntents'][number]['intent'] {
    const supported = [
      'product_search',
      'product_compare',
      'product_detail',
      'add_to_cart',
      'remove_from_cart',
      'checkout_preview',
      'place_order',
      'track_order',
      'cancel_order',
      'recommendation_request',
      'faq_request',
      'handoff_request',
    ] as const;

    return (
      supported.includes(intent as (typeof supported)[number])
        ? intent
        : 'faq_request'
    ) as AnalyticsSummary['topIntents'][number]['intent'];
  }

  private jsonFieldToString(
    value: Prisma.JsonValue | undefined,
  ): string | null {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return `${value}`;
    }

    return null;
  }
}
