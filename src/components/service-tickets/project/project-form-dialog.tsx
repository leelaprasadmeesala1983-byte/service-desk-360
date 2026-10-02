"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import type { ProjectRow } from "@/db/queries/projects";
import { createProject, updateProject } from "@/lib/actions/projects";
import { RECORD_STATUS_LABELS, type UserRole } from "@/lib/constants";
import { UNASSIGNED_VALUE } from "@/lib/service-ticket";
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
          companyName: record.companyName,
          customerName: record.customerName,
          email: record.email,
          mobileNo: record.mobileNo,
          location: record.location,
          estimationNo: record.estimationNo,
          description: record.description,
          status: record.status,
          assignedTechnicianIds: initialAssignedIds,
        }
      : {
          companyName: "",
          customerName: "",
          email: "",
          mobileNo: "",
          location: "",
          estimationNo: "",
          description: "",
          status: "OPEN",
          assignedTechnicianIds: [],
        },
  });

  useEffect(() => {
    if (!open) return;
    setServerError(null);

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
            companyName: record.companyName,
            customerName: record.customerName,
            email: record.email,
            mobileNo: record.mobileNo,
            location: record.location,
            estimationNo: record.estimationNo,
            description: record.description,
            status: record.status,
            assignedTechnicianIds: assignedIds,
          }
        : {
            companyName: "",
            customerName: "",
            email: "",
            mobileNo: "",
            location: "",
            estimationNo: "",
            description: "",
            status: "OPEN",
            assignedTechnicianIds: [],
          },
    );
  }, [open, record, form]);

  const submit = form.handleSubmit((raw) => {
    setServerError(null);
    const payload = {
      ...raw,
      assignedTechnicianIds: Array.isArray(raw.assignedTechnicianIds)
        ? raw.assignedTechnicianIds
        : [],
    };

    startTransition(async () => {
      const result = isEdit
        ? await updateProject(payload)
        : await createProject(payload);

      if (!result.ok) {
        setServerError(result.error);
        for (const [key, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          if (messages?.[0]) form.setError(key, { message: messages[0] });
        }
        return;
      }

      if (result.data) {
        onSuccess?.(result.data, isEdit);
      }
      toast.success(isEdit ? "Project updated" : "Project created");
      onOpenChange(false);
      router.refresh();
    });
  });

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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                <DetailRow label="Mobile No">{record.mobileNo}</DetailRow>
                <DetailRow label="Estimation No">
                  {record.estimationNo}
                </DetailRow>
                <DetailRow label="Location">{record.location}</DetailRow>
                <DetailRow label="Description" wide>
                  {record.description}
                </DetailRow>
              </>
            ) : (
              <>
                <Field
                  label="Company Name"
                  required
                  error={errors.companyName?.message}
                >
                  <Input
                    className="h-9 rounded-md"
                    {...form.register("companyName")}
                  />
                </Field>
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
                <Field label="Email Address" error={errors.email?.message}>
                  <Input
                    type="email"
                    className="h-9 rounded-md"
                    {...form.register("email")}
                  />
                </Field>
                <Field
                  label="Mobile No"
                  required
                  error={errors.mobileNo?.message}
                >
                  <PhoneInput
                    className="h-9 rounded-md"
                    {...form.register("mobileNo")}
                  />
                </Field>

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
                  label="Location"
                  required
                  error={errors.location?.message}
                >
                  <Input
                    className="h-9 rounded-md"
                    {...form.register("location")}
                  />
                </Field>
                <Field
                  label="Estimation No"
                  required
                  error={errors.estimationNo?.message}
                >
                  <Input
                    className="h-9 rounded-md"
                    {...form.register("estimationNo")}
                  />
                </Field>

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
              {!isEdit ? "Create Project" : "Update Project"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ProjectFormDialog };
