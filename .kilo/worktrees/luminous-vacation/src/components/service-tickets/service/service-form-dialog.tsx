"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useState,
  useTransition,
} from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";

import { DetailRow } from "@/components/service-tickets/detail-row";
import {
  ControlledMultiSelect,
  ControlledSelect,
  Field,
} from "@/components/service-tickets/form";
import { StatusBadge } from "@/components/service-tickets/status-badge";
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

import type { ServiceRequestRow } from "@/db/queries/service-requests";

import {
  createServiceRequest,
  updateServiceRequest,
} from "@/lib/actions/service-requests";

import {
  RECORD_STATUS_LABELS,
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_LABELS,
  type UserRole,
} from "@/lib/constants";

import {
  createServiceRequestSchema,
  editServiceRequestSchema,
  technicianServiceRequestSchema,
} from "@/lib/validations/service-ticket";

type TechnicianOption = {
  id: string;
  name: string;
};

type ServiceFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewerRole: UserRole;
  technicians: TechnicianOption[];
  record?: ServiceRequestRow;
};

const CATEGORY_OPTIONS = SERVICE_CATEGORIES.map((value) => ({
  value,
  label: SERVICE_CATEGORY_LABELS[value],
}));

const STATUS_OPTIONS = [
  {
    value: "OPEN",
    label: RECORD_STATUS_LABELS.OPEN,
  },
  {
    value: "IN_PROGRESS",
    label: RECORD_STATUS_LABELS.IN_PROGRESS,
  },
  {
    value: "CLOSED",
    label: RECORD_STATUS_LABELS.CLOSED,
  },
];

