"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import {
  type CartSummary,
  type ChatResponsePayload,
  type CompareResult,
  type OrderSummary,
  type Product,
  mockCart,
  mockConversationState,
  mockProducts,
  mockShipment,
} from "@zeroclick/domain";

const starterPrompts = [
  "검정 후드티 5만원 이하로 추천해줘",
  "원룸에 둘 공기청정기 추천해줘",
  "대학생 남자친구 생일선물 5만원대 추천해줘",
  "아까 보여준 두 개 비교해줘",
  "기본 배송지로 주문해줘",
];

type JourneyPhase =
  | "chat_only"
  | "questioning"
  | "recommendations"
  | "selection"
  | "compare_review"
  | "checkout";

const phaseOrder: JourneyPhase[] = [
  "chat_only",
  "questioning",
  "recommendations",
  "selection",
  "compare_review",
  "checkout",
];

const phaseLabels: Record<JourneyPhase, string> = {
  chat_only: "대화",
  questioning: "질문",
  recommendations: "추천",
  selection: "선택",
  compare_review: "비교",
  checkout: "결제",
};

export function StorefrontExperience() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content:
        "안녕하세요. 원하시는 상품을 자연어로 말해주시면 조건을 이해한 뒤 추천, 비교, 리뷰, 주문 준비까지 이어서 도와드릴게요.",
    },
  ]);
  const [input, setInput] = useState("");
  const [products, setProducts] = useState<Product[]>(mockProducts.slice(0, 3));
  const [cart, setCart] = useState<CartSummary>(mockCart);
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [checkoutPreview, setCheckoutPreview] = useState<OrderSummary | null>(null);
  const [shipmentText, setShipmentText] = useState<string>(`${mockShipment.currentStatus} · ${mockShipment.timeline.at(-1)?.description ?? "최신 상태"}`);
  const [isLoading, setIsLoading] = useState(false);
  const [journeyPhase, setJourneyPhase] = useState<JourneyPhase>("chat_only");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const recommendationReasons = useMemo(
    () => [
      `최근 intent: ${mockConversationState.lastIntent ?? "없음"}`,
      `최근 참조 상품: ${mockConversationState.referencedProductIds.length}개`,
      `예산 메모리: ${mockConversationState.preferredBudgetLabel ?? "미설정"}`,
    ],
    [],
  );

  const parsedConditions = useMemo(() => {
    const focus = selectedProduct ?? products[0];
    return {
      budget: mockConversationState.preferredBudgetLabel ?? "예산 미설정",
      category: focus?.category ?? "상품군 미설정",
      color: focus?.color ?? "색상 미설정",
      usage: focus ? focus.highlights[0] : "용도 미설정",
    };
  }, [products, selectedProduct]);

  const reviewDigest = useMemo<{ pros: string[]; cons: string[]; mentions: string[] }>(() => {
    const focus = selectedProduct ?? products[0];

    if (!focus) {
      return { pros: [], cons: [], mentions: [] };
    }

    return {
      pros: focus.highlights.slice(0, 3),
      cons: [
        focus.variants.length > 1 ? "사이즈 선택은 한 번 더 확인하는 편이 좋습니다." : "개인 취향 차이에 따라 호불호가 있을 수 있습니다.",
        focus.inventoryStatus === "low_stock" ? "재고가 적어 빠른 결정이 필요합니다." : "프로모션 가격은 변동될 수 있습니다.",
      ],
      mentions: focus.recommendationReasons,
    };
  }, [products, selectedProduct]);

  const currentStageIndex = phaseOrder.indexOf(journeyPhase);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const content = text.trim();
    setMessages((current) => [...current, { role: "user", content }]);
    setInput("");
    setIsLoading(true);
    setJourneyPhase((current) => (current === "chat_only" ? "questioning" : current));

    try {
      const response = await fetch("http://localhost:4000/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error("API request failed");
      }

      const payload = (await response.json()) as ChatResponsePayload;
      applyPayload(payload);
    } catch {
      applyMockFallback(content);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "API가 연결되지 않아도 현재 화면 흐름은 mock 데이터로 계속 확인할 수 있어요.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function applyPayload(payload: ChatResponsePayload) {
    setMessages((current) => [...current, { role: "assistant", content: payload.message }]);

    if (payload.recommendationResult?.items) {
      setProducts(payload.recommendationResult.items);
      setJourneyPhase("recommendations");
      setSelectedProduct(null);
      setCompareResult(null);
    }

    if (payload.referencedProducts) {
      setProducts(payload.referencedProducts);
      setJourneyPhase("recommendations");
    }

    if (payload.compareResult) {
      setCompareResult(payload.compareResult);
      setJourneyPhase("compare_review");
    }

    if (payload.cart) {
      setCart(payload.cart);
    }

    if (payload.checkoutPreview) {
      setCheckoutPreview(payload.checkoutPreview);
      setJourneyPhase("checkout");
    }

    if (payload.shipment) {
      setShipmentText(`${payload.shipment.currentStatus} · ${payload.shipment.timeline.at(-1)?.description ?? payload.shipment.lastUpdatedAt}`);
    }
  }

  function applyMockFallback(content: string) {
    const normalized = content.toLowerCase();

    if (normalized.includes("주문")) {
      prepareCheckout();
      return;
    }

    if (normalized.includes("비교")) {
      const targets = products.slice(0, 2);
      setCompareResult({
        products: targets,
        summary: ["1번은 가성비가 좋고, 2번은 리뷰 만족도가 더 높아요.", "배송 속도와 재고 상태까지 함께 고려한 비교입니다."],
        differences: [
          { label: "가격", values: targets.map((product) => `₩${product.salePrice.toLocaleString()}`) },
          { label: "평점", values: targets.map((product) => product.rating.toFixed(1)) },
          { label: "배송", values: targets.map((product) => product.shippingEta) },
        ],
      });
      setJourneyPhase("compare_review");
      return;
    }

    setProducts(mockProducts.slice(0, 3));
    setSelectedProduct(null);
    setCompareResult(null);
    setJourneyPhase("recommendations");
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: "질문 내용을 바탕으로 가장 적합한 후보 3개를 먼저 골랐어요. 이 중에서 가장 마음에 드는 상품을 선택해 주세요.",
      },
    ]);
  }

  function chooseProduct(product: Product) {
    setSelectedProduct(product);
    setJourneyPhase("selection");
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: `${product.name}을 메인 후보로 잡았어요. 이제 비교군과 리뷰를 보여드릴게요.`,
      },
    ]);
  }

  function revealCompareAndReviews() {
    if (!selectedProduct) return;

    const targets = [selectedProduct, ...products.filter((product) => product.id !== selectedProduct.id).slice(0, 2)];
    setCompareResult({
      products: targets,
      summary: [
        `${selectedProduct.name}은 현재 조건과 가장 잘 맞는 메인 후보입니다.`,
        "비교군은 가격, 평점, 배송 속도를 기준으로 추렸습니다.",
      ],
      differences: [
        { label: "가격", values: targets.map((product) => `₩${product.salePrice.toLocaleString()}`) },
        { label: "평점", values: targets.map((product) => product.rating.toFixed(1)) },
        { label: "배송", values: targets.map((product) => product.shippingEta) },
        { label: "핵심 특징", values: targets.map((product) => product.highlights[0] ?? "-") },
      ],
    });
    setJourneyPhase("compare_review");
  }

  function prepareCheckout() {
    const focus = selectedProduct ?? products[0];
    if (!focus) return;

    const updatedCart = {
      ...cart,
      items: [
        {
          id: "checkout_item_selected",
          productId: focus.id,
          productName: focus.name,
          variantId: focus.variants[0]?.id ?? focus.id,
          variantLabel: focus.variants[0]?.label ?? "기본",
          quantity: 1,
          unitPrice: focus.salePrice,
          lineTotal: focus.salePrice,
        },
      ],
      itemCount: 1,
      subtotal: focus.salePrice,
      discountTotal: focus.salePrice >= 45000 ? 3000 : 0,
      shippingFee: focus.salePrice >= 30000 ? 0 : 3000,
      grandTotal: focus.salePrice - (focus.salePrice >= 45000 ? 3000 : 0) + (focus.salePrice >= 30000 ? 0 : 3000),
    } satisfies CartSummary;

    setCart(updatedCart);
    setCheckoutPreview({
      orderId: "order_auto_checkout",
      status: "pending_confirmation",
      items: updatedCart.items,
      shippingAddress: "서울시 성수동 기본 배송지",
      paymentMethod: "기본 카드 ·•••• 1024",
      totals: {
        subtotal: updatedCart.subtotal,
        discountTotal: updatedCart.discountTotal,
        shippingFee: updatedCart.shippingFee,
        grandTotal: updatedCart.grandTotal,
      },
      eta: focus.shippingEta,
    });
    setJourneyPhase("checkout");
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        content: `${focus.name} 기준으로 결제 직전 상태까지 준비했어요. 마지막 금액과 배송 정보를 확인해 주세요.`,
      },
    ]);
  }

  function resetJourney() {
    setJourneyPhase("chat_only");
    setMessages([
      {
        role: "assistant",
        content:
          "안녕하세요. 원하시는 상품을 자연어로 말해주시면 조건을 이해한 뒤 추천, 비교, 리뷰, 주문 준비까지 이어서 도와드릴게요.",
      },
    ]);
    setInput("");
    setProducts(mockProducts.slice(0, 3));
    setSelectedProduct(null);
    setCompareResult(null);
    setCheckoutPreview(null);
    setCart(mockCart);
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/20 text-sm font-bold text-amber-300">Z</span>
            <span className="text-lg font-semibold text-white">Zero Click</span>
          </div>
          {journeyPhase !== "chat_only" ? <JourneyIndicator currentStageIndex={currentStageIndex} /> : <a href="/admin" className="text-sm text-slate-400 hover:text-white">관리자 화면</a>}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {journeyPhase === "chat_only" && (
          <div className="flex min-h-[calc(100vh-73px)] flex-col items-center justify-center px-6">
            <div className="mb-10 text-center">
              <h1 className="text-4xl font-bold text-white sm:text-5xl">
                질문하면, <span className="text-amber-300">딱 맞는 상품</span>
              </h1>
              <p className="mt-3 text-lg text-slate-400">검색하지 마세요. 대화하세요.</p>
            </div>

            <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="예: 검은색 티셔츠를 찾고 싶어. 출근용으로 무난하고 5만원 이하였으면 좋겠어."
                className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button onClick={() => sendMessage(input)} className="mt-3 w-full rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950">
                추천 시작하기
              </button>
            </div>

            <div className="mt-6 flex max-w-4xl flex-wrap justify-center gap-2">
              {starterPrompts.map((prompt) => (
                <button key={prompt} onClick={() => sendMessage(prompt)} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 hover:bg-white/10">
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {journeyPhase === "questioning" || journeyPhase === "recommendations" ? (
          <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
            <ChatPanel messages={messages} isLoading={isLoading} />
            <ConditionSummary conditions={parsedConditions} reasons={recommendationReasons} />
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-white">추천 상품</h2>
              <div className="grid gap-4">
                {products.map((product, index) => (
                  <RecommendationCard key={product.id} product={product} onSelect={chooseProduct} index={index} />
                ))}
              </div>
              <p className="text-center text-sm text-slate-400">마음에 드는 상품을 선택하면 비교와 리뷰를 보여드릴게요.</p>
            </div>
            <PromptComposer input={input} setInput={setInput} onSubmit={sendMessage} placeholder="추가 조건이 있으신가요?" />
          </div>
        ) : null}

        {journeyPhase === "selection" && selectedProduct ? (
          <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <div className="grid gap-5 md:grid-cols-[200px_1fr] md:items-center">
                <ProductImageFrame product={selectedProduct} heightClass="h-52" />
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="mb-1 text-xs text-amber-300">선택한 상품</p>
                      <h2 className="text-2xl font-bold text-white">{selectedProduct.name}</h2>
                    </div>
                    <span className="text-2xl font-bold text-amber-300">₩{selectedProduct.salePrice.toLocaleString()}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedProduct.highlights.map((highlight) => (
                      <span key={highlight} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <RecommendationCard product={selectedProduct} onSelect={chooseProduct} index={0} selected />
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
                <h3 className="text-lg font-semibold text-white">다음 단계</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">이 상품을 기준으로 비교군, 리뷰 요약, 주문 준비까지 이어서 확인할 수 있습니다.</p>
                <div className="mt-6 grid gap-3">
                  <button onClick={revealCompareAndReviews} className="rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950">비교와 리뷰 보기</button>
                  <button onClick={prepareCheckout} className="rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm font-semibold text-white">이 상품으로 결제 준비</button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {journeyPhase === "compare_review" && selectedProduct ? (
          <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <div className="grid gap-5 md:grid-cols-[200px_1fr] md:items-center">
                <ProductImageFrame product={selectedProduct} heightClass="h-52" />
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="mb-1 text-xs text-amber-300">선택한 상품</p>
                      <h2 className="text-2xl font-bold text-white">{selectedProduct.name}</h2>
                    </div>
                    <span className="text-2xl font-bold text-amber-300">₩{selectedProduct.salePrice.toLocaleString()}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">선택한 상품을 기준으로 비교군과 리뷰 요약을 정리했습니다.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ComparisonTable compareResult={compareResult} fallbackProducts={[selectedProduct, ...products.filter((product) => product.id !== selectedProduct.id)]} />
              <ReviewSummary reviewDigest={reviewDigest} aiComment="현재 조건 기준으로는 이 상품이 가장 균형이 좋습니다. 리뷰 안정성과 가격, 배송 속도까지 감안하면 가장 무난한 선택입니다." />
            </div>

            <div className="flex justify-center gap-3 pt-4">
              <button onClick={() => setJourneyPhase("recommendations")} className="rounded-2xl border border-white/10 px-6 py-3 text-white hover:bg-white/5">다른 상품 보기</button>
              <button onClick={prepareCheckout} className="rounded-2xl bg-amber-300 px-6 py-3 font-semibold text-slate-950">이 상품으로 결제하기</button>
            </div>
          </div>
        ) : null}

        {journeyPhase === "checkout" && checkoutPreview ? (
          <div className="mx-auto max-w-3xl px-6 py-8">
            <CheckoutSummary checkoutPreview={checkoutPreview} cart={cart} shipmentText={shipmentText} onBack={() => setJourneyPhase(selectedProduct ? "compare_review" : "recommendations")} onConfirm={resetJourney} />
          </div>
        ) : null}
      </main>
    </div>
  );
}

function JourneyIndicator({ currentStageIndex }: { currentStageIndex: number }) {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {phaseOrder.map((stage, index) => {
        const isCompleted = index < currentStageIndex;
        const isActive = index === currentStageIndex;

        return (
          <div key={stage} className="flex items-center gap-1">
            <div className={`rounded-full px-2.5 py-1 text-xs font-medium ${isActive ? "border border-amber-300/30 bg-amber-300/15 text-amber-300" : isCompleted ? "text-emerald-400" : "text-slate-500"}`}>
              {phaseLabels[stage]}
            </div>
            {index < phaseOrder.length - 1 ? <div className={`h-px w-4 ${index < currentStageIndex ? "bg-emerald-400" : "bg-white/10"}`} /> : null}
          </div>
        );
      })}
    </div>
  );
}

function PromptComposer({
  input,
  setInput,
  onSubmit,
  placeholder,
}: {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <textarea
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder={placeholder}
        className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
      />
      <button onClick={() => onSubmit(input)} className="mt-3 w-full rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950">
        계속 대화하기
      </button>
    </div>
  );
}

function ChatPanel({ messages, isLoading }: { messages: Array<{ role: "user" | "assistant"; content: string }>; isLoading: boolean }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <div className="space-y-3">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "assistant" ? "bg-slate-800/70 text-slate-200" : "bg-white text-slate-900"}`}>
            {message.content}
          </div>
        ))}
        {isLoading ? <p className="text-sm text-slate-400">응답을 생성하는 중입니다...</p> : null}
      </div>
    </div>
  );
}

function ConditionSummary({
  conditions,
  reasons,
}: {
  conditions: { budget: string; category: string; color: string; usage: string };
  reasons: string[];
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <div className="grid gap-3 md:grid-cols-4">
        <ConditionChip label="예산" value={conditions.budget} />
        <ConditionChip label="카테고리" value={conditions.category} />
        <ConditionChip label="색상" value={conditions.color} />
        <ConditionChip label="용도" value={conditions.usage} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {reasons.map((reason) => (
          <span key={reason} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
            {reason}
          </span>
        ))}
      </div>
    </div>
  );
}

function ConditionChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-900/70 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}

function RecommendationCard({
  product,
  onSelect,
  index,
  selected = false,
}: {
  product: Product;
  onSelect: (product: Product) => void;
  index: number;
  selected?: boolean;
}) {
  const discount = Math.round((1 - product.salePrice / product.basePrice) * 100);

  return (
    <div onClick={() => onSelect(product)} className={`cursor-pointer rounded-3xl border p-5 transition ${selected ? "border-amber-300/50 bg-amber-300/10" : "border-white/10 bg-white/5 hover:border-amber-300/30"}`}>
      <ProductImageFrame product={product} heightClass="h-64" className="mb-4" />
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <span className="mb-2 inline-flex rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">추천 {index + 1}</span>
          <h3 className="text-lg font-semibold text-white">{product.name}</h3>
        </div>
        {discount > 0 ? <span className="rounded-md bg-amber-300/15 px-2 py-1 text-xs font-semibold text-amber-300">-{discount}%</span> : null}
      </div>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-xl font-bold text-white">₩{product.salePrice.toLocaleString()}</span>
        <span className="text-sm text-slate-500 line-through">₩{product.basePrice.toLocaleString()}</span>
      </div>
      <div className="mb-4 flex items-center gap-3 text-sm text-slate-400">
        <span>★ {product.rating.toFixed(1)} ({product.reviewCount.toLocaleString()})</span>
        <span>{product.shippingEta}</span>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {product.highlights.map((feature) => (
          <span key={feature} className="rounded-md bg-white/5 px-2.5 py-1 text-xs text-slate-300">{feature}</span>
        ))}
      </div>
      <div className="border-t border-white/10 pt-3">
        <p className="text-sm italic text-amber-200">“{product.recommendationReasons[0]}”</p>
      </div>
    </div>
  );
}

function ComparisonTable({ compareResult, fallbackProducts }: { compareResult: CompareResult | null; fallbackProducts: Product[] }) {
  const products = compareResult?.products ?? fallbackProducts.slice(0, 2);
  const rows =
    compareResult?.differences ?? [
      { label: "가격", values: products.map((product) => `₩${product.salePrice.toLocaleString()}`) },
      { label: "평점", values: products.map((product) => product.rating.toFixed(1)) },
      { label: "배송", values: products.map((product) => product.shippingEta) },
    ];

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
      <h3 className="mb-4 text-lg font-semibold text-white">비교 정보</h3>
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <div key={`${product.id}-image`} className="rounded-2xl border border-white/10 bg-slate-950/30 p-3">
            <ProductImageFrame product={product} heightClass="h-40" />
            <p className="mt-3 text-sm font-medium text-white">{product.name}</p>
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5 text-left text-slate-400">
            <tr>
              <th className="px-4 py-3">항목</th>
              {products.map((product) => (
                <th key={product.id} className="px-4 py-3">{product.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-white/10">
                <td className="px-4 py-3 font-medium text-white">{row.label}</td>
                {row.values.map((value) => (
                  <td key={`${row.label}-${value}`} className="px-4 py-3 text-slate-300">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {compareResult?.summary ? (
        <ul className="mt-4 space-y-2 text-sm text-slate-300">
          {compareResult.summary.map((summary) => (
            <li key={summary}>• {summary}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ReviewSummary({
  reviewDigest,
  aiComment,
}: {
  reviewDigest: { pros: string[]; cons: string[]; mentions: string[] };
  aiComment: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
      <h3 className="mb-4 text-lg font-semibold text-white">리뷰 요약</h3>
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-emerald-300">장점</p>
          <ul className="space-y-1 text-sm text-slate-300">
            {reviewDigest.pros.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-rose-300">단점</p>
          <ul className="space-y-1 text-sm text-slate-300">
            {reviewDigest.cons.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-sky-300">자주 언급</p>
          <div className="flex flex-wrap gap-1.5">
            {reviewDigest.mentions.map((item) => (
              <span key={item} className="rounded-lg bg-sky-300/10 px-2.5 py-1 text-xs text-sky-200">{item}</span>
            ))}
          </div>
        </div>
        <div className="border-t border-white/10 pt-4">
          <p className="mb-2 text-sm font-medium text-amber-300">AI 추천 코멘트</p>
          <p className="text-sm italic text-slate-300">{aiComment}</p>
        </div>
      </div>
    </div>
  );
}

function CheckoutSummary({
  checkoutPreview,
  cart,
  shipmentText,
  onBack,
  onConfirm,
}: {
  checkoutPreview: OrderSummary;
  cart: CartSummary;
  shipmentText: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-lg font-semibold text-white">주문 요약</h3>
        <div className="mb-5 grid gap-5 md:grid-cols-[180px_1fr] md:items-start">
          <ProductImageFrame
            product={{
              name: checkoutPreview.items[0]?.productName ?? "상품 이미지",
              image: selectedCheckoutImage(checkoutPreview.items[0]?.productName),
            }}
            heightClass="h-44"
          />
          <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-400">상품명</span><span className="font-medium text-white">{checkoutPreview.items[0]?.productName}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">옵션</span><span className="text-white">{checkoutPreview.items[0]?.variantLabel}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">수량</span><span className="text-white">{checkoutPreview.items[0]?.quantity}개</span></div>
          <div className="flex justify-between"><span className="text-slate-400">상품 금액</span><span className="text-white">₩{cart.subtotal.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">할인</span><span className="text-amber-300">-₩{cart.discountTotal.toLocaleString()}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">배송비</span><span className="text-emerald-300">₩{cart.shippingFee.toLocaleString()}</span></div>
          <div className="flex items-baseline justify-between border-t border-white/10 pt-3"><span className="font-medium text-white">최종 결제 금액</span><span className="text-2xl font-bold text-amber-300">₩{cart.grandTotal.toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
        <div className="flex justify-between"><span className="text-slate-400">배송지</span><span>{checkoutPreview.shippingAddress}</span></div>
        <div className="mt-3 flex justify-between"><span className="text-slate-400">결제수단</span><span>{checkoutPreview.paymentMethod}</span></div>
        <div className="mt-3 flex justify-between"><span className="text-slate-400">예상 도착일</span><span>{checkoutPreview.eta}</span></div>
        <div className="mt-3 flex justify-between"><span className="text-slate-400">최근 배송 상태</span><span>{shipmentText}</span></div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-white hover:bg-white/5">돌아가기</button>
        <button onClick={onConfirm} className="flex-1 rounded-2xl bg-amber-300 px-4 py-3 font-semibold text-slate-950">결제하기</button>
      </div>
    </div>
  );
}

function ProductImageFrame({
  product,
  heightClass,
  className,
}: {
  product: Pick<Product, "image" | "name">;
  heightClass: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 ${heightClass} ${className ?? ""}`}>
      <Image
        src={product.image || "/demo-products/fallback.svg"}
        alt={product.name}
        fill
        unoptimized
        sizes="(max-width: 768px) 100vw, 33vw"
        className="object-cover"
        onError={(event) => {
          const target = event.currentTarget as HTMLImageElement;
          target.src = "/demo-products/fallback.svg";
        }}
      />
    </div>
  );
}

function selectedCheckoutImage(productName?: string) {
  switch (productName) {
    case "에어플로우 블랙 후드티":
      return "/demo-products/airflow-black-hoodie.png";
    case "시티 루프 후드티":
      return "/demo-products/city-loop-hoodie.png";
    case "룸핏 미니 공기청정기":
      return "/demo-products/roomfit-mini-air-purifier.png";
    case "에어큐브 컴팩트":
      return "/demo-products/aircube-compact.png";
    case "데일리 블룸 오 드 퍼퓸":
      return "/demo-products/daily-bloom-perfume.png";
    case "시트러스 베일 오 드 퍼퓸":
      return "/demo-products/citrus-veil-perfume.png";
    default:
      return "/demo-products/fallback.svg";
  }
}
