"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Field } from "@/components/service-tickets/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { UserRow } from "@/db/queries/users";
import { adminUpdateUserPassword } from "@/lib/actions/users";
import { adminUpdatePasswordSchema } from "@/lib/validations/user";

type UpdatePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: UserRow;
};

type FormValues = z.infer<typeof adminUpdatePasswordSchema>;

function UpdatePasswordDialog({
  open,
  onOpenChange,
  user,
}: UpdatePasswordDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(adminUpdatePasswordSchema),
    mode: "onChange",
    defaultValues: {
      id: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (open && user) {
      setFormError(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
      form.reset({
        id: user.id,
        password: "",
        confirmPassword: "",
      });
    }
  }, [open, user, form]);

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const result = await adminUpdateUserPassword(values);
      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) {
          for (const [key, messages] of Object.entries(result.fieldErrors)) {
            if (messages?.[0]) {
              // biome-ignore lint/suspicious/noExplicitAny: dynamic field
              form.setError(key as any, { message: messages[0] });
            }
          }
        }
        return;
      }
      toast.success("Password updated");
      onOpenChange(false);
    });
  });

  const hasClientErrors = Object.keys(form.formState.errors).length > 0;
  const clientErrorSummary =
    form.formState.submitCount > 0 && hasClientErrors
      ? "Please correct the highlighted fields."
      : null;
  const displayedError = formError || clientErrorSummary;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Update Password</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-2" noValidate>
          <Field
            label="New Password"
            required
            error={form.formState.errors.password?.message}
          >
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                className="h-9 rounded-md pr-9"
                {...form.register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </Field>

          <Field
            label="Confirm Password"
            required
            error={form.formState.errors.confirmPassword?.message}
          >
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                className="h-9 rounded-md pr-9"
                {...form.register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2"
                aria-label={
                  showConfirmPassword ? "Hide password" : "Show password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </Field>

          {displayedError && (
            <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs">
              {displayedError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto"
            >
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update Password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { UpdatePasswordDialog };
