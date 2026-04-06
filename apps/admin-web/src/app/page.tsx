import Link from "next/link";
import type { ReactNode } from "react";
import { mockAnalytics, mockProducts } from "@zeroclick/domain";

const kpiData = [
  { label: "총 대화 수", value: mockAnalytics.sessions.toLocaleString(), change: "+14%" },
  { label: "전환율", value: `${mockAnalytics.conversionRate}%`, change: "+2.1%" },
  { label: "액션 성공률", value: `${mockAnalytics.actionSuccessRate}%`, change: "+0.8%" },
  { label: "대화 기반 매출", value: `₩${mockAnalytics.conversationalRevenue.toLocaleString()}`, change: "+18%" },
];

const actionQueue = [
  { label: "고위험 주문 승인 대기", count: 3, urgency: "high" },
  { label: "취소/환불 요청 검토", count: 5, urgency: "high" },
  { label: "반복 실패 세션", count: 2, urgency: "medium" },
  { label: "상담원 이관 대기", count: 4, urgency: "medium" },
];

export default function AdminHome() {
  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Zero Click <span className="text-amber-300">Dashboard</span>
            </h1>
            <p className="mt-1 text-sm text-slate-400">대화형 커머스 운영 현황</p>
          </div>
          <Link href="/" className="text-sm text-amber-300 hover:underline">
            사용자 화면으로 →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiData.map((kpi) => (
            <div key={kpi.label} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-slate-400">{kpi.label}</span>
                <span className="text-xs font-medium text-emerald-300">{kpi.change}</span>
              </div>
              <div className="text-2xl font-bold text-white">{kpi.value}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <GlassCard title="상위 Intent">
            <div className="space-y-3">
              {mockAnalytics.topIntents.map((item, index) => (
                <div key={item.intent} className="flex items-center gap-3">
                  <span className="w-5 text-xs text-slate-500">{index + 1}</span>
                  <div className="flex-1">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-white">{item.intent}</span>
                      <span className="text-slate-400">{item.count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.min(100, (item.count / mockAnalytics.topIntents[0].count) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-center">
              <div>
                <div className="text-lg font-bold text-amber-300">{mockAnalytics.fallbackRate}%</div>
                <div className="text-xs text-slate-500">Fallback 비율</div>
              </div>
              <div>
                <div className="text-lg font-bold text-sky-300">{mockAnalytics.handoffRate}%</div>
                <div className="text-xs text-slate-500">상담 이관률</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard title="운영 액션 큐">
            <div className="space-y-2">
              {actionQueue.map((action) => (
                <div key={action.label} className="flex cursor-pointer items-center gap-3 rounded-lg bg-white/5 p-3 transition hover:bg-white/10">
                  <div className={`h-2 w-2 rounded-full ${action.urgency === "high" ? "bg-rose-400" : "bg-amber-300"}`} />
                  <div className="flex-1 text-sm text-white">{action.label}</div>
                  <span className="text-sm font-medium text-slate-400">{action.count}</span>
                  <span className="text-slate-500">→</span>
                </div>
              ))}
            </div>
          </GlassCard>

          <GlassCard title="추천 상품 현황">
            <div className="space-y-3">
              {mockProducts.slice(0, 3).map((product) => (
                <div key={product.id} className="rounded-lg bg-white/5 p-3">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-white">{product.name}</span>
                    <span className="text-xs text-amber-300">{product.rating.toFixed(1)}</span>
                  </div>
                  <div className="text-xs text-slate-400">리뷰 {product.reviewCount.toLocaleString()}개 · {product.shippingEta}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

function GlassCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <h3 className="mb-4 text-lg font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}
