import { Skeleton } from "@/components/ui/skeleton";

export default function ServiceTicketsLoading() {
  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6 lg:p-7">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-44 rounded-lg" />
          <Skeleton className="mt-1.5 h-4 w-72 rounded-md" />
        </div>
      </div>

      {/* 5 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
        {[
          "total-services",
          "installations",
          "projects",
          "users",
          "technicians",
        ].map((stat) => (
          <div
            key={stat}
            className="rounded-xl border border-border bg-card p-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            <Skeleton className="mt-3 h-7 w-16 rounded-md" />
            <Skeleton className="mt-1.5 h-3.5 w-24 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {["services", "installations", "projects", "users"].map((link) => (
          <div
            key={`quick-${link}`}
            className="rounded-xl border border-border bg-card p-4 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="size-9 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="mt-1.5 h-3 w-36 rounded-sm" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts & Main Content Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2 shadow-xs">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="mt-4 h-56 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <Skeleton className="h-5 w-36 rounded-md" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-7 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-3.5 w-full rounded-sm" />
                  <Skeleton className="mt-1 h-3 w-20 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
