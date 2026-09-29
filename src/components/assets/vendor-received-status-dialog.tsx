"use client";

import { FilePenLine, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatRecordId } from "@/lib/format";
import type { SendToVendorRow } from "@/types/send-to-vendor";

export const REPAIR_STATUS_SELECT_OPTIONS = [
  { value: "UNDER_REPAIR", label: "Under Repair" },
  { value: "REPAIRED", label: "Repaired" },
  { value: "DEAD", label: "Dead" },
  { value: "NOT_REPAIRABLE", label: "Not Repairable" },
  { value: "REPLACEMENT", label: "Replacement" },
  { value: "NO_FAULT_FOUND", label: "No Fault Found" },
  { value: "WAITING_FOR_PARTS", label: "Waiting for Parts" },
  { value: "OTHER", label: "Other" },
] as const;

type VendorReceivedStatusDialogProps = {
  open: boolean;
  item: SendToVendorRow | null;
  allowedStatuses?: string[];
  onClose: () => void;
  onSubmit: (status: string) => Promise<boolean>;
};

export function VendorReceivedStatusDialog({
  open,
  item,
  allowedStatuses,
  onClose,
  onSubmit,
}: VendorReceivedStatusDialogProps) {
  const [status, setStatus] = useState<string>("UNDER_REPAIR");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableOptions =
    allowedStatuses && allowedStatuses.length > 0
      ? REPAIR_STATUS_SELECT_OPTIONS.filter((opt) =>
          allowedStatuses.includes(opt.value),
        )
      : REPAIR_STATUS_SELECT_OPTIONS;

  useEffect(() => {
    if (open && item) {
      if (allowedStatuses && allowedStatuses.length > 0) {
        setStatus(allowedStatuses[0]);
      } else if (
        item.repairStatus &&
        REPAIR_STATUS_SELECT_OPTIONS.some((o) => o.value === item.repairStatus)
      ) {
        setStatus(item.repairStatus);
      } else {
        setStatus("UNDER_REPAIR");
      }
    }
  }, [open, item, allowedStatuses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const success = await onSubmit(status);
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!item) return null;

  const dispatchId = item.seq ? formatRecordId("STV", item.seq) : item.id;
  const customerName = item.customerName || item.asset?.customerName || "—";
  const vendorName = item.vendorName || "—";

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !val && !isSubmitting && onClose()}
    >
      <DialogContent
        className="max-w-md p-0 border border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FilePenLine className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Update Repair Status
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update status for dispatch {dispatchId}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Close"
            className="size-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5">
          {/* Read-Only Details */}
          <div className="grid grid-cols-2 gap-3.5 rounded-xl border border-border/80 bg-muted/30 p-3.5 text-xs">
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">
                Dispatch ID
              </span>
              <span className="font-mono font-bold text-primary text-sm mt-0.5 block">
                {dispatchId}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[11px] font-medium">
                Customer Name
              </span>
              <span className="font-semibold text-foreground text-sm mt-0.5 block truncate">
                {customerName}
              </span>
            </div>
            <div className="col-span-2 pt-2 border-t border-border/60">
              <span className="text-muted-foreground block text-[11px] font-medium">
                Vendor Name
              </span>
              <span className="font-semibold text-foreground text-sm mt-0.5 block truncate">
                {vendorName}
              </span>
            </div>
          </div>

          {/* Status Dropdown */}
          <div className="space-y-1.5">
            <Label
              htmlFor="status-select"
              className="text-xs font-bold text-foreground"
            >
              Status <span className="text-destructive">*</span>
            </Label>
            <Select
              value={status}
              onValueChange={(val: string | null) => {
                if (val) setStatus(val);
              }}
            >
              <SelectTrigger
                id="status-select"
                className="h-10 text-sm bg-background"
              >
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                {availableOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>Update Status</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
