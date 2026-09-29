"use client";

import {
  Eye,
  Key,
  Loader2,
  Pencil,
  Power,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell/page-header";
import { UpdatePasswordDialog } from "@/components/service-tickets/users/update-password-dialog";
import { UserDetailsDialog } from "@/components/service-tickets/users/user-details-dialog";
import { UserFormDialog } from "@/components/service-tickets/users/user-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserRow, UserStats } from "@/db/queries/users";
import { deleteUser, setUserStatus } from "@/lib/actions/users";
import {
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  type UserRole,
  type UserStatus,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type RoleFilter = UserRole | "ALL";
type StatusFilter = UserStatus | "ALL";

type UsersViewProps = {
  users: UserRow[];
  stats: UserStats;
  departments: string[];
  currentUserId: string;
};

function Pills<T extends string>({
  options,
  active,
  onChange,
}: {
  options: { value: T; label: string }[];
  active: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            active === option.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function UsersView({
  users,
  stats,
  departments,
  currentUserId,
}: UsersViewProps) {
  const router = useRouter();

  const [usersList, setUsersList] = useState<UserRow[]>(users);
  const [statusUpdatingUserId, setStatusUpdatingUserId] = useState<
    string | null
  >(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | undefined>();
  const [updatePasswordUser, setUpdatePasswordUser] = useState<
    UserRow | undefined
  >();
  const [viewUser, setViewUser] = useState<UserRow | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<UserRow | undefined>();

  useEffect(() => {
    setUsersList(users);
  }, [users]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return usersList.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) return false;
      if (statusFilter !== "ALL" && user.status !== statusFilter) return false;
      if (term) {
        const haystack =
          `${user.name} ${user.email} ${user.phone ?? ""}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [usersList, roleFilter, statusFilter, search]);

  const onToggleStatus = async (user: UserRow) => {
    const next: UserStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      setStatusUpdatingUserId(user.id);
      const result = await setUserStatus({ id: user.id, status: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(next === "ACTIVE" ? "User activated" : "User deactivated");
      setUsersList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: next } : u)),
      );
      router.refresh();
    } catch {
      toast.error("Failed to update status");
    } finally {
      setStatusUpdatingUserId(null);
    }
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    const targetId = deleteTarget.id;
    try {
      setDeletingUserId(targetId);
      const result = await deleteUser({ id: targetId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("User deleted");
      setUsersList((prev) => prev.filter((u) => u.id !== targetId));
      setDeleteTarget(undefined);
      router.refresh();
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="User Management"
        action={
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus />
            Add User
          </Button>
        }
      />

      <div className="border-border bg-card/40 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground font-medium">Total Users</span>
          <span className="text-foreground font-bold">{stats.total}</span>
        </div>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-1">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            Active
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {stats.active}
          </span>
        </div>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-1">
          <span className="text-rose-600 dark:text-rose-400 font-medium">
            Inactive
          </span>
          <span className="text-rose-600 dark:text-rose-400 font-bold">
            {stats.inactive}
          </span>
        </div>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground font-medium">
            Admins / Technicians
          </span>
          <span className="text-foreground font-bold">
            {stats.admins} / {stats.technicians}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-4">
          <Pills
            options={[
              { value: "ALL", label: "All Roles" },
              { value: "ADMIN", label: USER_ROLE_LABELS.ADMIN },
              { value: "TECHNICIAN", label: USER_ROLE_LABELS.TECHNICIAN },
            ]}
            active={roleFilter}
            onChange={setRoleFilter}
          />
          <Pills
            options={[
              { value: "ALL", label: "All Status" },
              { value: "ACTIVE", label: USER_STATUS_LABELS.ACTIVE },
              { value: "INACTIVE", label: USER_STATUS_LABELS.INACTIVE },
            ]}
            active={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        <div className="relative w-full lg:max-w-xs">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email or phone"
            className="h-9 rounded-md pl-8"
          />
        </div>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="overflow-x-auto max-w-full">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead>
                <TableHead className="w-24">User ID</TableHead>
                <TableHead className="w-32">Name</TableHead>
                <TableHead className="w-36">Email</TableHead>
                <TableHead className="w-28">Phone</TableHead>
                <TableHead className="w-24">Role</TableHead>
                <TableHead className="w-28">Department</TableHead>
                <TableHead className="w-20 text-center">Status</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-muted-foreground py-10 text-center"
                  >
                    No users match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user, index) => {
                  const isStatusUpdating = statusUpdatingUserId === user.id;
                  const isDeleting = deletingUserId === user.id;

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        #{user.id.slice(0, 8).toUpperCase()}
                      </TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {user.phone || "—"}
                      </TableCell>
                      <TableCell>{USER_ROLE_LABELS[user.role]}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.department || "—"}
                      </TableCell>
                      <TableCell className="text-center">
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
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="View"
                            disabled={isDeleting}
                            onClick={() => setViewUser(user)}
                          >
                            <Eye />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Edit"
                            disabled={isDeleting}
                            onClick={() => setEditUser(user)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Update Password"
                            disabled={isDeleting}
                            onClick={() => setUpdatePasswordUser(user)}
                          >
                            <Key />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={
                              user.status === "ACTIVE"
                                ? "Deactivate"
                                : "Activate"
                            }
                            disabled={isStatusUpdating}
                            onClick={() => onToggleStatus(user)}
                            className={
                              user.status === "ACTIVE"
                                ? "text-rose-600 hover:text-rose-600"
                                : "text-emerald-600 hover:text-emerald-600"
                            }
                          >
                            {isStatusUpdating ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Power />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete"
                            className="text-destructive hover:text-destructive"
                            disabled={isDeleting}
                            onClick={() => setDeleteTarget(user)}
                          >
                            {isDeleting ? (
                              <Loader2 className="size-4 animate-spin text-destructive" />
                            ) : (
                              <Trash2 />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <p className="text-muted-foreground text-xs">
        {filtered.length} of {users.length} users · updated{" "}
        {formatDate(new Date())}
      </p>

      <UserFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        departments={departments}
      />
      <UserFormDialog
        key={editUser?.id ?? "edit"}
        open={Boolean(editUser)}
        onOpenChange={(open) => !open && setEditUser(undefined)}
        departments={departments}
        user={editUser}
      />
      <UserDetailsDialog
        open={Boolean(viewUser)}
        onOpenChange={(open) => !open && setViewUser(undefined)}
        user={viewUser}
      />
      <UpdatePasswordDialog
        open={Boolean(updatePasswordUser)}
        onOpenChange={(open) => !open && setUpdatePasswordUser(undefined)}
        user={updatePasswordUser}
      />

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) =>
          !open && !deletingUserId && setDeleteTarget(undefined)
        }
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              This removes their login for good. Records they were assigned to
              stay, but become unassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose
              render={
                <Button variant="outline" disabled={Boolean(deletingUserId)} />
              }
            >
              Cancel
            </DialogClose>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={Boolean(deletingUserId)}
            >
              {deletingUserId ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete User"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { UsersView };
