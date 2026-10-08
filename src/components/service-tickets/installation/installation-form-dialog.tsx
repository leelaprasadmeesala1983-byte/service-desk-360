"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";

import { DetailRow } from "@/components/service-tickets/detail-row";
import {
  ControlledMultiSelect,
  ControlledSelect,
  Field,
} from "@/components/service-tickets/form";
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
import { Textarea } from "@/components/ui/textarea";
import type { InstallationRow } from "@/db/queries/installations";
import {
  createInstallation,
  updateInstallation,
} from "@/lib/actions/installations";
import { RECORD_STATUS_LABELS, type UserRole } from "@/lib/constants";
import { formatDateTime, formatLocalDateTime } from "@/lib/format";
import {
  createInstallationSchema,
  editInstallationSchema,
  technicianInstallationSchema,
} from "@/lib/validations/service-ticket";

type InstallationFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerRole: UserRole;
  technicians: { id: string; name: string }[];
  record?: InstallationRow;
  onSuccess?: (savedRecord?: InstallationRow, isEdit?: boolean) => void;
};

const STATUS_OPTIONS = (["OPEN", "IN_PROGRESS", "CLOSED"] as const).map(
  (value) => ({
    value,
    label: RECORD_STATUS_LABELS[value],
  }),
);

const PAYMENT_MODE_OPTIONS = [
  { value: "ONLINE", label: "Online" },
  { value: "CASH", label: "Cash" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "PAID", label: "Paid" },
  { value: "PENDING", label: "Pending" },
];

