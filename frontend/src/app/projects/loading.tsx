export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card p-6 shadow-sm">
        <div className="h-4 w-24 rounded-full bg-muted" />
        <div className="mt-4 h-10 max-w-md rounded-2xl bg-muted" />
        <div className="mt-3 h-5 max-w-2xl rounded-2xl bg-muted" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="rounded-[1.5rem] border border-border/70 bg-card p-6"
          >
            <div className="h-12 w-12 rounded-2xl bg-muted" />
            <div className="mt-5 h-6 w-2/3 rounded-2xl bg-muted" />
            <div className="mt-3 h-4 w-full rounded-2xl bg-muted" />
            <div className="mt-2 h-4 w-5/6 rounded-2xl bg-muted" />
          </div>
        ))}
      </section>
    </div>
  );
}
