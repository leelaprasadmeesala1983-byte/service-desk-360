import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { APP_MODULES } from "@/lib/modules";
import { requireUser } from "@/lib/session";

export default async function AssetManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const module = APP_MODULES["asset-management"];

  if (!module.roles.includes(user.role)) notFound();

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Suspense fallback={<aside className="hidden w-70 shrink-0 lg:block" />}>
        <AppSidebar moduleKey="asset-management" user={user} />
      </Suspense>
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
