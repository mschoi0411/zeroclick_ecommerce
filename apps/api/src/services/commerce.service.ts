import { Inject, Injectable } from '@nestjs/common';
import type {
  AddToCartRequest,
  AnalyticsSummary,
  CartSummary,
  CheckoutPreviewRequest,
  CompareResult,
  OrderSummary,
  Product,
  RecommendationResult,
  SearchRequest,
  ShipmentStatus,
} from '@zeroclick/domain';
import {
  COMMERCE_REPOSITORY,
  type CommerceRepository,
} from '../repositories/commerce.repository';

@Injectable()
export class CommerceService {
  constructor(
    @Inject(COMMERCE_REPOSITORY)
    private readonly repository: CommerceRepository,
  ) {}

  async searchProducts(request: SearchRequest): Promise<RecommendationResult> {
    return this.repository.searchProducts(request);
  }

  async getFeaturedProducts(): Promise<RecommendationResult> {
    return this.repository.getFeaturedProducts();
  }

  async getProduct(productId: string): Promise<Product> {
    return this.repository.getProduct(productId);
  }

  async compareProducts(productIds: string[]): Promise<CompareResult> {
    return this.repository.compareProducts(productIds);
  }

  async getCart(): Promise<CartSummary> {
    return this.repository.getCart();
  }

  async addToCart(request: AddToCartRequest): Promise<CartSummary> {
    return this.repository.addToCart(request);
  }

  async removeFromCart(itemId: string): Promise<CartSummary> {
    return this.repository.removeFromCart(itemId);
  }

  async previewCheckout(
    request: CheckoutPreviewRequest,
  ): Promise<OrderSummary> {
    return this.repository.previewCheckout(request);
  }

  async placeOrder(): Promise<OrderSummary> {
    return this.repository.placeOrder();
  }

  async getRecentShipment(): Promise<ShipmentStatus> {
    return this.repository.getRecentShipment();
  }

  async cancelOrder(orderId: string): Promise<OrderSummary> {
    return this.repository.cancelOrder(orderId);
  }

  async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    return this.repository.getAnalyticsSummary();
  }
}
