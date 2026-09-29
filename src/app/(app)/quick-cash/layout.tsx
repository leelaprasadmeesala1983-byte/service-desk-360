import { notFound } from "next/navigation";

import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { APP_MODULES } from "@/lib/modules";
import { requireUser } from "@/lib/session";

export default async function QuickCashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const module = APP_MODULES["quick-cash"];

  if (!module.roles.includes(user.role)) notFound();

  return (
    <div className="flex h-full w-full overflow-hidden">
      <AppSidebar moduleKey="quick-cash" user={user} />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
