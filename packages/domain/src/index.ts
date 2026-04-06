export type Role = "customer" | "admin" | "support";

export type IntentName =
  | "product_search"
  | "recommendation_request"
  | "product_compare"
  | "product_detail"
  | "add_to_cart"
  | "remove_from_cart"
  | "checkout_preview"
  | "place_order"
  | "track_order"
  | "cancel_order"
  | "faq_request"
  | "handoff_request";

export type ChatRole = "user" | "assistant" | "system";

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  basePrice: number;
  salePrice: number;
  rating: number;
  reviewCount: number;
  image: string;
  color: string;
  tags: string[];
  highlights: string[];
  recommendationReasons: string[];
  variants: ProductVariant[];
  inventoryStatus: "in_stock" | "low_stock" | "out_of_stock";
  shippingEta: string;
}

export interface ProductVariant {
  id: string;
  label: string;
  size?: string;
  color?: string;
  stock: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  variantLabel: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CartSummary {
  id: string;
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  shippingFee: number;
  grandTotal: number;
  items: CartItem[];
}

export interface RecommendationResult {
  title: string;
  description: string;
  items: Product[];
  reasoning: string[];
}

export interface CompareResult {
  products: Product[];
  summary: string[];
  differences: Array<{
    label: string;
    values: string[];
  }>;
}

export interface OrderSummary {
  orderId: string;
  status: "pending_confirmation" | "placed" | "shipped" | "delivered" | "cancelled";
  items: CartItem[];
  shippingAddress: string;
  paymentMethod: string;
  totals: Pick<CartSummary, "subtotal" | "discountTotal" | "shippingFee" | "grandTotal">;
  eta: string;
}

export interface ShipmentStatus {
  orderId: string;
  currentStatus: string;
  lastUpdatedAt: string;
  trackingNumber: string;
  timeline: Array<{
    status: string;
    description: string;
    at: string;
  }>;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ConversationState {
  sessionId: string;
  lastIntent: IntentName | null;
  referencedProductIds: string[];
  compareProductIds: string[];
  latestCartId: string;
  preferredBudgetLabel: string | null;
}

export interface AnalyticsSummary {
  sessions: number;
  avgMessagesPerSession: number;
  actionSuccessRate: number;
  fallbackRate: number;
  handoffRate: number;
  conversionRate: number;
  conversationalRevenue: number;
  topIntents: Array<{ intent: IntentName; count: number }>;
}

export interface SearchRequest {
  query: string;
  maxPrice?: number;
  color?: string;
  category?: string;
}

export interface AddToCartRequest {
  productId: string;
  variantId: string;
  quantity: number;
}

export interface CheckoutPreviewRequest {
  shippingAddress?: string;
  paymentMethod?: string;
}

export interface ChatResponsePayload {
  message: string;
  intent: IntentName;
  referencedProducts?: Product[];
  compareResult?: CompareResult;
  recommendationResult?: RecommendationResult;
  cart?: CartSummary;
  checkoutPreview?: OrderSummary;
  shipment?: ShipmentStatus;
}

export type AgentActionName =
  | "search_products"
  | "compare_products"
  | "add_to_cart"
  | "preview_checkout"
  | "track_order"
  | "cancel_order";

export interface AgentActionPlan {
  action: AgentActionName;
  reasoning: string;
  query?: string;
  maxPrice?: number;
  color?: string;
  category?: string;
  productIds?: string[];
}

export interface InterpretedChatRequest {
  intent: IntentName;
  userMessage: string;
  confidence: number;
  extractedSlots: {
    query?: string;
    maxPrice?: number;
    color?: string;
    category?: string;
  };
  plan: AgentActionPlan;
}

export const mockProducts: Product[] = [
  {
    id: "prod_black_hoodie_1",
    name: "에어플로우 블랙 후드티",
    category: "후드티",
    brand: "Zero Standard",
    basePrice: 59000,
    salePrice: 47000,
    rating: 4.8,
    reviewCount: 248,
    image: "/placeholder/hoodie-1",
    color: "black",
    tags: ["basic", "campus", "daily"],
    highlights: ["오버핏 실루엣", "기모 없는 사계절용", "생활방수 가공 원단"],
    recommendationReasons: ["5만원 이하 예산 조건 충족", "검정색 선호와 잘 맞는 베이직 디자인", "M/L 재고가 모두 남아 있음"],
    variants: [
      { id: "var_black_hoodie_1_m", label: "M", size: "M", color: "black", stock: 8 },
      { id: "var_black_hoodie_1_l", label: "L", size: "L", color: "black", stock: 3 }
    ],
    inventoryStatus: "in_stock",
    shippingEta: "내일 도착"
  },
  {
    id: "prod_black_hoodie_2",
    name: "시티 루프 후드티",
    category: "후드티",
    brand: "Urban Mood",
    basePrice: 65000,
    salePrice: 49000,
    rating: 4.6,
    reviewCount: 162,
    image: "/placeholder/hoodie-2",
    color: "black",
    tags: ["street", "heavyweight", "gift"],
    highlights: ["헤비웨이트 코튼", "넉넉한 후드 쉐입", "커플템 수요 높음"],
    recommendationReasons: ["후드 쉐입 만족도가 높음", "리뷰 기준 원단 만족도 우수", "선물용으로도 무난한 스타일"],
    variants: [
      { id: "var_black_hoodie_2_m", label: "M", size: "M", color: "black", stock: 2 },
      { id: "var_black_hoodie_2_l", label: "L", size: "L", color: "black", stock: 0 }
    ],
    inventoryStatus: "low_stock",
    shippingEta: "모레 도착"
  },
  {
    id: "prod_air_cleaner_1",
    name: "룸핏 미니 공기청정기",
    category: "공기청정기",
    brand: "Airy Home",
    basePrice: 179000,
    salePrice: 139000,
    rating: 4.7,
    reviewCount: 311,
    image: "/placeholder/air-1",
    color: "white",
    tags: ["one-room", "quiet", "small-space"],
    highlights: ["원룸 10평형 대응", "야간 저소음 모드", "필터 교체 쉬움"],
    recommendationReasons: ["원룸용으로 크기가 작고 관리가 쉬움", "소음이 낮아 침실 사용 적합", "할인 적용 시 10만원대 후반 진입"],
    variants: [{ id: "var_air_cleaner_1_default", label: "기본", stock: 12 }],
    inventoryStatus: "in_stock",
    shippingEta: "내일 도착"
  },
  {
    id: "prod_perfume_1",
    name: "데일리 블룸 오 드 퍼퓸",
    category: "향수",
    brand: "Maison de Nuage",
    basePrice: 82000,
    salePrice: 69000,
    rating: 4.9,
    reviewCount: 97,
    image: "/placeholder/perfume-1",
    color: "pink",
    tags: ["gift", "floral", "20s"],
    highlights: ["가벼운 플로럴 시트러스", "선물 포장 옵션", "재구매율 높음"],
    recommendationReasons: ["20대 선물 카테고리에서 만족도가 높음", "무겁지 않은 향 선호에 적합", "패키지 후기가 좋음"],
    variants: [{ id: "var_perfume_1_default", label: "50ml", stock: 5 }],
    inventoryStatus: "in_stock",
    shippingEta: "2일 내 도착"
  }
];

export const mockCart: CartSummary = {
  id: "cart_demo_1",
  itemCount: 1,
  subtotal: 47000,
  discountTotal: 3000,
  shippingFee: 0,
  grandTotal: 44000,
  items: [
    {
      id: "cart_item_1",
      productId: "prod_black_hoodie_1",
      productName: "에어플로우 블랙 후드티",
      variantId: "var_black_hoodie_1_m",
      variantLabel: "M",
      quantity: 1,
      unitPrice: 47000,
      lineTotal: 47000
    }
  ]
};

export const mockConversationState: ConversationState = {
  sessionId: "session_demo_1",
  lastIntent: "product_search",
  referencedProductIds: ["prod_black_hoodie_1", "prod_black_hoodie_2"],
  compareProductIds: ["prod_black_hoodie_1", "prod_black_hoodie_2"],
  latestCartId: "cart_demo_1",
  preferredBudgetLabel: "5만원 이하"
};

export const mockAnalytics: AnalyticsSummary = {
  sessions: 1284,
  avgMessagesPerSession: 9.7,
  actionSuccessRate: 94.2,
  fallbackRate: 4.1,
  handoffRate: 1.8,
  conversionRate: 17.3,
  conversationalRevenue: 18640000,
  topIntents: [
    { intent: "product_search", count: 552 },
    { intent: "recommendation_request", count: 311 },
    { intent: "add_to_cart", count: 186 },
    { intent: "track_order", count: 124 },
    { intent: "cancel_order", count: 41 }
  ]
};

export const mockShipment: ShipmentStatus = {
  orderId: "order_demo_1001",
  currentStatus: "배송 중",
  lastUpdatedAt: "2026-04-04T10:30:00+09:00",
  trackingNumber: "ZX202604040001",
  timeline: [
    { status: "주문 완료", description: "주문이 정상 접수되었습니다.", at: "2026-04-03T17:10:00+09:00" },
    { status: "출고 완료", description: "물류센터에서 택배사로 인계되었습니다.", at: "2026-04-03T22:40:00+09:00" },
    { status: "배송 중", description: "메인 허브 이동 중입니다.", at: "2026-04-04T10:30:00+09:00" }
  ]
};
