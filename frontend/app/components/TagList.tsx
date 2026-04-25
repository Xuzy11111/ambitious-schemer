export function TagList({ title, tags }: { title: string; tags: string[] }) {
  return (
    <section className="rounded-3xl border border-red-950 bg-[#080808] p-5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs text-red-100"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}

