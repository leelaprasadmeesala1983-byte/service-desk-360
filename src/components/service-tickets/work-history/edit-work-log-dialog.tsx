"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useTransition } from "react";
import { type Resolver, useForm } from "react-hook-form";
import { toast } from "sonner";

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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WorkHistoryItem } from "@/db/queries/work-history";
import { updateWorkHistory } from "@/lib/actions/work-history";
import { RECORD_STATUS_LABELS, type RecordStatus } from "@/lib/constants";
import {
  type EditWorkHistoryValues,
  editWorkHistorySchema,
} from "@/lib/validations/work-history";

type EditWorkLogDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: WorkHistoryItem;
  technicians: { id: string; name: string }[];
  parentStatus?: RecordStatus | string;
  onUpdated?: () => void;
};

const STATUS_OPTIONS = [
  { value: "OPEN", label: RECORD_STATUS_LABELS.OPEN },
  { value: "IN_PROGRESS", label: RECORD_STATUS_LABELS.IN_PROGRESS },
  { value: "CLOSED", label: RECORD_STATUS_LABELS.CLOSED },
  { value: "REJECTED", label: RECORD_STATUS_LABELS.REJECTED },
];

export function EditWorkLogDialog({
  open,
  onOpenChange,
  entry,
  technicians,
  parentStatus,
  onUpdated,
}: EditWorkLogDialogProps) {
  const [isPending, startTransition] = useTransition();

  const techOptions = [
    ...technicians,
    ...(entry?.technicians ?? []).filter(
      (t) => !technicians.some((active) => active.id === t.id),
    ),
  ].map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const form = useForm<EditWorkHistoryValues>({
    resolver: zodResolver(
      editWorkHistorySchema,
    ) as Resolver<EditWorkHistoryValues>,
    defaultValues: {
      id: entry?.id ?? "",
      technicianIds: entry?.technicianIds ?? [],
      workDate: entry?.workDate ?? new Date().toISOString().split("T")[0],
      workDateTime: entry?.workDateTime
        ? new Date(entry.workDateTime).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16),
      status: entry?.status ?? "IN_PROGRESS",
      description: entry?.description ?? "",
      attachments: entry?.attachments ?? [],
    },
  });

  useEffect(() => {
    if (entry) {
      const dt = new Date(entry.workDateTime);
      // Format local datetime string YYYY-MM-DDTHH:mm
      const localIso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      form.reset({
        id: entry.id,
        technicianIds: entry.technicianIds,
        workDate: entry.workDate,
        workDateTime: localIso,
        status: entry.status,
        description: entry.description,
        attachments: entry.attachments ?? [],
      });
    }
  }, [entry, form]);

  const currentStatus = form.watch("status");
  const normFormStatus = String(currentStatus || "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, "");
  const isStatusBlocked = normFormStatus === "OPEN";

  const onSubmit = (values: EditWorkHistoryValues) => {
    const rawStatus = String(values.status || "")
      .trim()
      .toUpperCase()
      .replace(/[\s_-]+/g, "");
    if (rawStatus === "OPEN") {
      toast.error(
        "Log Request is available only for In Progress or Closed records.",
      );
      return;
    }

    startTransition(async () => {
      const res = await updateWorkHistory(values);
      if (!res.ok) {
        toast.error(res.error || "Failed to update work log");
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            if (v?.[0]) {
              form.setError(k as keyof EditWorkHistoryValues, {
                message: v[0],
              });
            }
          }
        }
        return;
      }

      toast.success("Work log updated successfully");
      onOpenChange(false);
      onUpdated?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Edit Work Log</DialogTitle>
          <DialogDescription>
            Modify technician assignments, date, status, or remarks for this
            session.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <ControlledMultiSelect
            control={form.control}
            name="technicianIds"
            label="Assigned Technician(s)"
            options={techOptions}
            required
            placeholder="Select technician(s)"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field
              label="Work Date"
              required
              error={form.formState.errors.workDate?.message}
            >
              <Input
                type="date"
                {...form.register("workDate", {
                  onChange: (e) => {
                    const val = e.target.value;
                    const curDt = form.getValues("workDateTime");
                    const timePart =
                      curDt && curDt.includes("T")
                        ? curDt.split("T")[1]
                        : "12:00";
                    if (val) {
                      form.setValue("workDateTime", `${val}T${timePart}`);
                    }
                  },
                })}
                className="h-9"
              />
            </Field>

            <Field
              label="Work Date & Time"
              required
              error={form.formState.errors.workDateTime?.message}
            >
              <Input
                type="datetime-local"
                {...form.register("workDateTime", {
                  onChange: (e) => {
                    const val = e.target.value;
                    if (val && val.includes("T")) {
                      form.setValue("workDate", val.split("T")[0]);
                    }
                  },
                })}
                className="h-9"
              />
            </Field>
          </div>

          <ControlledSelect
            control={form.control}
            name="status"
            label="Work Status"
            options={STATUS_OPTIONS}
            required
          />

          {isStatusBlocked && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive font-medium">
              Log Request is available only for In Progress or Closed records.
            </div>
          )}

          <Field
            label="Work Description / Remarks"
            required
            error={form.formState.errors.description?.message}
          >
            <Textarea
              {...form.register("description")}
              placeholder="Detail the work carried out, inspection findings, parts used, etc."
              rows={3}
              className="resize-none"
            />
          </Field>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || isStatusBlocked}>
              {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
