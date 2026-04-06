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

export const COMMERCE_REPOSITORY = Symbol('COMMERCE_REPOSITORY');

export interface CommerceRepository {
  searchProducts(request: SearchRequest): Promise<RecommendationResult>;
  getFeaturedProducts(): Promise<RecommendationResult>;
  getProduct(productId: string): Promise<Product>;
  compareProducts(productIds: string[]): Promise<CompareResult>;
  getCart(): Promise<CartSummary>;
  addToCart(request: AddToCartRequest): Promise<CartSummary>;
  removeFromCart(itemId: string): Promise<CartSummary>;
  previewCheckout(request: CheckoutPreviewRequest): Promise<OrderSummary>;
  placeOrder(): Promise<OrderSummary>;
  getRecentShipment(): Promise<ShipmentStatus>;
  cancelOrder(orderId: string): Promise<OrderSummary>;
  getAnalyticsSummary(): Promise<AnalyticsSummary>;
}
