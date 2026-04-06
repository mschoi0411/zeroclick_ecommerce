import type { PropsWithChildren, ReactNode } from "react";

type CommerceShellProps = PropsWithChildren<{
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
}>;

export function CommerceShell({ left, center, right }: CommerceShellProps) {
  return (
    <div className="grid min-h-screen grid-cols-1 gap-6 bg-slate-100 p-6 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
      <aside className="space-y-6">{left}</aside>
      <main className="space-y-6">{center}</main>
      <aside className="space-y-6">{right}</aside>
    </div>
  );
}
