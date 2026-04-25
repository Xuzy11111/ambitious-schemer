import type { RoadmapStep } from "../data/mockData";

export function ProgressStep({ step }: { step: RoadmapStep }) {
  const border =
    step.status === "done"
      ? "border-emerald-300/25"
      : step.status === "current"
        ? "border-violet-400/50"
        : "border-white/10";

  const bg =
    step.status === "current"
      ? "bg-gradient-to-br from-violet-500/15 to-white/[0.04]"
      : "bg-slate-950/40";

  return (
    <article className={`grid grid-cols-[52px_1fr] gap-4 rounded-3xl border p-5 ${border} ${bg}`}>
      <div className="grid h-13 w-13 place-items-center rounded-2xl bg-white/[0.06] text-sm font-semibold text-white">
        {step.step}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-white">{step.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {step.detail}
        </p>
      </div>
    </article>
  );
}

