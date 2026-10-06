"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronDown, History, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { SelectableRecord } from "@/db/queries/work-history";
import { createWorkHistory } from "@/lib/actions/work-history";
import { RECORD_STATUS_LABELS, type RecordStatus, type RecordType } from "@/lib/constants";
import { formatRecordId } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  type CreateWorkHistoryValues,
  createWorkHistorySchema,
} from "@/lib/validations/work-history";

type TechnicianOption = {
  id: string;
  name: string;
};

type LogRequestDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workType?: RecordType;
  selectableTickets: SelectableRecord[];
  technicians: TechnicianOption[];
  preselectedTicketId?: string;
  onSuccess?: () => void;
};

function getNowLocalIso(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function resolveAssignedTechIds(
  ticket: SelectableRecord | undefined,
  technicians: TechnicianOption[],
): string[] {
  if (!ticket) return [];

  const techById = new Map<string, string>();
  const techByName = new Map<string, string>();

  for (const t of technicians) {
    if (t.id) {
      techById.set(t.id, t.id);
      techById.set(t.id.toLowerCase(), t.id);
    }
    if (t.name) {
      techByName.set(t.name.trim().toLowerCase(), t.id);
    }
  }

  const resolved = new Set<string>();

  // 1. Check ticket.assignedTechnicianIds & ticket.assignedTechnicianId
  const rawIds = Array.isArray(ticket.assignedTechnicianIds)
    ? [...ticket.assignedTechnicianIds]
    : [];
  if (ticket.assignedTechnicianId) {
    rawIds.push(ticket.assignedTechnicianId);
  }

  for (const raw of rawIds) {
    if (!raw || typeof raw !== "string") continue;
    const clean = raw.trim();
    if (!clean) continue;

    const byId = techById.get(clean) || techById.get(clean.toLowerCase());
    if (byId) {
      resolved.add(byId);
      continue;
    }

    const byName = techByName.get(clean.toLowerCase());
    if (byName) {
      resolved.add(byName);
    }
  }

  // 2. Check ticket.technicianNames & ticket.technicianName
  const rawNames = Array.isArray(ticket.technicianNames)
    ? [...ticket.technicianNames]
    : [];
  if (ticket.technicianName) {
    rawNames.push(ticket.technicianName);
  }

  for (const name of rawNames) {
    if (!name || typeof name !== "string") continue;
    const byName = techByName.get(name.trim().toLowerCase());
    if (byName) {
      resolved.add(byName);
    }
  }

  return Array.from(resolved);
}

export function LogRequestDialog({
  open,
  onOpenChange,
  workType = "SERVICE",
  selectableTickets,
  technicians,
  preselectedTicketId,
  onSuccess,
}: LogRequestDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [ticketPopoverOpen, setTicketPopoverOpen] = useState(false);

  const techOptions = useMemo(
    () => technicians.map((t) => ({ value: t.id, label: t.name })),
    [technicians],
  );

  // Directly load the existing management records
  const activeSelectableTickets = useMemo(() => {
    return selectableTickets.filter((t) => Boolean(t && t.id));
  }, [selectableTickets]);

  const form = useForm<CreateWorkHistoryValues>({
    resolver: zodResolver(
      createWorkHistorySchema,
    ) as Resolver<CreateWorkHistoryValues>,
    defaultValues: {
      workType: workType ?? "SERVICE",
      referenceId: preselectedTicketId ?? "",
      technicianIds: [],
      workDate: new Date().toISOString().split("T")[0],
      workDateTime: getNowLocalIso(),
      status: "OPEN",
      description: "",
      attachments: [],
    },
  });

  const selectedTicketId = form.watch("referenceId");
  const currentStatus = form.watch("status");

  const selectedTicket = useMemo(() => {
    return (
      activeSelectableTickets.find((t) => t.id === selectedTicketId) ||
      selectableTickets.find((t) => t.id === selectedTicketId)
    );
  }, [activeSelectableTickets, selectableTickets, selectedTicketId]);

  const normFormStatus = String(currentStatus || "")
    .trim()
    .toUpperCase()
    .replace(/[\s_-]+/g, "");
  const isStatusBlocked = normFormStatus === "OPEN";

  // When preselectedTicketId changes or dialog opens
  useEffect(() => {
    if (open) {
      const nowIso = getNowLocalIso();
      const todayDate = new Date().toISOString().split("T")[0];
      const targetId = preselectedTicketId ?? "";
      const matched = targetId
        ? selectableTickets.find((t) => t.id === targetId)
        : undefined;

      const initialTechIds = matched
        ? resolveAssignedTechIds(matched, technicians)
        : [];

      const norm = String(matched?.status || "")
        .trim()
        .toUpperCase()
        .replace(/[\s_-]+/g, "");
      const targetStatus: RecordStatus =
        norm === "CLOSED"
          ? "CLOSED"
          : norm === "INPROGRESS"
            ? "IN_PROGRESS"
            : "OPEN";

      form.reset({
        workType: workType ?? "SERVICE",
        referenceId: matched ? matched.id : "",
        technicianIds: initialTechIds,
        workDate: todayDate,
        workDateTime: nowIso,
        status: targetStatus,
        description: "",
        attachments: [],
      });
      setTicketPopoverOpen(false);
    }
  }, [open, preselectedTicketId]);

  const handleTicketSelect = (ticket: SelectableRecord) => {
    form.setValue("referenceId", ticket.id, { shouldValidate: true });
    const newTechIds = resolveAssignedTechIds(ticket, technicians);
    form.setValue("technicianIds", newTechIds, {
      shouldValidate: true,
    });
    // Immediately set the Log Request Status field to the selected ticket's current status
    const norm = String(ticket.status || "")
      .trim()
      .toUpperCase()
      .replace(/[\s_-]+/g, "");
    const targetStatus: RecordStatus =
      norm === "CLOSED"
        ? "CLOSED"
        : norm === "INPROGRESS"
          ? "IN_PROGRESS"
          : "OPEN";
    form.setValue("status", targetStatus, { shouldValidate: true });
    setTicketPopoverOpen(false);
  };

  const fieldLabel =
    workType === "INSTALLATION"
      ? "Installation No"
      : workType === "PROJECT"
        ? "Project No"
        : "Ticket No";

  const placeholderText =
    workType === "INSTALLATION"
      ? "Select Installation"
      : workType === "PROJECT"
        ? "Select Project"
        : "Select Ticket";

  const onSubmit = (values: CreateWorkHistoryValues) => {
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
      const res = await createWorkHistory(values);
      if (!res.ok) {
        toast.error(res.error || "Failed to log work request");
        if (res.fieldErrors) {
          for (const [k, v] of Object.entries(res.fieldErrors)) {
            if (v?.[0]) {
              form.setError(k as keyof CreateWorkHistoryValues, {
                message: v[0],
              });
            }
          }
        }
        return;
      }

      toast.success("Work log created successfully.");
      onOpenChange(false);
      onSuccess?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b border-border/80 pb-3">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <History className="size-5 text-primary" />
            <span>Log Request</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* 1. Reference Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="ticket-select">
              {fieldLabel} <span className="text-destructive">*</span>
            </Label>
            <Popover
              open={ticketPopoverOpen}
              onOpenChange={setTicketPopoverOpen}
            >
              <PopoverTrigger
                render={<div />}
                nativeButton={false}
                tabIndex={0}
                role="combobox"
                aria-expanded={ticketPopoverOpen}
                aria-label={`Select ${fieldLabel.toLowerCase()}`}
                className={cn(
                  "border-border bg-transparent hover:bg-muted/10 focus-visible:border-ring flex h-10 w-full cursor-pointer items-center justify-between rounded-md border px-3 text-sm transition-colors outline-none",
                  form.formState.errors.referenceId && "border-destructive",
                )}
              >
                {selectedTicket ? (
                  <span className="font-medium text-foreground">
                    {selectedTicket.recordId ||
                      (selectedTicket.seq
                        ? formatRecordId(workType ?? "SERVICE", selectedTicket.seq)
                        : selectedTicket.id)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {placeholderText}
                  </span>
                )}
                <ChevronDown className="text-muted-foreground size-4 shrink-0" />
              </PopoverTrigger>

              <PopoverContent
                align="start"
                className="w-[var(--anchor-width)] min-w-[200px] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
              >
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {activeSelectableTickets.length === 0 ? (
                    <div className="py-3 text-center text-xs text-muted-foreground">
                      No active requests
                    </div>
                  ) : (
                    activeSelectableTickets.map((ticket) => {
                      const isSelected = ticket.id === selectedTicketId;
                      const displayId =
                        ticket.recordId ||
                        (ticket.seq
                          ? formatRecordId(workType ?? "SERVICE", ticket.seq)
                          : ticket.id);
                      return (
                        <button
                          key={ticket.id}
                          type="button"
                          onClick={() => handleTicketSelect(ticket)}
                          className={cn(
                            "flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-xs transition-colors text-left outline-none font-medium",
                            isSelected
                              ? "bg-primary/10 text-primary font-semibold"
                              : "hover:bg-muted text-foreground",
                          )}
                        >
                          <span className="font-semibold text-foreground">{displayId}</span>
                          {isSelected && (
                            <Check className="text-primary size-4 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {form.formState.errors.referenceId && (
              <p className="text-destructive text-xs">
                {form.formState.errors.referenceId.message}
              </p>
            )}
          </div>

          {/* 2. Status Field */}
          <ControlledSelect
            control={form.control}
            name="status"
            label="Status"
            required
            options={[
              { value: "OPEN", label: "Open" },
              { value: "IN_PROGRESS", label: "In Progress" },
              { value: "CLOSED", label: "Closed" },
            ]}
          />

          {isStatusBlocked && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive font-medium">
              Log Request is available only for In Progress or Closed records.
            </div>
          )}

          {/* 3. Customer Name */}
          <Field label="Customer Name">
            <Input
              value={selectedTicket?.customerName ?? ""}
              readOnly
              disabled
              placeholder="Customer Name"
              className="h-10 bg-muted/40 cursor-not-allowed text-muted-foreground"
            />
          </Field>

          {/* 4. Assigned Technicians */}
          <ControlledMultiSelect
            control={form.control}
            name="technicianIds"
            label="Assigned Technician(s)"
            options={techOptions}
            required
            placeholder="Select Technicians"
          />

          {/* 4. Date & Time */}
          <Field
            label="Date & Time"
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
              className="h-10"
            />
          </Field>

          {/* 5. Work Description / Notes */}
          <Field
            label="Work Description / Notes"
            error={form.formState.errors.description?.message}
          >
            <Textarea
              {...form.register("description")}
              placeholder="Enter work details or progress notes..."
              className="min-h-20"
            />
          </Field>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || isStatusBlocked || !selectedTicketId}
            >
              {isPending && <Loader2 className="size-4 animate-spin mr-2" />}
              Submit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
