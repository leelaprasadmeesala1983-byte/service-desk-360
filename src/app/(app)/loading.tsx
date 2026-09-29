import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50/60 dark:bg-background">
      <main className="flex min-h-full flex-col justify-between px-4 py-6 sm:px-6 sm:py-8 md:py-10 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          {/* Welcome Section */}
          <div className="mb-6 flex flex-col items-center text-center sm:mb-8 md:mb-10">
            <Skeleton className="h-5 w-44 rounded-full" />
            <Skeleton className="mt-3.5 h-8 w-72 sm:h-9 sm:w-80 rounded-xl" />
            <Skeleton className="mt-2.5 h-4 w-56 rounded-md" />
          </div>

          {/* Module Cards Grid */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 md:gap-6 lg:gap-8">
            {["service", "installation", "project"].map((type) => (
              <div
                key={`module-${type}`}
                className="flex min-h-[260px] sm:min-h-[280px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-xs dark:border-slate-800 dark:bg-card sm:p-5.5"
              >
                <div>
                  <Skeleton className="size-11 sm:size-12 rounded-xl" />
                  <Skeleton className="mt-4 h-6 w-36 rounded-lg" />
                  <Skeleton className="mt-2 h-4 w-52 rounded-md" />
                  <Skeleton className="mt-1.5 h-4 w-40 rounded-md" />
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 dark:border-slate-800/80">
                  <Skeleton className="h-5 w-24 rounded-md" />
                  <Skeleton className="size-8.5 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-center sm:mt-10">
          <Skeleton className="h-4 w-52 rounded-md" />
        </div>
      </main>
    </div>
  );
}
