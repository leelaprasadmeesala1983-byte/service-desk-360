"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/actions/profile";
import {
  type ChangePasswordValues,
  changePasswordSchema,
} from "@/lib/validations/auth";

type ChangePasswordModalProps = {
  open: boolean;
  /** Called whenever the dialog wants to change open state (e.g. backdrop click, X button). */
  onOpenChange: (open: boolean) => void;
  /** Called by the Cancel button – must close the modal without reopening Profile. */
  onCancel: () => void;
};

export function ChangePasswordModal({
  open,
  onOpenChange,
  onCancel,
}: ChangePasswordModalProps) {
  const [isPending, startTransition] = useTransition();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await changePassword(values);
      if (!result.ok) {
        toast.error(result.error);
        if (result.fieldErrors?.currentPassword) {
          form.setError("currentPassword", {
            message: result.fieldErrors.currentPassword[0],
          });
        }
        return;
      }
      toast.success("Password updated successfully");
      form.reset();
      onCancel(); // close after success — goes back to dashboard
    });
  });

  /** Handles both the X button and backdrop click. */
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
      onCancel();
    } else {
      onOpenChange(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-md sm:rounded-3xl sm:p-7"
      >
        <DialogHeader className="border-border border-b pb-5">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
              <KeyRound className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-foreground text-xl font-bold tracking-tight">
                Change Password
              </DialogTitle>
              <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
                Update your password to keep your account secure.
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 pt-2" noValidate>
          {/* Current Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="modal-currentPassword"
              className="text-foreground text-xs font-semibold uppercase tracking-wider"
            >
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="modal-currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your current password"
                className="h-10 rounded-lg pr-10 text-sm [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                {...form.register("currentPassword")}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword((prev) => !prev)}
                onMouseDown={(e) => e.preventDefault()}
                aria-label={
                  showCurrentPassword ? "Hide password" : "Show password"
                }
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 z-10 flex w-10 cursor-pointer items-center justify-center transition-colors focus:outline-none"
              >
                {showCurrentPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {form.formState.errors.currentPassword && (
              <p className="text-destructive text-xs">
                {form.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="modal-newPassword"
              className="text-foreground text-xs font-semibold uppercase tracking-wider"
            >
              New Password
            </Label>
            <div className="relative">
              <Input
                id="modal-newPassword"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Enter your new password"
                className="h-10 rounded-lg pr-10 text-sm [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                {...form.register("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                onMouseDown={(e) => e.preventDefault()}
                aria-label={showNewPassword ? "Hide password" : "Show password"}
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 z-10 flex w-10 cursor-pointer items-center justify-center transition-colors focus:outline-none"
              >
                {showNewPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {form.formState.errors.newPassword ? (
              <p className="text-destructive text-xs">
                {form.formState.errors.newPassword.message}
              </p>
            ) : (
              <p className="text-muted-foreground text-[11px]">
                Must be at least 8 characters and include at least one letter
                and one number.
              </p>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <Label
              htmlFor="modal-confirmPassword"
              className="text-foreground text-xs font-semibold uppercase tracking-wider"
            >
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="modal-confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Re-enter your new password"
                className="h-10 rounded-lg pr-10 text-sm [&::-ms-reveal]:hidden [&::-ms-clear]:hidden"
                {...form.register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                onMouseDown={(e) => e.preventDefault()}
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
                className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 z-10 flex w-10 cursor-pointer items-center justify-center transition-colors focus:outline-none"
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-destructive text-xs">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {/* Footer: Cancel | Update Password */}
          <div className="border-border flex flex-col-reverse gap-2.5 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                form.reset();
                onCancel();
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isPending}
              size="sm"
              className="cursor-pointer"
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              Update Password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
