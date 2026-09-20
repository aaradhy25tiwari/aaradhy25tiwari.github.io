export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Metric Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl border border-border bg-card p-5 space-y-3">
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="h-7 w-28 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>

      {/* Main Content Area Skeleton */}
      <div className="h-96 rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="h-6 w-48 rounded bg-muted animate-pulse" />
        <div className="h-4 w-full rounded bg-muted/60 animate-pulse" />
        <div className="h-4 w-5/6 rounded bg-muted/60 animate-pulse" />
        <div className="h-4 w-2/3 rounded bg-muted/60 animate-pulse" />
      </div>
    </div>
  );
}
