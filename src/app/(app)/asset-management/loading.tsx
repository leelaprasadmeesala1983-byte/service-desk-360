import { AssetsTableSkeleton } from "@/components/assets/asset-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function AssetManagementLoading() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 p-4 sm:p-6 lg:p-8">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Search Input Skeleton */}
      <div className="w-full sm:max-w-md">
        <Skeleton className="h-9.5 w-full rounded-lg" />
      </div>

      {/* Table Skeleton */}
      <AssetsTableSkeleton rows={5} />
    </div>
  );
}
