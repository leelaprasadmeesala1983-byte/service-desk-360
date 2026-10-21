"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";

import { CustomerModeSwitcher } from "@/components/service-tickets/customer-mode-switcher";
import { CustomerSelectField } from "@/components/service-tickets/customer-select-field";
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
import { Textarea } from "@/components/ui/textarea";
import type { ProjectRow } from "@/db/queries/projects";
import { createProject, updateProject } from "@/lib/actions/projects";
import { RECORD_STATUS_LABELS, type UserRole } from "@/lib/constants";
import { formatDateTime, formatLocalDateTime } from "@/lib/format";
import { UNASSIGNED_VALUE } from "@/lib/service-ticket";
import { cn } from "@/lib/utils";
import {
  createProjectSchema,
  editProjectSchema,
  technicianProjectSchema,
} from "@/lib/validations/service-ticket";

type ProjectFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerRole: UserRole;
  technicians: { id: string; name: string }[];
  record?: ProjectRow;
  onSuccess?: (savedRecord: ProjectRow, isEdit: boolean) => void;
};

const STATUS_OPTIONS = (["OPEN", "IN_PROGRESS", "CLOSED"] as const).map(
  (value) => ({
    value,
    label: RECORD_STATUS_LABELS[value],
  }),
);

function ProjectFormDialog({
  open,
  onOpenChange,
  viewerRole,
  technicians,
  record,
  onSuccess,
}: ProjectFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(record);
  const isTechnician = viewerRole === "TECHNICIAN";
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [isNewCustomerMode, setIsNewCustomerMode] = useState(false);

  const schema = !isEdit
    ? createProjectSchema
    : isTechnician
      ? technicianProjectSchema
      : editProjectSchema;

  const assigneeOptions = technicians.map((tech) => ({
    value: tech.id,
    label: tech.name,
  }));

  const initialAssignedIds = record
    ? Array.isArray(record.assignedTechnicianIds) &&
      record.assignedTechnicianIds.length > 0
      ? record.assignedTechnicianIds
      : record.assignedTechnicianId &&
          record.assignedTechnicianId !== UNASSIGNED_VALUE
        ? [record.assignedTechnicianId]
        : []
    : [];

  // biome-ignore lint/suspicious/noExplicitAny: one form drives three schemas
  const form = useForm<any>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver bridges the three schemas
    resolver: zodResolver(schema as any) as Resolver<any>,
    defaultValues: record
      ? {
          id: record.id,
          customerId: (record as any).customerId ?? "",
          companyName: record.companyName,
          customerName: record.customerName,
          email: record.email,
          mobileNo: record.mobileNo,
          location: record.location,
          estimationNo: record.estimationNo,
          description: record.description,
          status: record.status,
          assignedTechnicianIds: initialAssignedIds,
          updatedAt: record.updatedAt
            ? formatLocalDateTime(record.updatedAt)
            : formatLocalDateTime(new Date()),
        }
      : {
          customerId: "",
          companyName: "",
          customerName: "",
          email: "",
          mobileNo: "",
          location: "",
          estimationNo: "",
          description: "",
          status: "OPEN",
          assignedTechnicianIds: [],
          createdAt: formatLocalDateTime(new Date()),
        },
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    setSelectedCustomerId(null);
    setIsNewCustomerMode(false);

    const assignedIds = record
      ? Array.isArray(record.assignedTechnicianIds) &&
        record.assignedTechnicianIds.length > 0
        ? record.assignedTechnicianIds
        : record.assignedTechnicianId &&
            record.assignedTechnicianId !== UNASSIGNED_VALUE
          ? [record.assignedTechnicianId]
          : []
      : [];

    form.reset(
      record
        ? {
            id: record.id,
            customerId: (record as any).customerId ?? "",
            companyName: record.companyName,
            customerName: record.customerName,
            email: record.email,
            mobileNo: record.mobileNo,
            location: record.location,
            estimationNo: record.estimationNo,
            description: record.description,
            status: record.status,
            assignedTechnicianIds: assignedIds,
            updatedAt: record.updatedAt
              ? formatLocalDateTime(record.updatedAt)
              : formatLocalDateTime(new Date()),
          }
        : {
            customerId: "",
            companyName: "",
            customerName: "",
            email: "",
            mobileNo: "",
            location: "",
            estimationNo: "",
            description: "",
            status: "OPEN",
            assignedTechnicianIds: [],
            createdAt: formatLocalDateTime(new Date()),
          },
    );
  }, [open, record, form]);

  const handleAddNewCustomer = (initialSearch?: string) => {
    setIsNewCustomerMode(true);
    setSelectedCustomerId(null);
    form.setValue("customerId", "");

    const raw = initialSearch?.trim() || "";
    const digits = raw.replace(/\D/g, "");
    const isNumeric = digits.length >= 7 || /^\d+$/.test(raw);

    if (isNumeric) {
      form.setValue("mobileNo", digits.slice(0, 10), {
        shouldValidate: true,
      });
      form.setValue("customerName", "", { shouldValidate: false });
    } else if (raw) {
      form.setValue("customerName", raw, { shouldValidate: true });
      form.setValue("mobileNo", "", { shouldValidate: false });
    } else {
      form.setValue("mobileNo", "");
      form.setValue("customerName", "");
    }
    form.setValue("email", "");
    form.setValue("location", "");

    form.clearErrors(["mobileNo", "customerName", "email", "location"]);
  };

  const handleReturnToExistingCustomer = () => {
    setIsNewCustomerMode(false);
    setSelectedCustomerId(null);
    form.setValue("customerId", "");
    form.setValue("mobileNo", "");
    form.setValue("customerName", "");
    form.setValue("email", "");
    form.setValue("location", "");

    form.clearErrors(["mobileNo", "customerName", "email", "location"]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (isPending && !newOpen) return;
    onOpenChange(newOpen);
    if (!newOpen) {
      setServerError(null);
      setIsNewCustomerMode(false);
    }
  };

  const submit = (event?: React.BaseSyntheticEvent) => {
    if (isPending) return;
    form.handleSubmit(
      (raw) => {
        setServerError(null);
        const payload = {
          ...raw,
          customerId: selectedCustomerId || raw.customerId || undefined,
          customerName: form.getValues("customerName") || raw.customerName,
          mobileNo: form.getValues("mobileNo") || raw.mobileNo,
          email: form.getValues("email") || raw.email,
          location: form.getValues("location") || raw.location,
          assignedTechnicianIds: Array.isArray(raw.assignedTechnicianIds)
            ? raw.assignedTechnicianIds
            : [],
        };

        startTransition(async () => {
          try {
            const result = isEdit
              ? await updateProject(payload)
              : await createProject(payload);

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

            if (result.data) {
              onSuccess?.(result.data, isEdit);
            }
            toast.success(isEdit ? "Project updated" : "Project created");
            handleOpenChange(false);
            router.refresh();
          } catch (error) {
            console.error("Project submit failed:", error);
            setServerError("Something went wrong while saving the project.");
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
  const statusOnly = isTechnician && Boolean(record);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {!isEdit ? "New Project" : `Edit ${record?.recordId ?? "Project"}`}
          </DialogTitle>
          <DialogDescription>
            {statusOnly
              ? "You can move the status on projects assigned to you."
              : "Capture the project scope and assign a technician."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            {statusOnly && record ? (
              <>
                <DetailRow label="Company Name">{record.companyName}</DetailRow>
                <DetailRow label="Customer Name">
                  {record.customerName}
                </DetailRow>
                <DetailRow label="Email Address">{record.email}</DetailRow>
                <DetailRow label="Mobile Number">{record.mobileNo}</DetailRow>
                <DetailRow label="Estimation No">
                  {record.estimationNo}
                </DetailRow>
                <DetailRow label="Location">{record.location}</DetailRow>
                <DetailRow label="Description" wide>
                  {record.description}
                </DetailRow>
                <ControlledSelect
                  control={form.control}
                  name="status"
                  label="Status"
                  required
                  options={STATUS_OPTIONS}
                />
              </>
            ) : (
              <>
                {!isEdit && (
                  <CustomerModeSwitcher
                    isNewCustomer={isNewCustomerMode}
                    onModeChange={(mode) =>
                      mode === "new"
                        ? handleAddNewCustomer()
                        : handleReturnToExistingCustomer()
                    }
                  />
                )}

                {/* Row 1: Mobile Number & Customer Name */}
                <Field
                  label="Mobile Number"
                  required
                  error={errors.mobileNo?.message}
                >
                  {isNewCustomerMode ? (
                    <Input
                      id="mobileNo"
                      type="tel"
                      maxLength={10}
                      autoFocus
                      placeholder="Enter 10-digit mobile number"
                      className="h-10 rounded-lg text-sm"
                      {...form.register("mobileNo", {
                        onChange: (e) => {
                          const cleaned = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
                          form.setValue("mobileNo", cleaned, {
                            shouldValidate: true,
                          });
                        },
                      })}
                    />
                  ) : (
                    <CustomerSelectField
                      id="mobileNo"
                      value={form.watch("mobileNo") ?? ""}
                      selectedCustomerId={selectedCustomerId}
                      placeholder="Enter or select mobile number"
                      autoSelectIfSingle={!isEdit}
                      parentOpen={open}
                      onAddNewCustomer={handleAddNewCustomer}
                      onNoCustomers={() => setIsNewCustomerMode(true)}
                      onChange={(val) =>
                        form.setValue("mobileNo", val, {
                          shouldValidate: true,
                        })
                      }
                      onCustomerSelect={(cust) => {
                        setSelectedCustomerId(cust.id);
                        form.setValue("customerId", cust.id);
                        form.setValue("mobileNo", cust.mobileNumber, {
                          shouldValidate: true,
                        });
                        form.setValue("customerName", cust.customerName, {
                          shouldValidate: true,
                        });
                        form.setValue("email", cust.email || "", {
                          shouldValidate: true,
                        });
                        form.setValue(
                          "location",
                          cust.address && cust.address !== "—"
                            ? cust.address
                            : "",
                          {
                            shouldValidate: true,
                          },
                        );
                      }}
                      onClear={() => {
                        setSelectedCustomerId(null);
                        form.setValue("customerId", "");
                        form.setValue("mobileNo", "", {
                          shouldValidate: true,
                        });
                        form.setValue("customerName", "", {
                          shouldValidate: true,
                        });
                        form.setValue("email", "", {
                          shouldValidate: true,
                        });
                        form.setValue("location", "", {
                          shouldValidate: true,
                        });
                      }}
                      hasError={Boolean(errors.mobileNo)}
                    />
                  )}
                </Field>

                <Field
                  label="Customer Name"
                  required
                  error={errors.customerName?.message}
                >
                  <Input
                    id="customerName"
                    autoComplete="name"
                    className="h-10 rounded-lg text-sm"
                    placeholder="Enter customer name"
                    {...form.register("customerName")}
                  />
                </Field>

                {/* Row 2: Email Address & Company Name */}
                <Field label="Email Address" error={errors.email?.message}>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="h-10 rounded-lg text-sm"
                    placeholder="Enter email address (optional)"
                    {...form.register("email")}
                  />
                </Field>

                <Field
                  label="Company Name"
                  required
                  error={errors.companyName?.message}
                >
                  <Input
                    id="companyName"
                    className="h-10 rounded-lg text-sm"
                    placeholder="Enter company name"
                    {...form.register("companyName")}
                  />
                </Field>

                {/* Row 3: Location / Customer Address (spans full width) */}
                <Field
                  label="Location"
                  required
                  className="sm:col-span-2"
                  error={errors.location?.message}
                >
                  <Input
                    id="location"
                    autoComplete="street-address"
                    className="h-10 rounded-lg text-sm"
                    placeholder="Enter location / customer address"
                    {...form.register("location")}
                  />
                </Field>

                {/* Row 4: Assign Technician & Status */}
                <ControlledMultiSelect
                  control={form.control}
                  name="assignedTechnicianIds"
                  label="Assign Technician"
                  placeholder="Select Technician"
                  options={assigneeOptions}
                  error={errors.assignedTechnicianIds?.message}
                />

                <ControlledSelect
                  control={form.control}
                  name="status"
                  label="Status"
                  required
                  options={STATUS_OPTIONS}
                />
                <Field
                  label="Estimation No"
                  required
                  error={errors.estimationNo?.message}
                >
                  <Input
                    className="h-10 rounded-lg text-sm"
                    placeholder="Enter estimation number"
                    {...form.register("estimationNo")}
                  />
                </Field>

                {!isEdit && (
                  <Field
                    label="Created Date & Time"
                    required
                    className="sm:col-span-1"
                    error={errors.createdAt?.message}
                  >
                    <Input
                      type="datetime-local"
                      className="h-10 rounded-lg text-sm"
                      {...form.register("createdAt")}
                    />
                  </Field>
                )}

                <Field
                  label="Description"
                  required
                  className="sm:col-span-2"
                  error={errors.description?.message}
                >
                  <Textarea
                    className="min-h-20 rounded-md"
                    {...form.register("description")}
                  />
                </Field>
              </>
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
              {!isEdit ? "Create Project" : "Update Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ProjectFormDialog };
