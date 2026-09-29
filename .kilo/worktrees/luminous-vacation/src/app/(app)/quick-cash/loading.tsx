import { Skeleton } from "@/components/ui/skeleton";

export default function QuickCashLoading() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Top Header Bar */}
      <div className="border-b border-border bg-card px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-6 w-32 rounded-lg" />
            <Skeleton className="mt-1 h-3.5 w-64 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-36 rounded-lg" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {/* Register Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {["opening", "in", "out", "closing"].map((label) => (
            <div
              key={`stat-${label}`}
              className="rounded-xl border border-border bg-card p-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <Skeleton className="h-3.5 w-24 rounded-sm" />
                <Skeleton className="size-6 rounded-md" />
              </div>
              <Skeleton className="mt-2.5 h-6 w-28 rounded-md" />
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border pb-2">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
          <div className="border-b border-border bg-muted/40 p-3">
            <div className="grid grid-cols-6 gap-4">
              <Skeleton className="h-4 w-16 rounded-sm" />
              <Skeleton className="h-4 w-24 rounded-sm" />
              <Skeleton className="h-4 w-20 rounded-sm" />
              <Skeleton className="h-4 w-28 rounded-sm" />
              <Skeleton className="h-4 w-16 rounded-sm" />
              <Skeleton className="h-4 w-16 ml-auto rounded-sm" />
            </div>
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`skeleton-${String.fromCharCode(97 + i)}`}
                className="p-3.5"
              >
                <div className="grid grid-cols-6 gap-4 items-center">
                  <Skeleton className="h-4 w-20 rounded-sm" />
                  <Skeleton className="h-4 w-32 rounded-sm" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-24 rounded-sm" />
                  <Skeleton className="h-4 w-20 rounded-sm" />
                  <Skeleton className="h-6 w-14 ml-auto rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
