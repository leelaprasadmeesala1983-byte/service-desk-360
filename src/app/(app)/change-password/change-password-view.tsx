"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "@/lib/actions/profile";
import {
  type ChangePasswordValues,
  changePasswordSchema,
} from "@/lib/validations/auth";

function ChangePasswordView() {
  const router = useRouter();
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
      router.push("/profile");
    });
  });

  return (
    <main className="bg-background flex w-full flex-1 justify-center px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-4">
          <Link
            href="/profile"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Profile
          </Link>
        </div>

        {/* Change Password Card */}
        <div className="border-border bg-card rounded-2xl border p-6 shadow-sm sm:p-8">
          {/* Card Header */}
          <div className="border-border mb-6 flex items-center gap-3 border-b pb-6">
            <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
              <KeyRound className="size-6" />
            </div>
            <div>
              <h1 className="text-foreground text-2xl font-bold tracking-tight">
                Change Password
              </h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                Update your password to keep your account secure.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
            {/* Current Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="currentPassword"
                className="text-foreground text-xs font-semibold uppercase tracking-wider"
              >
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
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
                htmlFor="newPassword"
                className="text-foreground text-xs font-semibold uppercase tracking-wider"
              >
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
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
                  aria-label={
                    showNewPassword ? "Hide password" : "Show password"
                  }
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
                htmlFor="confirmPassword"
                className="text-foreground text-xs font-semibold uppercase tracking-wider"
              >
                Confirm New Password
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
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

            {/* Actions Bar */}
            <div className="border-border flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => router.push("/profile")}
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
        </div>
      </div>
    </main>
  );
}

export { ChangePasswordView };
