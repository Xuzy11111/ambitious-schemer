import type { ReactNode } from "react";

export function ChatPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.25)]">
      <header className="mb-4 flex items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-widest text-slate-400">
            策略中枢
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            {title}
          </h2>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-slate-400">
          {subtitle}
        </p>
      </header>
      <div className="grid gap-5">{children}</div>
    </section>
  );
}

