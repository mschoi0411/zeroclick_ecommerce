import type { Product } from "@zeroclick/domain";

interface ProductCardProps {
  product: Product;
  index?: number;
  compact?: boolean;
}

export function ProductCard({ product, index, compact = false }: ProductCardProps) {
  return (
    <article className={`rounded-3xl border border-slate-200 bg-slate-50 ${compact ? "p-3" : "p-4"}`}>
      <div className={`relative overflow-hidden rounded-2xl bg-slate-200 ${compact ? "mb-3 h-36" : "mb-4 h-56"}`}>
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.src = "/demo-products/fallback.svg";
          }}
        />
      </div>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          {typeof index === "number" ? (
            <span className="mb-2 inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
              추천 {index + 1}
            </span>
          ) : null}
          <h3 className={`${compact ? "text-sm" : "text-base"} font-semibold text-slate-950`}>{product.name}</h3>
          <p className="text-sm text-slate-500">{product.brand} · {product.category}</p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
          <p className="text-xs text-slate-500">평점 {product.rating.toFixed(1)}</p>
          <p className="text-xs text-slate-500">리뷰 {product.reviewCount}개</p>
        </div>
      </div>
      <div className={`rounded-2xl bg-gradient-to-br from-slate-200 via-slate-100 to-white ${compact ? "p-3 text-xs" : "p-4 text-sm"} text-slate-600`}>
        {product.color} · {product.shippingEta}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500 line-through">₩{product.basePrice.toLocaleString()}</p>
          <p className={`${compact ? "text-lg" : "text-xl"} font-semibold text-slate-950`}>₩{product.salePrice.toLocaleString()}</p>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
          {product.inventoryStatus === "out_of_stock" ? "품절" : product.inventoryStatus === "low_stock" ? "재고 적음" : "구매 가능"}
        </span>
      </div>
      <ul className={`mt-4 space-y-2 ${compact ? "text-xs" : "text-sm"} text-slate-700`}>
        {(compact ? product.highlights.slice(0, 2) : product.highlights).map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
      <div className={`mt-4 rounded-2xl bg-white ${compact ? "p-2.5 text-xs" : "p-3 text-sm"} text-slate-600`}>
        <p className="font-medium text-slate-900">추천 이유</p>
        <ul className="mt-2 space-y-1">
          {(compact ? product.recommendationReasons.slice(0, 2) : product.recommendationReasons).map((reason) => (
            <li key={reason}>- {reason}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}
