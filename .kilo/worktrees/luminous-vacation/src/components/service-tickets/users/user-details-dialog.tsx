"use client";

import { DetailGrid, DetailRow } from "@/components/service-tickets/detail-row";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserRow } from "@/db/queries/users";
import { USER_ROLE_LABELS, USER_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type UserDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserRow;
};

function UserDetailsDialog({
  open,
  onOpenChange,
  user,
}: UserDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{user?.name || "User"}</DialogTitle>
        </DialogHeader>

        {user && (
          <DetailGrid>
            <DetailRow label="User ID">
              #{user.id.slice(0, 8).toUpperCase()}
            </DetailRow>
            <DetailRow label="Status">
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                  user.status === "ACTIVE"
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                    : "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
                )}
              >
                {USER_STATUS_LABELS[user.status]}
              </span>
            </DetailRow>
            <DetailRow label="First Name">{user.firstName || "—"}</DetailRow>
            <DetailRow label="Last Name">{user.lastName || "—"}</DetailRow>
            <DetailRow label="Email Address">{user.email}</DetailRow>
            <DetailRow label="Phone Number">{user.phone || "—"}</DetailRow>
            <DetailRow label="Role">{USER_ROLE_LABELS[user.role]}</DetailRow>
            <DetailRow label="Department">{user.department || "—"}</DetailRow>
            <DetailRow label="Joined">{formatDate(user.createdAt)}</DetailRow>
          </DetailGrid>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { UserDetailsDialog };
