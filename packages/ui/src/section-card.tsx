import type { PropsWithChildren, ReactNode } from "react";

type SectionCardProps = PropsWithChildren<{
  title: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}>;

export function SectionCard({ title, eyebrow, action, className, children }: SectionCardProps) {
  return (
    <section className={`rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm ${className ?? ""}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{eyebrow}</p> : null}
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
