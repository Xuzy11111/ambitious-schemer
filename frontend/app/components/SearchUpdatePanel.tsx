import type { SearchMemory } from "../data/mockData";
import { TagList } from "./TagList";

export function SearchUpdatePanel({
  focusAreas,
  updateRule,
  updates,
}: {
  focusAreas: string[];
  updateRule: string;
  updates: SearchMemory[];
}) {
  return (
    <section className="rounded-[32px] border border-red-950 bg-[#050505] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.55)]">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-[0.24em] text-red-300/70">
          搜索更新
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          资料搜索更新
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
          {updateRule}
        </p>
      </header>

      <TagList title="当前兴趣领域" tags={focusAreas} />

      <div className="mt-5 grid gap-3">
        {updates.map((u) => (
          <article
            key={u.title}
            className="rounded-3xl border border-red-950 bg-[#090909] p-5"
          >
            <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
              <span>{u.source}</span>
              <time>{u.timestamp}</time>
            </div>
            <h3 className="mt-2 text-sm font-semibold text-white">{u.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {u.description}
            </p>
            <span className="mt-3 inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-100">
              写入 memory：{u.memoryTag}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}

