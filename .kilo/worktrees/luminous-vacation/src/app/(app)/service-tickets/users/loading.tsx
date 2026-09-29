import { Skeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6 lg:p-7">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-44 rounded-lg" />
          <Skeleton className="mt-1.5 h-4 w-60 rounded-md" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* 3 Stat Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {["total", "active", "inactive"].map((stat) => (
          <div
            key={stat}
            className="rounded-xl border border-border bg-card p-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-20 rounded-sm" />
              <Skeleton className="size-6 rounded-md" />
            </div>
            <Skeleton className="mt-2.5 h-6 w-14 rounded-md" />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-72 rounded-lg" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="border-b border-border bg-muted/40 p-3">
          <div className="grid grid-cols-5 gap-4">
            <Skeleton className="h-4 w-24 rounded-sm" />
            <Skeleton className="h-4 w-28 rounded-sm" />
            <Skeleton className="h-4 w-16 rounded-sm" />
            <Skeleton className="h-4 w-20 rounded-sm" />
            <Skeleton className="h-4 w-16 ml-auto rounded-sm" />
          </div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={`user-${i}`} className="p-3.5">
              <div className="grid grid-cols-5 gap-4 items-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-full" />
                  <Skeleton className="h-4 w-28 rounded-sm" />
                </div>
                <Skeleton className="h-4 w-36 rounded-sm" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-6 w-14 ml-auto rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
