import { Suspense } from "react";

import { AppHeader } from "@/components/app-shell/app-header";
import { ShellProvider } from "@/components/app-shell/shell-context";
import {
  countUnreadNotifications,
  listNotifications,
} from "@/db/queries/notifications";
import { requireUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const [notifications, unreadCount] = await Promise.all([
    listNotifications(user.id),
    countUnreadNotifications(user.id),
  ]);

  return (
    <ShellProvider>
      {/*
        h-screen + overflow-hidden on the outer shell ensures the header
        is truly sticky: the viewport itself is the only scroll container,
        so `sticky top-0` on the <header> inside AppHeader always works.
        The inner content wrapper is overflow-y-auto so only it scrolls.
      */}
      <div className="bg-background flex h-screen w-full flex-col overflow-hidden">
        <Suspense fallback={null}>
          <AppHeader
            user={user}
            notifications={notifications}
            unreadCount={unreadCount}
          />
        </Suspense>
        {/*
          overflow-hidden: each child page/layout is responsible for its own
          vertical scroll. This prevents the body from ever being the scroll
          container. Pages without a sidebar wrap their content in
          overflow-y-auto; pages with a sidebar scroll only the main column.
        */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </ShellProvider>
  );
}
