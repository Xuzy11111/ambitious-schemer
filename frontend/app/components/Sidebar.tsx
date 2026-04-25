import type { SidebarSection, UserProfile } from "../data/mockData";

export function Sidebar({
  sections,
  activeKey,
  user,
  onRegenerate,
  onSelect,
}: {
  sections: SidebarSection[];
  activeKey: SidebarSection["key"];
  user: UserProfile;
  onRegenerate: () => void;
  onSelect: (key: SidebarSection["key"]) => void;
}) {
  return (
    <aside className="flex h-dvh flex-col border-r border-red-950 bg-[#030303] px-5 py-7">
      <div className="mb-7 flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-red-700 via-red-500 to-orange-300 text-sm font-black text-slate-950 shadow-[0_18px_40px_rgba(220,38,38,0.28)]">
          Y
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-red-300/70">Logo</p>
          <h1 className="text-lg font-semibold tracking-tight text-white">
            野心家
          </h1>
        </div>
      </div>

      <nav className="grid gap-3">
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onSelect(s.key)}
            className={[
              "group rounded-2xl border px-4 py-4 text-left transition",
              activeKey === s.key
                ? "border-red-700 bg-gradient-to-br from-[#220707] to-[#060303]"
                : "border-zinc-900 bg-[#070707] hover:-translate-y-0.5 hover:border-red-950",
            ].join(" ")}
          >
            <span className="block text-sm font-semibold text-white">
              {s.label}
            </span>
            <span className="mt-1 block text-xs text-zinc-500">{s.hint}</span>
          </button>
        ))}
      </nav>

      <div className="mt-auto grid gap-3 pt-7">
        <div className="flex items-center justify-between rounded-2xl border border-zinc-900 bg-[#080808] px-4 py-3 text-sm">
          <span className="text-zinc-500">当前用户</span>
          <strong className="font-semibold text-white">{user.name}</strong>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-zinc-900 bg-[#080808] px-4 py-3 text-sm">
          <span className="text-zinc-500">当前阶段</span>
          <strong className="font-semibold text-white">{user.stage}</strong>
        </div>
        <button
          type="button"
          onClick={onRegenerate}
          className="rounded-2xl bg-gradient-to-br from-red-700 via-red-500 to-orange-300 px-4 py-3 text-sm font-bold text-slate-950 transition hover:-translate-y-0.5"
        >
          重新生成建议
        </button>
      </div>
    </aside>
  );
}

