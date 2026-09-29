"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  LogOut,
  Shield,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logout } from "@/lib/actions/auth";
import { updateProfile } from "@/lib/actions/profile";
import { USER_ROLE_LABELS } from "@/lib/constants";
import type { CurrentUser } from "@/lib/session";
import {
  type UpdateProfileValues,
  updateProfileSchema,
} from "@/lib/validations/profile";

function ReadOnlyField({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
        {label}
      </Label>
      <div className="bg-muted/40 border-border flex h-10 items-center rounded-lg border px-3 text-sm text-foreground [overflow-wrap:anywhere]">
        {value || "—"}
      </div>
      {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
    </div>
  );
}

function ProfileView({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<UpdateProfileValues>({
    resolver: zodResolver(updateProfileSchema),
    values: {
      firstName: user.firstName,
      lastName: user.lastName,
    },
  });

  const onSaveProfile = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await updateProfile(values);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Profile updated successfully");
      router.refresh();
    });
  });

  const onLogout = () => {
    startTransition(async () => {
      await logout();
      router.replace("/login");
    });
  };

  return (
    <main className="bg-background flex w-full flex-1 justify-center px-4 py-6 sm:px-6 sm:py-10">
      <div className="w-full max-w-2xl">
        {/* Navigation Breadcrumb */}
        <div className="mb-4">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard
          </Link>
        </div>

        {/* Profile Card */}
        <div className="border-border bg-card rounded-2xl border p-6 shadow-sm sm:p-8">
          {/* Card Header */}
          <div className="border-border mb-6 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-xl">
                <User className="size-6" />
              </div>
              <div>
                <h1 className="text-foreground text-2xl font-bold tracking-tight">
                  My Profile
                </h1>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  Manage your personal details and account settings.
                </p>
              </div>
            </div>

            <div className="bg-accent text-accent-foreground inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-semibold">
              <Shield className="size-3.5" />
              {USER_ROLE_LABELS[user.role]}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={onSaveProfile} className="space-y-6" noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="profile-first-name"
                  className="text-foreground text-xs font-semibold uppercase tracking-wider"
                >
                  First Name
                </Label>
                <Input
                  id="profile-first-name"
                  className="h-10 rounded-lg text-sm"
                  {...form.register("firstName")}
                />
                {form.formState.errors.firstName && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.firstName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="profile-last-name"
                  className="text-foreground text-xs font-semibold uppercase tracking-wider"
                >
                  Last Name
                </Label>
                <Input
                  id="profile-last-name"
                  className="h-10 rounded-lg text-sm"
                  {...form.register("lastName")}
                />
                {form.formState.errors.lastName && (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.lastName.message}
                  </p>
                )}
              </div>

              <ReadOnlyField
                label="Email Address"
                value={user.email}
                hint="Email address cannot be changed."
              />

              <ReadOnlyField label="Phone Number" value={user.phone ?? ""} />

              {user.role !== "ADMIN" && (
                <ReadOnlyField
                  label="Department"
                  value={user.department ?? ""}
                />
              )}

              <ReadOnlyField label="Role" value={USER_ROLE_LABELS[user.role]} />
            </div>

            {/* Actions Bar */}
            <div className="border-border flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/change-password")}
                  className="cursor-pointer"
                >
                  <KeyRound className="size-4" />
                  Change Password
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={onLogout}
                  disabled={isPending}
                  className="cursor-pointer"
                >
                  <LogOut className="size-4" />
                  Logout
                </Button>
              </div>

              <Button
                type="submit"
                disabled={isPending}
                size="sm"
                className="cursor-pointer"
              >
                {isPending && <Loader2 className="size-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

export { ProfileView };
