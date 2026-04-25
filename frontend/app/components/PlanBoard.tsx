"use client";

import { useMemo, useState } from "react";
import type { PlanTask } from "../data/mockData";

function PlanChecklist({
  title,
  tasks,
}: {
  title: string;
  tasks: PlanTask[];
}) {
  const [doneOverrides, setDoneOverrides] = useState<Record<string, boolean>>({});
  const renderedTasks = tasks.map((task) => ({
    ...task,
    done: doneOverrides[task.id] ?? task.done,
  }));

  return (
    <section className="rounded-3xl border border-red-950 bg-[#080808] p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-white">{title}</h3>
        <span className="text-xs text-zinc-500">
          已完成 {renderedTasks.filter((task) => task.done).length}/{renderedTasks.length}
        </span>
      </div>

      <div className="grid gap-3">
        {renderedTasks.map((task) => (
          <label
            key={task.id}
            className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-900 bg-[#050505] px-4 py-4"
          >
            <input
              type="checkbox"
              checked={task.done}
              onChange={() =>
                setDoneOverrides((prev) => ({
                  ...prev,
                  [task.id]: !task.done,
                }))
              }
              className="mt-1 h-4 w-4 accent-red-500"
            />
            <span className="block">
              <strong className="block text-sm text-white">{task.title}</strong>
              <span className="mt-1 block text-sm leading-relaxed text-zinc-400">
                {task.detail}
              </span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

export function PlanBoard({
  summary,
  systemRule,
  shortTerm,
  longTerm,
  recentAchievements,
  editableNote,
}: {
  summary: string;
  systemRule: string;
  shortTerm: PlanTask[];
  longTerm: PlanTask[];
  recentAchievements: string[];
  editableNote: string;
}) {
  const [note, setNote] = useState(editableNote);
  const [hasEditedNote, setHasEditedNote] = useState(false);
  const displayedNote = hasEditedNote ? note : editableNote;

  const achievementCount = useMemo(
    () => recentAchievements.length,
    [recentAchievements],
  );

  return (
    <section className="grid gap-6">
      <section className="rounded-[32px] border border-red-950 bg-[#050505] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.55)]">
        <p className="text-xs uppercase tracking-[0.24em] text-red-300/70">
          计划模块
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          短期推进，长期校准
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          {summary}
        </p>

        <div className="mt-5 rounded-3xl border border-red-950 bg-[#080808] p-5">
          <h3 className="text-sm font-semibold text-white">设计建议</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {systemRule}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <PlanChecklist title="短期计划" tasks={shortTerm} />
        <PlanChecklist title="长期计划" tasks={longTerm} />
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[32px] border border-red-950 bg-[#080808] p-5">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-base font-semibold text-white">成果同步</h3>
            <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-100">
              {achievementCount} 条新增成果
            </span>
          </div>
          <div className="mt-4 grid gap-3">
            {recentAchievements.map((achievement) => (
              <div
                key={achievement}
                className="rounded-2xl border border-zinc-900 bg-[#050505] px-4 py-4 text-sm leading-relaxed text-zinc-300"
              >
                {achievement}
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[32px] border border-red-950 bg-[#080808] p-5">
          <h3 className="text-base font-semibold text-white">我的调整</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            这里适合给用户保留手动编辑空间。真实产品里可以做成可保存到后端的备注、计划增删和优先级调整。
          </p>
          <textarea
            value={displayedNote}
            onChange={(event) => {
              setHasEditedNote(true);
              setNote(event.target.value);
            }}
            className="mt-4 min-h-40 w-full rounded-2xl border border-zinc-900 bg-[#050505] px-4 py-4 text-sm leading-relaxed text-zinc-200 outline-none ring-0 placeholder:text-zinc-600"
          />
        </article>
      </section>
    </section>
  );
}

