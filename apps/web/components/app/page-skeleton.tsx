export function PageSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <section className="animate-in fade-in py-4 duration-200">
      <div className="mb-10 space-y-4">
        <div className="h-3 w-28 animate-pulse rounded-full bg-white/10" />
        <div className="h-12 w-2/3 max-w-md animate-pulse rounded-2xl bg-white/6" />
        <div className="h-4 w-1/2 max-w-xs animate-pulse rounded-full bg-white/4" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="app-surface h-28 animate-pulse rounded-2xl bg-white/3" />
        ))}
      </div>
      <p className="font-mono mt-8 text-center text-[10px] tracking-[0.32em] text-white/30 uppercase">
        {label}
      </p>
    </section>
  );
}
