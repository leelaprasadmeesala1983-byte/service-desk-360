"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Monitor, Shield, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useDensity } from "@/components/density-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/actions/profile";
import { USER_ROLE_LABELS } from "@/lib/constants";
import type { CurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
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

type ProfileModalProps = {
  user: CurrentUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ProfileModal({ user, open, onOpenChange }: ProfileModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { density, setDensity } = useDensity();

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
      onOpenChange(false);
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={true}
        className="max-h-[90vh] w-full max-w-[calc(100%-2rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-xl sm:rounded-3xl sm:p-7"
      >
        <DialogHeader className="border-border border-b pb-5 pr-8 sm:pr-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-xl">
                <User className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-foreground text-xl font-bold tracking-tight">
                  My Profile
                </DialogTitle>
                <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
                  Manage your personal details and account settings.
                </p>
              </div>
            </div>

            <div className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-blue-300 bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900 shadow-2xs sm:self-center dark:border-blue-700 dark:bg-blue-950 dark:text-blue-100">
              <Shield className="size-3.5 text-blue-700 dark:text-blue-300" />
              <span>{USER_ROLE_LABELS[user.role]}</span>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={onSaveProfile} className="space-y-5 pt-2" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="modal-profile-first-name"
                className="text-foreground text-xs font-semibold uppercase tracking-wider"
              >
                First Name
              </Label>
              <Input
                id="modal-profile-first-name"
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
                htmlFor="modal-profile-last-name"
                className="text-foreground text-xs font-semibold uppercase tracking-wider"
              >
                Last Name
              </Label>
              <Input
                id="modal-profile-last-name"
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
              <ReadOnlyField label="Department" value={user.department ?? ""} />
            )}

            <ReadOnlyField label="Role" value={USER_ROLE_LABELS[user.role]} />
          </div>

          {/* Appearance / UI Size Setting */}
          <div className="space-y-2 rounded-xl border border-border/80 bg-muted/20 p-3.5 sm:p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="size-4 text-primary" />
                <Label className="text-foreground text-xs font-semibold uppercase tracking-wider">
                  Appearance / UI Size
                </Label>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground capitalize">
                {density}
              </span>
            </div>

            <p className="text-muted-foreground text-xs">
              Adjust the application density to display more or less content.
            </p>

            <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-border bg-muted/40 p-1">
              {(
                [
                  { id: "compact", label: "Compact" },
                  { id: "default", label: "Default" },
                  { id: "comfortable", label: "Comfortable" },
                ] as const
              ).map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setDensity(option.id)}
                  className={cn(
                    "flex items-center justify-center rounded-md py-1.5 text-xs font-medium transition-all cursor-pointer",
                    density === option.id
                      ? "bg-card text-foreground font-bold shadow-2xs border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/50",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Footer: Cancel | Save Changes */}
          <div className="border-border flex flex-col-reverse gap-2.5 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
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
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