function InstallationFormDialog({
  open,
  onOpenChange,
  viewerRole,
  technicians,
  record,
  onSuccess,
}: InstallationFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(record);
  const isTechnician = viewerRole === "TECHNICIAN";
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = !isEdit
    ? createInstallationSchema
    : isTechnician
      ? technicianInstallationSchema
      : editInstallationSchema;

  const assigneeOptions = Array.isArray(technicians)
    ? technicians
        .filter(
          (tech): tech is { id: string; name: string } =>
            Boolean(tech?.id?.trim()) && Boolean(tech?.name?.trim()),
        )
        .map((tech) => ({
          value: tech.id,
          label: tech.name,
        }))
    : [];

  const initialTechnicianIds = record
    ? Array.isArray(record.assignedTechnicianIds) &&
      record.assignedTechnicianIds.length > 0
      ? record.assignedTechnicianIds
      : typeof record.assignedTechnicianId === "string" &&
          record.assignedTechnicianId.trim().length > 0
        ? [record.assignedTechnicianId.trim()]
        : []
    : [];

  const form = useForm<any>({
    resolver: zodResolver(schema as any) as Resolver<any>,
    mode: "onChange",
    defaultValues: record
      ? {
          id: record.id,
          customerName: record.customerName ?? "",
          contactNumber: record.contactNumber ?? "",
          email: record.email ?? "",
          address: record.address ?? "",
          description: record.description ?? "",
          status: record.status ?? "OPEN",
          assignedTechnicianIds: initialTechnicianIds,
          accountUsername: record.accountUsername ?? "",
          accountPassword: record.accountPassword ?? "",
          accountMobile: record.accountMobile ?? "",
          referenceNo: record.referenceNo ?? "",
          paymentMode: record.paymentMode ?? "",
          paymentStatus: record.paymentStatus ?? "PAID",
          amount: record.amount ?? "",
          updatedAt: record.updatedAt
            ? formatLocalDateTime(record.updatedAt)
            : formatLocalDateTime(new Date()),
        }
      : {
          customerName: "",
          contactNumber: "",
          email: "",
          address: "",
          description: "",
          status: "OPEN",
          assignedTechnicianIds: [],
          accountUsername: "",
          accountPassword: "",
          accountMobile: "",
          referenceNo: "",
          paymentMode: "",
          paymentStatus: "PAID",
          amount: "",
          createdAt: formatLocalDateTime(new Date()),
        },
  });

  const assignedTechnicianIds = form.watch("assignedTechnicianIds");
  const paymentMode = form.watch("paymentMode");
  const hasAssignedTechnicians =
    Array.isArray(assignedTechnicianIds) && assignedTechnicianIds.length > 0;

  useEffect(() => {
    if (hasAssignedTechnicians) {
      form.clearErrors("assignedTechnicianIds");
    }
  }, [hasAssignedTechnicians, form]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setServerError(null);
    setShowPassword(false);

    if (record) {
      const currentTechIds =
        Array.isArray(record.assignedTechnicianIds) &&
        record.assignedTechnicianIds.length > 0
          ? record.assignedTechnicianIds
          : typeof record.assignedTechnicianId === "string" &&
              record.assignedTechnicianId.trim().length > 0
            ? [record.assignedTechnicianId.trim()]
            : [];

      form.reset({
        id: record.id,
        customerName: record.customerName ?? "",
        contactNumber: record.contactNumber ?? "",
        email: record.email ?? "",
        address: record.address ?? "",
        description: record.description ?? "",
        status: record.status ?? "OPEN",
        assignedTechnicianIds: currentTechIds,
        accountUsername: record.accountUsername ?? "",
        accountPassword: record.accountPassword ?? "",
        accountMobile: record.accountMobile ?? "",
        referenceNo: record.referenceNo ?? "",
        paymentMode: record.paymentMode ?? "",
        paymentStatus: record.paymentStatus ?? "PAID",
        amount: record.amount ?? "",
        updatedAt: record.updatedAt
          ? formatLocalDateTime(record.updatedAt)
          : formatLocalDateTime(new Date()),
      });
      return;
    }

    form.reset({
      customerName: "",
      contactNumber: "",
      email: "",
      address: "",
      description: "",
      status: "OPEN",
      assignedTechnicianIds: [],
      accountUsername: "",
      accountPassword: "",
      accountMobile: "",
      referenceNo: "",
      paymentMode: "",
      paymentStatus: "PAID",
      amount: "",
      createdAt: formatLocalDateTime(new Date()),
    });
  }, [open, record, form]);

  const handleOpenChange = (newOpen: boolean) => {
    if (isPending && !newOpen) return;
    onOpenChange(newOpen);
    if (!newOpen) {
      setShowPassword(false);
      setServerError(null);
      if (!isEdit) {
        form.reset({
          customerName: "",
          contactNumber: "",
          email: "",
          address: "",
          description: "",
          status: "OPEN",
          assignedTechnicianIds: [],
          accountUsername: "",
          accountPassword: "",
          accountMobile: "",
          referenceNo: "",
          createdAt: formatLocalDateTime(new Date()),
        });
      }
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    void form.handleSubmit(
      (raw) => {
        setServerError(null);

        const normalizedTechnicianIds: string[] = Array.isArray(
          raw.assignedTechnicianIds,
        )
          ? raw.assignedTechnicianIds.filter(
              (id: unknown): id is string =>
                typeof id === "string" && id.trim().length > 0,
            )
          : typeof raw.assignedTechnicianId === "string" &&
              raw.assignedTechnicianId.trim().length > 0
            ? [raw.assignedTechnicianId.trim()]
            : [];

        const normalizedPassword =
          typeof raw.accountPassword === "string" &&
          raw.accountPassword.trim().length > 0
            ? raw.accountPassword.trim()
            : undefined;

        const payload = {
          ...raw,
          assignedTechnicianIds: normalizedTechnicianIds,
          assignedTechnicianId: normalizedTechnicianIds[0] || "",
          accountPassword: normalizedPassword,
          paymentMode: raw.paymentMode ? raw.paymentMode : null,
          paymentStatus:
            raw.paymentMode === "ONLINE"
              ? raw.paymentStatus || "PAID"
              : raw.paymentMode === "CASH"
                ? "PAID"
                : null,
          amount: raw.paymentMode === "CASH" ? raw.amount || null : null,
        };

        startTransition(async () => {
          try {
            const result = isEdit
              ? await updateInstallation(payload)
              : await createInstallation(payload);

            if (!result.ok) {
              setServerError(
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

            toast.success(
              isEdit ? "Installation updated" : "Installation created",
            );
            handleOpenChange(false);
            if (onSuccess) {
              onSuccess(result.data, isEdit);
            }
            router.refresh();
          } catch (error) {
            console.error("Installation submit failed:", error);
            setServerError(
              "Something went wrong while saving the installation.",
            );
          }
        });
      },
      () => {
        // Validation failed; form.formState.errors updated reactively.
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

  const displayedError = serverError || clientValidationSummary;
  const lockCoreFields = isTechnician && Boolean(record);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {!isEdit
              ? "New Installation Request"
              : `Edit ${record?.recordId ?? "Installation"}`}
          </DialogTitle>
          <DialogDescription>
            {lockCoreFields
              ? "Update the on-site status and account details."
              : "Capture the installation and the account set up on site."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleFormSubmit}
          className="space-y-4"
          noValidate
          autoComplete="off"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {lockCoreFields && record ? (
              <>
                <DetailRow label="Customer Name">
                  {record.customerName}
                </DetailRow>
                <DetailRow label="Contact Number">
                  {record.contactNumber}
                </DetailRow>
                <DetailRow label="Email Address">{record.email}</DetailRow>
                <DetailRow label="S.No / Reference ID">
                  {record.referenceNo ?? "—"}
                </DetailRow>
                <DetailRow label="Address" wide>
                  {record.address}
                </DetailRow>
              </>
            ) : (
              <>
                <Field
                  label="Customer Name"
                  required
                  error={errors.customerName?.message}
                >
                  <Input
                    className="h-9 rounded-md"
                    {...form.register("customerName")}
                  />
                </Field>
                <Field
                  label="Contact Number"
                  required
                  error={errors.contactNumber?.message}
                >
                  <PhoneInput
                    className="h-9 rounded-md"
                    {...form.register("contactNumber")}
                  />
                </Field>
                <Field label="Email Address" error={errors.email?.message}>
                  <Input
                    type="email"
                    className="h-9 rounded-md"
                    {...form.register("email")}
                  />
                </Field>

                <Field
                  label="Address"
                  required
                  className="sm:col-span-2"
                  error={errors.address?.message}
                >
                  <Input
                    className="h-9 rounded-md"
                    {...form.register("address")}
                  />
                </Field>
                <ControlledMultiSelect
                  control={form.control}
                  name="assignedTechnicianIds"
                  label="Assign Technician"
                  placeholder="Select Technician"
                  options={assigneeOptions}
                  hint="Only technicians appear in this list."
                  error={errors.assignedTechnicianIds?.message}
                />
              </>
            )}

            <ControlledSelect
              control={form.control}
              name="status"
              label="Status"
              required
              options={STATUS_OPTIONS}
            />

            {!isEdit && (
              <Field
                label="Created Date & Time"
                required
                className="sm:col-span-1"
                error={errors.createdAt?.message}
              >
                <Input
                  type="datetime-local"
                  className="h-9 rounded-md"
                  {...form.register("createdAt")}
                />
              </Field>
            )}

            {isEdit && (
              <>
                <Field label="Created Date & Time" className="sm:col-span-1">
                  <Input
                    type="text"
                    readOnly
                    disabled
                    value={
                      record?.createdAt ? formatDateTime(record.createdAt) : "—"
                    }
                    className="h-9 rounded-md bg-muted/50 cursor-not-allowed"
                  />
                </Field>

                <Field
                  label="Updated Date & Time"
                  required
                  className="sm:col-span-1"
                  error={errors.updatedAt?.message}
                >
                  <Input
                    type="datetime-local"
                    className="h-9 rounded-md"
                    {...form.register("updatedAt")}
                  />
                </Field>
              </>
            )}

            <Field
              label="Installation Description"
              required
              className="sm:col-span-2"
              error={errors.description?.message}
            >
              <Textarea
                className="min-h-20 rounded-md"
                {...form.register("description")}
              />
            </Field>

            {isEdit && (
              <>
                <div className="border-border mt-2 border-t pt-3 sm:col-span-2">
                  <p className="text-sm font-semibold">
                    ACCOUNT & CREDENTIALS (EDIT MODE)
                  </p>
                  <p className="text-muted-foreground text-xs">
                    The login set up for the customer on site.
                  </p>
                </div>

                <Field label="Username" error={errors.accountUsername?.message}>
                  <Input
                    className="h-9 rounded-md"
                    autoComplete="off"
                    {...form.register("accountUsername")}
                  />
                </Field>
                <Field
                  label="Password"
                  error={errors.accountPassword?.message}
                  hint="Leave blank to keep the existing password."
                >
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      className="h-9 rounded-md pr-9"
                      autoComplete="new-password"
                      {...form.register("accountPassword")}
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
                  label="Mobile Number"
                  error={errors.accountMobile?.message}
                >
                  <PhoneInput
                    className="h-9 rounded-md"
                    {...form.register("accountMobile")}
                  />
                </Field>
                <Field
                  label="S.No / Reference ID"
                  error={errors.referenceNo?.message}
                  hint="Record sequence reference, e.g. INS-1001"
                >
                  <Input
                    className="h-9 rounded-md"
                    {...form.register("referenceNo")}
                  />
                </Field>

                <div className="border-border mt-2 border-t pt-3 sm:col-span-2">
                  <p className="text-sm font-semibold">
                    CUSTOMER PAYMENT DETAILS
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Customer payment mode and transaction details for this
                    installation.
                  </p>
                </div>

                <ControlledSelect
                  control={form.control}
                  name="paymentMode"
                  label="Payment Mode"
                  placeholder="Select Payment Mode"
                  options={PAYMENT_MODE_OPTIONS}
                  error={errors.paymentMode?.message}
                />

                {paymentMode === "ONLINE" && (
                  <ControlledSelect
                    control={form.control}
                    name="paymentStatus"
                    label="Payment Status"
                    placeholder="Select Status"
                    options={PAYMENT_STATUS_OPTIONS}
                    error={errors.paymentStatus?.message}
                  />
                )}

                {paymentMode === "CASH" && (
                  <Field
                    label="Cash Amount (₹)"
                    required
                    error={errors.amount?.message}
                  >
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 25000"
                      className="h-9 rounded-md"
                      {...form.register("amount")}
                    />
                  </Field>
                )}
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
              {!isEdit ? "Create Installation" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { InstallationFormDialog };
