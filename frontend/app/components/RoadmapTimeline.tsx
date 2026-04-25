import type { RoadmapStep } from "../data/mockData";
import { ProgressStep } from "./ProgressStep";

export function RoadmapTimeline({ steps }: { steps: RoadmapStep[] }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_22px_70px_rgba(0,0,0,0.25)]">
      <header className="mb-4">
        <p className="text-xs uppercase tracking-widest text-slate-400">
          行动路线
        </p>
        <h2 className="text-lg font-semibold tracking-tight text-white">
          Roadmap Timeline
        </h2>
      </header>
      <div className="grid gap-3">
        {steps.map((s) => (
          <ProgressStep key={s.step} step={s} />
        ))}
      </div>
    </section>
  );
}

