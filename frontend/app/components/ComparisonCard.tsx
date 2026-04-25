import type { ComparisonItem } from "../data/mockData";

export function ComparisonCard({ items }: { items: ComparisonItem[] }) {
  return (
    <section className="rounded-[32px] border border-red-950 bg-[#050505] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.55)]">
      <header className="mb-5 flex items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-red-300/70">
            路径分析
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-white">
            发展方向比较
          </h2>
        </div>
        <p className="max-w-xs text-sm leading-relaxed text-zinc-400">
          当用户在对话中询问方向选择时，系统在当前页内基于成长档案和搜索记忆进行比较。
        </p>
      </header>

      <div className="grid grid-cols-3 gap-4 max-[1180px]:grid-cols-1">
        {items.map((it) => (
          <article
            key={it.title}
            className="rounded-3xl border border-red-950 bg-[#090909] p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-white">{it.title}</h3>
                <span className="mt-1 block text-xs text-zinc-500">
                  {it.fit}
                </span>
              </div>
              <strong className="text-3xl font-semibold text-red-200">
                {it.score}
              </strong>
            </div>

            <div className="grid gap-4">
              <div>
                <h4 className="text-sm font-semibold text-white">为什么适合</h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-400">
                  {it.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">需要注意</h4>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-400">
                  {it.risks.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