function ServiceFormDialog({
  open,
  onOpenChange,
  viewerRole,
  technicians,
  record,
}: ServiceFormDialogProps) {
  const router = useRouter();

  const isEdit = Boolean(record);
  const isTechnician = viewerRole === "TECHNICIAN";

  const [isPending, startTransition] = useTransition();

  const [serverError, setServerError] = useState<string | null>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(
    typeof record?.imageUrl === "string" && record.imageUrl.trim().length > 0
      ? record.imageUrl
      : null,
  );

  const [imageFileName, setImageFileName] = useState<string | null>(null);

  const [imageMessage, setImageMessage] = useState<string | null>(null);

  /*
   * Select the correct validation schema.
   */
  const schema = !isEdit
    ? createServiceRequestSchema
    : isTechnician
      ? technicianServiceRequestSchema
      : editServiceRequestSchema;

  /*
   * Technician dropdown options.
   *
   * IMPORTANT:
   * - Do not add "Unassigned" here.
   * - An empty form value is represented by the placeholder "Select Technician".
   * - Technician names/IDs come from the `technicians` prop, so the list
   *   remains dynamic and is never hard-coded in this component.
   */
  const assigneeOptions = Array.isArray(technicians)
    ? technicians
        .filter(
          (tech): tech is TechnicianOption =>
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
          phone: record.phone ?? "",
          email: record.email ?? "",
          category: record.category ?? "GENERAL_SUPPORT",
          address: record.address ?? "",
          issueTitle: record.issueTitle ?? "",
          description: record.description ?? "",
          status: record.status ?? "OPEN",
          assignedTechnicianIds: initialTechnicianIds,
          /*
           * Empty amount should remain an empty string in the UI.
           */
          amount:
            record.amount !== null && record.amount !== undefined
              ? String(record.amount)
              : "",
          /*
           * Never put null into RHF.
           */
          closedDescription: record.closedDescription ?? "",
          /*
           * Never put null into RHF.
           */
          imageUrl: record.imageUrl ?? "",
        }
      : {
          customerName: "",
          phone: "",
          email: "",
          category: "GENERAL_SUPPORT",
          address: "",
          issueTitle: "",
          description: "",
          status: "OPEN",
          assignedTechnicianIds: [],
          amount: "",
          closedDescription: "",
          imageUrl: "",
        },
  });

  const assignedTechnicianIds = form.watch("assignedTechnicianIds");
  const hasAssignedTechnicians =
    Array.isArray(assignedTechnicianIds) && assignedTechnicianIds.length > 0;

  useEffect(() => {
    if (hasAssignedTechnicians) {
      form.clearErrors("assignedTechnicianIds");
    }
  }, [hasAssignedTechnicians, form]);

  /*
   * Reset the form whenever a different record is opened.
   *
   * This prevents old edit values from remaining in another request.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    setServerError(null);
    setImageMessage(null);

    if (record) {
      const imageUrl =
        typeof record.imageUrl === "string" && record.imageUrl.trim().length > 0
          ? record.imageUrl
          : "";

      const currentTechIds =
        Array.isArray(record.assignedTechnicianIds) &&
        record.assignedTechnicianIds.length > 0
          ? record.assignedTechnicianIds
          : typeof record.assignedTechnicianId === "string" &&
              record.assignedTechnicianId.trim().length > 0
            ? [record.assignedTechnicianId.trim()]
            : [];

      setImagePreview(imageUrl || null);
      setImageFileName(
        imageUrl
          ? typeof record.imageUrl === "string" &&
            record.imageUrl.startsWith("data:image/")
            ? "service-request-image"
            : record.recordId || "service-request-image"
          : null,
      );

      form.reset({
        id: record.id,
        customerName: record.customerName ?? "",
        phone: record.phone ?? "",
        email: record.email ?? "",
        category: record.category ?? "GENERAL_SUPPORT",
        address: record.address ?? "",
        issueTitle: record.issueTitle ?? "",
        description: record.description ?? "",
        status: record.status ?? "OPEN",
        assignedTechnicianIds: currentTechIds,
        amount:
          record.amount !== null && record.amount !== undefined
            ? String(record.amount)
            : "",
        closedDescription: record.closedDescription ?? "",
        imageUrl,
      });

      return;
    }

    setImagePreview(null);
    setImageFileName(null);

    form.reset({
      customerName: "",
      phone: "",
      email: "",
      category: "GENERAL_SUPPORT",
      address: "",
      issueTitle: "",
      description: "",
      status: "OPEN",
      assignedTechnicianIds: [],
      amount: "",
      closedDescription: "",
      imageUrl: "",
    });
  }, [open, record, form]);

  /*
   * Image upload handler.
   */
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

    if (!allowedTypes.has(file.type)) {
      setImageMessage("Unsupported image type. Use JPG, JPEG, PNG, or WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setImageMessage("Image must be 2MB or smaller.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string" || !result) {
        setImageMessage("Unable to read the selected image.");
        return;
      }

      setImagePreview(result);
      setImageFileName(file.name || "service-request-image");
      setImageMessage(null);

      /*
       * Image is optional.
       * If selected, save the data URL as string.
       */
      form.setValue("imageUrl", result, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    };

    reader.onerror = () => {
      setImageMessage("Unable to read the selected image.");
    };

    reader.readAsDataURL(file);
  };

  /*
   * Remove image.
   */
  const removeImage = () => {
    setImagePreview(null);
    setImageFileName(null);
    setImageMessage(null);

    form.setValue("imageUrl", "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  /*
   * Submit handler.
   */
  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    void form.handleSubmit(
      (raw) => {
        setServerError(null);

        /*
         * Normalize amount.
         * Empty amount is optional and must not be sent as "" / null.
         */
        let normalizedAmount: number | undefined;

        if (
          raw.amount !== null &&
          raw.amount !== undefined &&
          String(raw.amount).trim() !== ""
        ) {
          const numericAmount = Number(raw.amount);

          if (Number.isFinite(numericAmount)) {
            normalizedAmount = numericAmount;
          }
        }

        /*
         * Normalize optional text fields.
         */
        const normalizedClosedDescription =
          typeof raw.closedDescription === "string"
            ? raw.closedDescription.trim()
            : "";

        /*
         * Normalize image URL.
         * null / undefined => ""
         */
        const normalizedImageUrl =
          typeof raw.imageUrl === "string" ? raw.imageUrl : "";

        /*
         * Normalize technician IDs.
         */
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

        const payload = {
          ...raw,
          id: raw.id,
          assignedTechnicianIds: normalizedTechnicianIds,
          assignedTechnicianId: normalizedTechnicianIds[0] || "",
          amount: normalizedAmount,
          closedDescription: normalizedClosedDescription,
          imageUrl: normalizedImageUrl,
        };

        startTransition(async () => {
          try {
            const result = isEdit
              ? await updateServiceRequest(payload)
              : await createServiceRequest(payload);

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
              isEdit
                ? "Request updated successfully"
                : "Request created successfully",
            );

            onOpenChange(false);
            router.refresh();
          } catch (error) {
            console.error("Service request submit failed:", error);

            setServerError("Something went wrong while saving the request.");
          }
        });
      },
      () => {
        // Validation failed; form.formState.errors is updated by RHF.
        // The validation banner is reactively derived from formState.errors below.
      },
    )(event);
  };

  const errors = form.formState.errors as Record<
    string,
    { message?: string } | undefined
  >;

  /*
   * Derive the validation error banner:
   * - Only visible when the user attempted to submit (submitCount > 0) AND there are unresolved client validation errors.
   * - Automatically disappears as soon as ALL validation errors are resolved.
   * - Differentiated from genuine server/API errors.
   */
  const hasClientValidationErrors =
    Object.keys(form.formState.errors).length > 0;
  const clientValidationSummary =
    form.formState.submitCount > 0 && hasClientValidationErrors
      ? "Please correct the highlighted fields."
      : null;

  const displayedError = serverError || clientValidationSummary;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        /*
         * Don't allow accidental closing while submitting.
         */
        if (isPending && !nextOpen) {
          return;
        }

        onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        className="
          w-[calc(100vw-2rem)]
          max-w-3xl
          max-h-[90vh]
          overflow-y-auto
          p-4
          sm:p-6
        "
      >
        <DialogHeader>
          <DialogTitle>
            {!isEdit
              ? "New Service Request"
              : `Edit ${record?.recordId ?? "Service Request"}`}
          </DialogTitle>

          <DialogDescription>
            {isTechnician
              ? "You can update the work outcome fields on requests assigned to you."
              : "Capture the customer's issue and assign a technician."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            {isTechnician && record ? (
              <>
                <DetailRow label="Customer Name">
                  {record.customerName}
                </DetailRow>

                <DetailRow label="Phone Number">{record.phone}</DetailRow>

                <DetailRow label="Email Address">
                  {record.email || "—"}
                </DetailRow>

                <DetailRow label="Category">
                  {SERVICE_CATEGORY_LABELS[record.category]}
                </DetailRow>

                <DetailRow label="Customer Address" wide>
                  {record.address}
                </DetailRow>

                <DetailRow label="Issue Title" wide>
                  {record.issueTitle}
                </DetailRow>

                <DetailRow label="Issue Description" wide>
                  {record.description}
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
                    className="h-10 rounded-md"
                    {...form.register("customerName")}
                  />
                </Field>

                <Field
                  label="Phone Number"
                  required
                  error={errors.phone?.message}
                >
                  <PhoneInput
                    className="h-10 rounded-md"
                    {...form.register("phone")}
                  />
                </Field>

                <Field label="Email Address" error={errors.email?.message}>
                  <Input
                    type="email"
                    className="h-10 rounded-md"
                    {...form.register("email")}
                  />
                </Field>

                <ControlledSelect
                  control={form.control}
                  name="category"
                  label="Category"
                  required
                  options={CATEGORY_OPTIONS}
                />

                <Field
                  label="Customer Address"
                  required
                  className="sm:col-span-2"
                  error={errors.address?.message}
                >
                  <Input
                    className="h-10 rounded-md"
                    {...form.register("address")}
                  />
                </Field>

                <Field
                  label="Issue Title"
                  required
                  className="sm:col-span-2"
                  error={errors.issueTitle?.message}
                >
                  <Input
                    className="h-10 rounded-md"
                    {...form.register("issueTitle")}
                  />
                </Field>

                <ControlledMultiSelect
                  control={form.control}
                  name="assignedTechnicianIds"
                  label="Assign Technician"
                  required
                  options={assigneeOptions}
                  placeholder="Select Technician"
                  className="sm:col-span-1"
                  error={errors.assignedTechnicianIds?.message}
                />

                <ControlledSelect
                  control={form.control}
                  name="status"
                  label="Status"
                  required
                  options={STATUS_OPTIONS}
                  className="sm:col-span-1"
                />

                <Field
                  label="Issue Description"
                  required
                  className="sm:col-span-2"
                  error={errors.description?.message}
                >
                  <Textarea
                    className="min-h-24 rounded-md"
                    {...form.register("description")}
                  />
                </Field>
              </>
            )}

            {isEdit && !isTechnician && (
              <DetailRow label="Status">
                {record && <StatusBadge status={record.status} />}

                <span className="mt-1 block text-xs text-muted-foreground">
                  Updated by the assigned technician.
                </span>
              </DetailRow>
            )}

            {isEdit && (
              <>
                <Field
                  label="Amount (₹)"
                  error={errors.amount?.message}
                  hint="Optional. Filled in as the work is carried out."
                >
                  <Input
                    inputMode="decimal"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter amount"
                    className="h-10 rounded-md"
                    {...form.register("amount", {
                      setValueAs: (value) => {
                        if (
                          value === "" ||
                          value === null ||
                          value === undefined
                        ) {
                          return undefined;
                        }

                        const numericValue = Number(value);

                        return Number.isFinite(numericValue)
                          ? numericValue
                          : value;
                      },
                    })}
                  />
                </Field>

                <Field
                  label="Attach Image"
                  className="sm:col-span-2"
                  error={errors.imageUrl?.message ?? imageMessage ?? undefined}
                >
                  <div className="space-y-3">
                    {!imagePreview ? (
                      <label
                        htmlFor="service-image-upload"
                        className="
                          border-border
                          bg-muted/20
                          hover:bg-muted/40
                          flex
                          min-h-32
                          w-full
                          cursor-pointer
                          flex-col
                          items-center
                          justify-center
                          rounded-md
                          border
                          border-dashed
                          p-4
                          text-center
                          transition
                        "
                      >
                        <Upload className="mb-2 size-5" />

                        <span className="text-sm font-medium">
                          Upload Image
                        </span>

                        <span className="text-xs text-muted-foreground">
                          Click to upload or drag image
                        </span>

                        <span className="mt-1 text-[11px] text-muted-foreground">
                          JPG, PNG or WEBP • Max 2MB
                        </span>

                        <input
                          id="service-image-upload"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="sr-only"
                          onChange={handleImageChange}
                          disabled={isPending}
                        />
                      </label>
                    ) : (
                      <div className="space-y-2">
                        <div className="relative w-full max-w-[240px] overflow-hidden rounded-lg border bg-muted/20">
                          <img
                            src={imagePreview}
                            alt="Service request attachment"
                            className="h-40 w-full object-contain"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="min-w-0 truncate text-xs text-muted-foreground">
                            {imageFileName || "service-request-image"}
                          </span>

                          <button
                            type="button"
                            onClick={removeImage}
                            disabled={isPending}
                            className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </Field>

                <Field
                  label="Resolution / Closed Description"
                  className="sm:col-span-2"
                  error={errors.closedDescription?.message}
                  hint="Optional while the request is open or in progress."
                >
                  <Textarea
                    className="min-h-24 rounded-md"
                    placeholder="Enter resolution details"
                    {...form.register("closedDescription")}
                  />
                </Field>
              </>
            )}
          </div>

          {displayedError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {displayedError}
            </p>
          )}

          <div
            className="
              flex
              flex-col-reverse
              gap-2
              pt-2
              sm:flex-row
              sm:justify-end
            "
          >
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

              {!isEdit ? "Submit Ticket" : "Update Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { ServiceFormDialog };
