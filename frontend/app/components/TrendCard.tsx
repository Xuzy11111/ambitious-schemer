import type { TrendItem } from "../data/mockData";

export function TrendCard({ trend }: { trend: TrendItem }) {
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between gap-3">
        <strong className="text-sm font-semibold text-white">
          {trend.name}
        </strong>
        <span className="text-sm font-bold text-emerald-200">{trend.change}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {trend.description}
      </p>
    </article>
  );
}

