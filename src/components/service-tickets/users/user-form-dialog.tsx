"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";
import { DepartmentField } from "@/components/service-tickets/department-field";
import { ControlledSelect, Field } from "@/components/service-tickets/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import type { UserRow } from "@/db/queries/users";
import { createUser, updateUser } from "@/lib/actions/users";
import {
  USER_ROLE_LABELS,
  USER_ROLES,
  USER_STATUS_LABELS,
  USER_STATUSES,
} from "@/lib/constants";
import { addUserSchema, editUserSchema } from "@/lib/validations/user";

const ROLE_OPTIONS = USER_ROLES.map((role) => ({
  value: role,
  label: USER_ROLE_LABELS[role],
}));

const STATUS_OPTIONS = USER_STATUSES.map((status) => ({
  value: status,
  label: USER_STATUS_LABELS[status],
}));

type UserFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: string[];
  /** Present in edit mode. */
  user?: UserRow;
};

function UserFormDialog({
  open,
  onOpenChange,
  departments,
  user,
}: UserFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(user);
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const schema = !isEdit ? addUserSchema : editUserSchema;

  // Single unified form instance matching Service & Installation dialogs
  // biome-ignore lint/suspicious/noExplicitAny: unified form for add/edit schemas
  const form = useForm<any>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver bridges the schemas
    resolver: zodResolver(schema as any) as Resolver<any>,
    mode: "onChange",
    defaultValues: user
      ? {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone ?? "",
          role: user.role,
          department: user.department ?? departments[0] ?? "",
          status: user.status,
          password: "",
          confirmPassword: "",
        }
      : {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          role: "TECHNICIAN",
          department: departments[0] ?? "",
          status: "ACTIVE",
          password: "",
          confirmPassword: "",
        },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);

    if (user) {
      form.reset({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone ?? "",
        role: user.role,
        department: user.department ?? departments[0] ?? "",
        status: user.status,
        password: "",
        confirmPassword: "",
      });
    } else {
      form.reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        role: "TECHNICIAN",
        department: departments[0] ?? "",
        status: "ACTIVE",
        password: "",
        confirmPassword: "",
      });
    }
  }, [open, user, departments, form]);

  const handleOpenChange = (newOpen: boolean) => {
    if (isPending && !newOpen) return;
    onOpenChange(newOpen);
    if (!newOpen) {
      setFormError(null);
      setShowPassword(false);
      setShowConfirmPassword(false);
      if (!isEdit) {
        form.reset({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          role: "TECHNICIAN",
          department: departments[0] ?? "",
          status: "ACTIVE",
          password: "",
          confirmPassword: "",
        });
      }
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    void form.handleSubmit(
      (raw) => {
        setFormError(null);

        startTransition(async () => {
          try {
            const result = isEdit
              ? await updateUser({
                  id: user!.id,
                  firstName: raw.firstName,
                  lastName: raw.lastName,
                  phone: raw.phone,
                  role: raw.role,
                  department: raw.department,
                  status: raw.status,
                })
              : await createUser(raw);

            if (!result.ok) {
              setFormError(
                result.error || "Please correct the highlighted fields.",
              );
              for (const [key, messages] of Object.entries(
                result.fieldErrors ?? {},
              )) {
                if (messages?.[0]) {
                  form.setError(key, {
                    type: "server",
                    message: messages[0],
                  });
                }
              }
              return;
            }

            toast.success(isEdit ? "User updated" : "User created");
            handleOpenChange(false);
            router.refresh();
          } catch (error) {
            console.error("User submit failed:", error);
            setFormError("Something went wrong while saving the user.");
          }
        });
      },
      () => {
        // Validation failed; form.formState.errors updated reactively
      },
    )(event);
  };

  const errors = form.formState.errors as Record<
    string,
    { message?: string } | undefined
  >;

  const hasClientValidationErrors =
    Object.keys(form.formState.errors).length > 0;
  const clientValidationSummary =
    form.formState.submitCount > 0 && hasClientValidationErrors
      ? "Please correct the highlighted fields."
      : null;

  const displayedError = formError || clientValidationSummary;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this person's details and access."
              : "The email and password become their sign-in credentials."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="First Name"
              required
              error={errors.firstName?.message}
            >
              <Input
                className="h-9 rounded-md"
                {...form.register("firstName")}
              />
            </Field>
            <Field label="Last Name" required error={errors.lastName?.message}>
              <Input
                className="h-9 rounded-md"
                {...form.register("lastName")}
              />
            </Field>

            {isEdit ? (
              <Field label="Email Address" hint="Email cannot be changed.">
                <Input
                  className="h-9 rounded-md"
                  value={user?.email ?? ""}
                  readOnly
                  disabled
                />
              </Field>
            ) : (
              <Field
                label="Email Address"
                required
                error={errors.email?.message}
              >
                <Input
                  type="email"
                  className="h-9 rounded-md"
                  {...form.register("email")}
                />
              </Field>
            )}

            <Field label="Phone Number" required error={errors.phone?.message}>
              <PhoneInput
                className="h-9 rounded-md"
                {...form.register("phone")}
              />
            </Field>

            <ControlledSelect
              control={form.control}
              name="role"
              label="Role"
              required
              options={ROLE_OPTIONS}
              disabled={isEdit}
              hint={isEdit ? "Role cannot be changed." : undefined}
            />
            <ControlledSelect
              control={form.control}
              name="status"
              label="Status"
              required
              options={STATUS_OPTIONS}
            />

            <DepartmentField
              control={form.control}
              name="department"
              departments={departments}
              required
            />

            {!isEdit && (
              <>
                <Field
                  label="Password"
                  required
                  error={errors.password?.message}
                >
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      className="h-9 rounded-md pr-9"
                      autoComplete="new-password"
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 p-1"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
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
                  error={errors.confirmPassword?.message}
                >
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      className="h-9 rounded-md pr-9"
                      autoComplete="new-password"
                      {...form.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((value) => !value)}
                      className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 p-1"
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
              </>
            )}
          </div>

          {displayedError && (
            <p className="bg-destructive/10 text-destructive rounded-md px-3 py-2 text-xs">
              {displayedError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
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
              {!isEdit ? "Create User" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { UserFormDialog };
