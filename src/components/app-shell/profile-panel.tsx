"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logout } from "@/lib/actions/auth";
import { changePassword, updateProfile } from "@/lib/actions/profile";
import { USER_ROLE_LABELS } from "@/lib/constants";
import type { CurrentUser } from "@/lib/session";
import {
  type ChangePasswordValues,
  changePasswordSchema,
} from "@/lib/validations/auth";
import {
  type UpdateProfileValues,
  updateProfileSchema,
} from "@/lib/validations/profile";

type ProfilePanelProps = {
  user: CurrentUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-muted-foreground">{label}</Label>
      <p className="bg-muted/60 border-border overflow-hidden rounded-md border px-3 py-2 text-sm [overflow-wrap:anywhere]">
        {value || "—"}
      </p>
    </div>
  );
}

function ProfilePanel({ user, open, onOpenChange }: ProfilePanelProps) {
  const router = useRouter();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  const profileForm = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    values: { firstName: user.firstName, lastName: user.lastName },
  });

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSaveProfile = profileForm.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateProfile(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile updated");
      router.refresh();
    });
  });

  const onChangePassword = passwordForm.handleSubmit((values) => {
    startTransition(async () => {
      const result = await changePassword(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Password updated successfully");
      passwordForm.reset();
      setShowPasswordForm(false);
    });
  });

  const onLogout = () => {
    startTransition(async () => {
      await logout();
      window.location.href = "/login";
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>My Profile</DialogTitle>
          <DialogDescription>
            Update your name or change your password.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="profile-first-name">First Name</Label>
            <Input
              id="profile-first-name"
              {...profileForm.register("firstName")}
            />
            {profileForm.formState.errors.firstName && (
              <p className="text-destructive text-xs">
                {profileForm.formState.errors.firstName.message}
              </p>
            )}
          </div>

          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="profile-last-name">Last Name</Label>
            <Input
              id="profile-last-name"
              {...profileForm.register("lastName")}
            />
            {profileForm.formState.errors.lastName && (
              <p className="text-destructive text-xs">
                {profileForm.formState.errors.lastName.message}
              </p>
            )}
          </div>

          <ReadOnlyField label="Email Address" value={user.email} />
          <ReadOnlyField label="Phone Number" value={user.phone ?? ""} />

          {/* Department is hidden entirely for admins (spec §3). */}
          {user.role !== "ADMIN" && (
            <ReadOnlyField label="Department" value={user.department ?? ""} />
          )}

          {/* The only place a technician is shown their role. */}
          <ReadOnlyField label="Role" value={USER_ROLE_LABELS[user.role]} />
        </div>

        {showPasswordForm && (
          <div className="border-border mt-2 space-y-3 border-t pt-4">
            <p className="text-sm font-medium">Change Password</p>

            <div className="space-y-1.5">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                {...passwordForm.register("currentPassword")}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-destructive text-xs">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                {...passwordForm.register("newPassword")}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-destructive text-xs">
                  {passwordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                {...passwordForm.register("confirmPassword")}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-destructive text-xs">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={onChangePassword} disabled={isPending}>
                Save Password
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  passwordForm.reset();
                  setShowPasswordForm(false);
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2 flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            {!showPasswordForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordForm(true)}
              >
                <KeyRound />
                Change Password
              </Button>
            )}
            <Button
              variant="destructive"
              size="sm"
              onClick={onLogout}
              disabled={isPending}
            >
              <LogOut />
              Logout
            </Button>
          </div>

          <Button onClick={onSaveProfile} disabled={isPending} size="sm">
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ProfilePanel };
