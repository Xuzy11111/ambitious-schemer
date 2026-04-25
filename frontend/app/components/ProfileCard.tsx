import type { UserProfile } from "../data/mockData";
import { TagList } from "./TagList";

function ProfileSection({
  title,
  items,
}: {
  title: string;
  items: UserProfile["experiences"];
}) {
  return (
    <section className="rounded-3xl border border-red-950 bg-[#080808] p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h4 className="text-base font-semibold text-white">{title}</h4>
      </div>
      <div className="grid gap-3">
        {items.map((item, index) => (
          <article
            key={`${title}-${item.title}-${index}`}
            className="rounded-2xl border border-zinc-900 bg-[#050505] px-4 py-4"
          >
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm text-white">{item.title}</strong>
              <span className="text-xs text-zinc-500">{item.meta}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {item.detail}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.highlights.map((highlight) => (
                <span
                  key={highlight}
                  className="rounded-full border border-red-500/16 bg-red-500/8 px-3 py-1 text-xs text-red-100"
                >
                  {highlight}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProfileCard({ profile }: { profile: UserProfile }) {
  return (
    <article className="rounded-[32px] border border-red-950 bg-[#050505] p-6 shadow-[0_26px_80px_rgba(0,0,0,0.55)]">
      <div className="grid gap-2">
        <p className="text-xs uppercase tracking-[0.24em] text-red-300/70">
          成长档案
        </p>
        <h3 className="text-2xl font-semibold tracking-tight text-white">
          {profile.role}
        </h3>
        <p className="text-base leading-relaxed text-red-50/90">
          {profile.ambition}
        </p>
        <p className="text-sm leading-relaxed text-zinc-400">
          {profile.summary}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-4 gap-3 max-[980px]:grid-cols-1">
        {profile.stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-zinc-900 bg-[#090909] px-4 py-4"
          >
            <span className="block text-xs text-zinc-500">{s.label}</span>
            <strong className="mt-2 block text-2xl font-semibold text-white">
              {s.value}
            </strong>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5">
        <ProfileSection title="经历" items={profile.experiences} />
        <ProfileSection title="项目" items={profile.projects} />
        <ProfileSection title="实习 / 实践" items={profile.internships} />
        <ProfileSection title="论文 / 研究" items={profile.papers} />
      </div>

      <div className="mt-5">
        <TagList title="综合能力" tags={profile.competencies} />
      </div>
    </article>
  );
}

