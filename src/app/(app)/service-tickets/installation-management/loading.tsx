import { Skeleton } from "@/components/ui/skeleton";

export default function InstallationManagementLoading() {
  return (
    <div className="space-y-4 p-4 sm:space-y-5 sm:p-6 lg:p-7">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Skeleton className="h-7 w-52 rounded-lg" />
          <Skeleton className="mt-1.5 h-4 w-64 rounded-md" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {["total", "pending", "assigned", "completed"].map((stat) => (
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
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="border-b border-border bg-muted/40 p-3">
          <div className="grid grid-cols-6 gap-4">
            <Skeleton className="h-4 w-16 rounded-sm" />
            <Skeleton className="h-4 w-28 rounded-sm" />
            <Skeleton className="h-4 w-20 rounded-sm" />
            <Skeleton className="h-4 w-24 rounded-sm" />
            <Skeleton className="h-4 w-16 rounded-sm" />
            <Skeleton className="h-4 w-16 ml-auto rounded-sm" />
          </div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`installation-${i}`} className="p-3.5">
              <div className="grid grid-cols-6 gap-4 items-center">
                <Skeleton className="h-4 w-20 rounded-sm" />
                <Skeleton className="h-4 w-36 rounded-sm" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-28 rounded-sm" />
                <Skeleton className="h-4 w-24 rounded-sm" />
                <Skeleton className="h-6 w-14 ml-auto rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
