import type { InterviewItem } from "../data/mockData";

export function Timeline({ items }: { items: InterviewItem[] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/40 p-5">
      <header className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-white">深度访谈</h3>
        <span className="text-xs text-slate-400">持续更新</span>
      </header>

      <div className="grid gap-4">
        {items.map((it) => (
          <article key={it.title} className="grid grid-cols-[16px_1fr] gap-3">
            <div className="mt-2 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-violet-500 to-emerald-300 shadow-[0_0_0_6px_rgba(124,92,255,0.12)]" />
            <div>
              <div className="mb-2 flex items-center justify-between gap-4">
                <strong className="text-sm font-semibold text-white">
                  {it.title}
                </strong>
                <span className="text-xs text-slate-400">{it.time}</span>
              </div>
              <p className="text-sm leading-relaxed text-slate-400">{it.note}</p>
              <p className="mt-2 text-xs font-medium text-emerald-200/90">
                {it.status}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

