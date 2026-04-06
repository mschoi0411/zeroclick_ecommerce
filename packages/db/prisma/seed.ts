import { Prisma, PrismaClient, CartStatus, OrderStatus, PaymentStatus, ProductStatus, ShipmentStatusEnum, UserRole, UserStatus, ChatSessionStatus, ChatRole, DiscountType, InventoryStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await resetDatabase();

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@zeroclick.local',
      phone: '010-0000-0000',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          defaultAddress: '서울시 성수동 관리자 주소',
          preferredBrands: ['Zero Standard', 'Urban Mood', 'Airy Home'],
          budgetRange: '5만원 이하',
          styleTags: ['basic', 'daily'],
        },
      },
    },
  });

  const shopper = await prisma.user.create({
    data: {
      email: 'shopper@zeroclick.local',
      phone: '010-1111-1111',
      role: UserRole.CUSTOMER,
      status: UserStatus.ACTIVE,
      profile: {
        create: {
          defaultAddress: '서울시 성수동 기본 배송지',
          preferredBrands: ['Zero Standard', 'Maison de Nuage'],
          budgetRange: '5만원 이하',
          styleTags: ['campus', 'gift'],
        },
      },
    },
  });

  const fashion = await prisma.category.create({
    data: { name: '패션', slug: 'fashion', depth: 0 },
  });
  const home = await prisma.category.create({
    data: { name: '리빙', slug: 'living', depth: 0 },
  });
  const beauty = await prisma.category.create({
    data: { name: '뷰티', slug: 'beauty', depth: 0 },
  });

  const hoodies = await prisma.category.create({
    data: { name: '후드티', slug: 'hoodies', depth: 1, parentId: fashion.id },
  });
  const airPurifiers = await prisma.category.create({
    data: { name: '공기청정기', slug: 'air-purifiers', depth: 1, parentId: home.id },
  });
  const perfumes = await prisma.category.create({
    data: { name: '향수', slug: 'perfumes', depth: 1, parentId: beauty.id },
  });

  const hoodie1 = await createProduct({
    categoryId: hoodies.id,
    name: '에어플로우 블랙 후드티',
    brand: 'Zero Standard',
    description: '데일리 착장에 잘 맞는 오버핏 후드티',
    color: 'black',
    tags: ['basic', 'campus', 'daily'],
    highlights: ['오버핏 실루엣', '기모 없는 사계절용', '생활방수 가공 원단'],
    recommendations: ['5만원 이하 예산 조건 충족', '검정색 선호와 잘 맞는 베이직 디자인', 'M/L 재고가 모두 남아 있음'],
    shippingEta: '내일 도착',
    inventoryStatus: InventoryStatus.IN_STOCK,
    imageUrl: '/demo-products/airflow-black-hoodie.png',
    variants: [
      { sku: 'ZC-HOODIE-BLK-001-M', label: 'M', size: 'M', color: 'black', stock: 8, basePrice: 59000, salePrice: 47000 },
      { sku: 'ZC-HOODIE-BLK-001-L', label: 'L', size: 'L', color: 'black', stock: 3, basePrice: 59000, salePrice: 47000 },
    ],
    reviews: [
      { rating: 5, content: '핏이 깔끔하고 생각보다 가볍습니다.' },
      { rating: 4, content: '출근용으로 무난해서 자주 입게 됩니다.' },
      { rating: 5, content: '검정색 톤이 예쁘고 후드 모양이 잘 잡혀요.' },
    ],
  });

  const hoodie2 = await createProduct({
    categoryId: hoodies.id,
    name: '시티 루프 후드티',
    brand: 'Urban Mood',
    description: '원단 존재감이 있는 스트리트 무드 후드티',
    color: 'black',
    tags: ['street', 'heavyweight', 'gift'],
    highlights: ['헤비웨이트 코튼', '넉넉한 후드 쉐입', '커플템 수요 높음'],
    recommendations: ['후드 쉐입 만족도가 높음', '원단 만족도 우수', '선물용으로도 무난한 스타일'],
    shippingEta: '모레 도착',
    inventoryStatus: InventoryStatus.LOW_STOCK,
    imageUrl: '/demo-products/city-loop-hoodie.png',
    variants: [
      { sku: 'UR-HOODIE-BLK-002-M', label: 'M', size: 'M', color: 'black', stock: 2, basePrice: 65000, salePrice: 49000 },
      { sku: 'UR-HOODIE-BLK-002-L', label: 'L', size: 'L', color: 'black', stock: 0, basePrice: 65000, salePrice: 49000 },
    ],
    reviews: [
      { rating: 5, content: '원단이 탄탄해서 오래 입기 좋습니다.' },
      { rating: 4, content: '후드 모양이 예뻐서 사진발이 잘 받아요.' },
    ],
  });

  const air1 = await createProduct({
    categoryId: airPurifiers.id,
    name: '룸핏 미니 공기청정기',
    brand: 'Airy Home',
    description: '원룸과 작은 방에 적합한 저소음 공기청정기',
    color: 'white',
    tags: ['one-room', 'quiet', 'small-space'],
    highlights: ['원룸 10평형 대응', '야간 저소음 모드', '필터 교체 쉬움'],
    recommendations: ['원룸용으로 크기가 작고 관리가 쉬움', '소음이 낮아 침실 사용 적합', '할인 적용 시 10만원대 후반 진입'],
    shippingEta: '내일 도착',
    inventoryStatus: InventoryStatus.IN_STOCK,
    imageUrl: '/demo-products/roomfit-mini-air-purifier.png',
    variants: [
      { sku: 'AH-AIR-001-DEFAULT', label: '기본', stock: 12, basePrice: 179000, salePrice: 139000 },
    ],
    reviews: [
      { rating: 5, content: '소음이 적어서 자취방에 두기 좋았습니다.' },
      { rating: 4, content: '필터 교체가 간단해서 관리가 편해요.' },
      { rating: 5, content: '작은 공간에서 체감이 꽤 좋습니다.' },
    ],
  });

  const air2 = await createProduct({
    categoryId: airPurifiers.id,
    name: '에어큐브 컴팩트',
    brand: 'Breath Lab',
    description: '책상 옆과 원룸 코너에 잘 맞는 컴팩트형 공기청정기',
    color: 'gray',
    tags: ['compact', 'silent', 'bedroom'],
    highlights: ['책상 위 사용 가능', '2단계 자동 풍량 조절', '필터 비용 낮음'],
    recommendations: ['작은 공간과 예산 중심 고객에게 적합', '야간 모드가 안정적', '유지 비용이 비교적 낮음'],
    shippingEta: '2일 내 도착',
    inventoryStatus: InventoryStatus.IN_STOCK,
    imageUrl: '/demo-products/aircube-compact.png',
    variants: [
      { sku: 'BL-AIR-002-DEFAULT', label: '기본', stock: 9, basePrice: 149000, salePrice: 119000 },
    ],
    reviews: [
      { rating: 4, content: '책상 옆에 놓기 좋고 크기가 부담되지 않아요.' },
      { rating: 4, content: '필터 가격이 괜찮아서 유지가 쉽습니다.' },
    ],
  });

  const perfume1 = await createProduct({
    categoryId: perfumes.id,
    name: '데일리 블룸 오 드 퍼퓸',
    brand: 'Maison de Nuage',
    description: '가벼운 플로럴 시트러스 계열 선물용 향수',
    color: 'pink',
    tags: ['gift', 'floral', '20s'],
    highlights: ['가벼운 플로럴 시트러스', '선물 포장 옵션', '재구매율 높음'],
    recommendations: ['20대 선물 카테고리 만족도 높음', '무겁지 않은 향 선호에 적합', '패키지 후기가 좋음'],
    shippingEta: '2일 내 도착',
    inventoryStatus: InventoryStatus.IN_STOCK,
    imageUrl: '/demo-products/daily-bloom-perfume.png',
    variants: [
      { sku: 'MN-PERF-001-50', label: '50ml', stock: 5, basePrice: 82000, salePrice: 69000 },
    ],
    reviews: [
      { rating: 5, content: '선물로 줬는데 패키지도 향도 만족도가 높았습니다.' },
      { rating: 4, content: '무겁지 않고 데일리로 쓰기 좋은 향이에요.' },
    ],
  });

  const perfume2 = await createProduct({
    categoryId: perfumes.id,
    name: '시트러스 베일 오 드 퍼퓸',
    brand: 'Atelier Noon',
    description: '상쾌한 첫인상이 강한 시트러스 계열 향수',
    color: 'yellow',
    tags: ['gift', 'citrus', 'fresh'],
    highlights: ['밝은 시트러스 탑노트', '호불호 적음', '기념일 선물 수요 높음'],
    recommendations: ['무난한 선물용 향수로 적합', '가벼운 향 선호 고객에 적합', '첫인상 만족도가 높음'],
    shippingEta: '내일 도착',
    inventoryStatus: InventoryStatus.IN_STOCK,
    imageUrl: '/demo-products/citrus-veil-perfume.png',
    variants: [
      { sku: 'AN-PERF-002-50', label: '50ml', stock: 7, basePrice: 76000, salePrice: 64000 },
    ],
    reviews: [
      { rating: 5, content: '가볍게 쓰기 좋아서 데일리 선물용으로 좋습니다.' },
      { rating: 4, content: '시트러스 느낌이 산뜻해서 호불호가 적어요.' },
    ],
  });

  const activeCart = await prisma.cart.create({
    data: {
      userId: shopper.id,
      status: CartStatus.ACTIVE,
      subtotal: 47000,
      discountTotal: 3000,
      shippingFee: 0,
      grandTotal: 44000,
    },
  });

  await prisma.cartItem.create({
    data: {
      cartId: activeCart.id,
      variantId: hoodie1.variants[0].id,
      quantity: 1,
      unitPrice: 47000,
      lineTotal: 47000,
    },
  });

  const placedOrder = await prisma.order.create({
    data: {
      userId: shopper.id,
      orderNo: 'ZC-SEED-1001',
      status: OrderStatus.PLACED,
      shippingAddress: '서울시 성수동 기본 배송지',
      paymentMethod: '기본 카드 ·•••• 1024',
      subtotal: 64000,
      discountTotal: 4000,
      shippingFee: 0,
      grandTotal: 60000,
      eta: '내일 도착',
      items: {
        create: [
          {
            variantId: perfume2.variants[0].id,
            productName: '시트러스 베일 오 드 퍼퓸',
            variantLabel: '50ml',
            quantity: 1,
            unitPrice: 64000,
            lineTotal: 64000,
          },
        ],
      },
      payment: {
        create: {
          provider: 'manual',
          amount: 60000,
          status: PaymentStatus.APPROVED,
          approvedAt: new Date(),
        },
      },
      shipment: {
        create: {
          carrier: 'CJ대한통운',
          trackingNo: 'ZXSEED1001',
          shipmentStatus: ShipmentStatusEnum.IN_TRANSIT,
          lastEventAt: new Date(),
          timelineJson: [
            { status: '주문 완료', description: '주문이 정상 접수되었습니다.', at: new Date().toISOString() },
            { status: '출고 완료', description: '물류센터에서 출고되었습니다.', at: new Date().toISOString() },
            { status: '배송 중', description: '배송 허브 이동 중입니다.', at: new Date().toISOString() },
          ],
        },
      },
    },
  });

  const session = await prisma.chatSession.create({
    data: {
      userId: shopper.id,
      channel: 'web',
      sessionStatus: ChatSessionStatus.ACTIVE,
    },
  });

  const userMessage = await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: ChatRole.USER,
      messageText: '검정 후드티 5만원 이하로 추천해줘',
      uiPayloadJson: { phase: 'questioning' },
    },
  });

  await prisma.chatMessage.create({
    data: {
      sessionId: session.id,
      role: ChatRole.ASSISTANT,
      messageText: '조건에 맞는 후보 2개를 추렸어요. 어떤 상품이 가장 마음에 드는지 골라주세요.',
      uiPayloadJson: { phase: 'recommendations' },
    },
  });

  await prisma.intentLog.create({
    data: {
      messageId: userMessage.id,
      predictedIntent: 'product_search',
      finalIntent: 'product_search',
      confidence: 0.94,
    },
  });

  await prisma.slotLog.createMany({
    data: [
      { messageId: userMessage.id, slotName: 'category', slotValue: '후드티', source: 'llm', confidence: 0.92, validated: true },
      { messageId: userMessage.id, slotName: 'color', slotValue: 'black', source: 'llm', confidence: 0.89, validated: true },
      { messageId: userMessage.id, slotName: 'max_price', slotValue: '50000', source: 'llm', confidence: 0.95, validated: true },
    ],
  });

  await prisma.recommendationLog.createMany({
    data: [
      { sessionId: session.id, productId: hoodie1.id, requestContextJson: { query: '검정 후드티', budget: 50000 }, rankingScoresJson: { relevance: 0.94, stock: 1 } },
      { sessionId: session.id, productId: hoodie2.id, requestContextJson: { query: '검정 후드티', budget: 50000 }, rankingScoresJson: { relevance: 0.88, stock: 0.4 } },
    ],
  });

  await prisma.actionExecutionLog.createMany({
    data: [
      { sessionId: session.id, actionType: 'search_products', requestPayloadHash: 'seed-search', responseStatus: 'success', approvalRequired: false, traceId: 'trace-seed-001' },
      { sessionId: session.id, actionType: 'add_to_cart', requestPayloadHash: 'seed-cart', responseStatus: 'success', approvalRequired: false, traceId: 'trace-seed-002' },
    ],
  });

  await prisma.fallbackLog.create({
    data: {
      sessionId: session.id,
      fallbackType: 'clarification_needed',
      reason: '선물용 여부를 추가 확인해야 하는 상황',
      resolvedBy: 'assistant',
    },
  });

  await prisma.adminEventLog.create({
    data: {
      adminId: adminUser.id,
      eventType: 'seed_initialized',
      targetId: placedOrder.id,
      afterJson: { orderNo: placedOrder.orderNo, cartId: activeCart.id },
    },
  });

  await prisma.coupon.createMany({
    data: [
      { code: 'WELCOME10', discountType: DiscountType.FIXED, discountValue: 3000, minOrderAmount: 30000, validFrom: new Date('2026-01-01'), validTo: new Date('2027-01-01') },
      { code: 'GIFT5', discountType: DiscountType.PERCENTAGE, discountValue: 5, minOrderAmount: 50000, validFrom: new Date('2026-01-01'), validTo: new Date('2027-01-01') },
    ],
  });
}

