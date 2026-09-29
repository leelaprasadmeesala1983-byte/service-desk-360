import { Skeleton } from "@/components/ui/skeleton";

export default function CustomerReportsLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-64 rounded-lg" />
          <Skeleton className="mt-1.5 h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`stat-card-${i + 1}`}
            className="rounded-xl border border-border bg-card p-3.5 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20 rounded-sm" />
              <Skeleton className="size-6 rounded-md" />
            </div>
            <Skeleton className="mt-2.5 h-7 w-12 rounded-md" />
            <Skeleton className="mt-1 h-3 w-24 rounded-sm" />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Skeleton className="h-9 w-64 rounded-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="border-b border-border bg-muted/40 p-3">
          <div className="grid grid-cols-8 gap-4">
            <Skeleton className="h-4 w-12 rounded-sm" />
            <Skeleton className="h-4 w-32 rounded-sm" />
            <Skeleton className="h-4 w-24 rounded-sm" />
            <Skeleton className="h-4 w-28 rounded-sm" />
            <Skeleton className="h-4 w-16 rounded-sm" />
            <Skeleton className="h-4 w-16 rounded-sm" />
            <Skeleton className="h-4 w-24 rounded-sm" />
            <Skeleton className="h-4 w-16 ml-auto rounded-sm" />
          </div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`customer-row-${i + 1}`} className="p-3.5">
              <div className="grid grid-cols-8 gap-4 items-center">
                <Skeleton className="h-4 w-6 rounded-sm" />
                <Skeleton className="h-4 w-36 rounded-sm" />
                <Skeleton className="h-4 w-24 rounded-sm" />
                <Skeleton className="h-4 w-32 rounded-sm" />
                <Skeleton className="h-5 w-10 rounded-full" />
                <Skeleton className="h-5 w-10 rounded-full" />
                <Skeleton className="h-4 w-20 rounded-sm" />
                <Skeleton className="h-7 w-16 ml-auto rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
