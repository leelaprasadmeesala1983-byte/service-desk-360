import { notFound } from "next/navigation";

import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { APP_MODULES } from "@/lib/modules";
import { requireUser } from "@/lib/session";

export default async function ServiceTicketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const module = APP_MODULES["service-ticket"];

  if (!module.roles.includes(user.role)) notFound();

  return (
    /*
      h-full fills the overflow-hidden content region from (app)/layout.
      The sidebar is position:fixed (viewport-anchored) — the <aside>
      placeholder reserves the 17.5rem column in flow.
      <main> is the only thing that scrolls.
    */
    <div className="flex h-full w-full overflow-hidden">
      <AppSidebar moduleKey="service-ticket" user={user} />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
