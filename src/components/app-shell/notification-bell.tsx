"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { NotificationItem } from "@/db/queries/notifications";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const RECORD_PATHS = {
  SERVICE: "/service-tickets/service-management",
  INSTALLATION: "/service-tickets/installation-management",
  PROJECT: "/service-tickets/project-management",
} as const;

type NotificationBellProps = {
  notifications: NotificationItem[];
  unreadCount: number;
};

function NotificationBell({
  notifications,
  unreadCount,
}: NotificationBellProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const onMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  };

  const onOpenNotification = (id: string) => {
    startTransition(async () => {
      await markNotificationRead(id);
      router.refresh();
    });
  };

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        className="hover:bg-muted relative inline-flex size-9 items-center justify-center rounded-full transition-colors"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="bg-destructive absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))] p-0"
      >
        <div className="border-border flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              disabled={isPending}
              className="text-primary text-xs font-medium hover:underline disabled:opacity-50"
            >
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-muted-foreground px-3 py-6 text-center text-xs">
              You have no notifications yet.
            </p>
          ) : (
            notifications.map((item) => (
              <Link
                key={item.id}
                href={`${RECORD_PATHS[item.recordType]}?view=${item.recordId}`}
                onClick={() => onOpenNotification(item.id)}
                className={cn(
                  "hover:bg-muted/60 border-border block border-b px-3 py-2.5 last:border-b-0",
                  !item.read && "bg-accent/40",
                )}
              >
                <div className="flex items-start gap-2">
                  {!item.read && (
                    <span className="bg-primary mt-1.5 size-1.5 shrink-0 rounded-full" />
                  )}
                  <div className={cn("min-w-0", item.read && "pl-3.5")}>
                    <p className="text-foreground truncate text-xs font-semibold">
                      {item.title}
                    </p>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                      {item.message}
                    </p>
                    <p className="text-muted-foreground mt-1 text-[10px]">
                      {formatRelativeTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { NotificationBell };