async function createProduct(input: {
  categoryId: string;
  name: string;
  brand: string;
  description: string;
  color: string;
  tags: string[];
  highlights: string[];
  recommendations: string[];
  shippingEta: string;
  inventoryStatus: InventoryStatus;
  imageUrl: string | null;
  variants: Array<{ sku: string; label: string; size?: string; color?: string; stock: number; basePrice: number; salePrice: number }>;
  reviews: Array<{ rating: number; content: string }>;
}): Promise<Prisma.ProductGetPayload<{ include: { variants: true } }>> {
  return prisma.product.create({
    data: {
      categoryId: input.categoryId,
      name: input.name,
      brand: input.brand,
      description: input.description,
      imageUrl: input.imageUrl,
      color: input.color,
      tagsJson: input.tags,
      highlightsJson: input.highlights,
      recommendationJson: input.recommendations,
      shippingEta: input.shippingEta,
      inventoryStatus: input.inventoryStatus,
      status: ProductStatus.ACTIVE,
      variants: {
        create: input.variants.map((variant) => ({
          sku: variant.sku,
          label: variant.label,
          size: variant.size,
          color: variant.color,
          inventory: { create: { availableQty: variant.stock, reservedQty: 0 } },
          prices: { create: { basePrice: variant.basePrice, salePrice: variant.salePrice, currency: 'KRW' } },
        })),
      },
      reviews: {
        create: input.reviews.map((review) => ({ rating: review.rating, content: review.content, sentimentScore: review.rating >= 4 ? 0.9 : 0.4 })),
      },
    },
    include: {
      variants: true,
    },
  });
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.adminEventLog.deleteMany(),
    prisma.actionExecutionLog.deleteMany(),
    prisma.fallbackLog.deleteMany(),
    prisma.recommendationLog.deleteMany(),
    prisma.slotLog.deleteMany(),
    prisma.intentLog.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.chatSession.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.review.deleteMany(),
    prisma.price.deleteMany(),
    prisma.inventory.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.userProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
