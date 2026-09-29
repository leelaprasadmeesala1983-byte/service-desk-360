import { Sparkles } from "lucide-react";
import { requireUser } from "@/lib/session";

import { ModuleGrid } from "./module-grid";

export default async function HomePage() {
  const user = await requireUser();
  const displayName =
    user?.name?.trim() ||
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
    user?.email?.trim() ||
    "";

  const welcomeHeading = displayName
    ? `Welcome, ${displayName}`
    : "Welcome to ServiceDesk 360";

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50/60 dark:bg-background">
      <main className="flex min-h-full flex-col justify-between px-4 py-6 sm:px-6 sm:py-8 md:py-10 lg:px-8">
        <div className="mx-auto w-full max-w-5xl">
          {/* Welcome Section */}
          <div className="mb-6 text-center sm:mb-8 md:mb-10">
            {/* Workspace Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50/90 px-3 py-0.5 text-[10.5px] font-bold tracking-wider text-blue-700 uppercase shadow-2xs dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300">
              <Sparkles className="size-3 text-blue-600 dark:text-blue-400" />
              SERVICE DESK 360 WORKSPACE
            </div>

            {/* Page Heading */}
            <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl md:text-[36px] md:leading-tight dark:text-white">
              {welcomeHeading}
            </h1>

            {/* Subtitle */}
            <p className="mx-auto mt-2 max-w-lg text-xs text-slate-600 sm:text-sm md:text-base dark:text-slate-400">
              Choose a management module to continue
            </p>
          </div>

          {/* Module Cards Grid */}
          <ModuleGrid role={user.role} />
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-slate-500 sm:mt-10 dark:text-slate-400">
          © {new Date().getFullYear()} ServiceDesk 360. All rights reserved.
        </footer>
      </main>
    </div>
  );
}
