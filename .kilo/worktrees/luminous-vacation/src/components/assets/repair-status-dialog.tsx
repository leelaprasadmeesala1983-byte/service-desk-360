"use client";

import { Loader2, Wrench, X } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { formatRecordId } from "@/lib/format";
import type { AssetRow } from "@/types/assets";

type RepairStatusDialogProps = {
  open: boolean;
  asset: AssetRow | null;
  onClose: () => void;
  onSubmit: (repairStatus: string, remarks?: string) => Promise<boolean>;
};

const REPAIR_STATUS_OPTIONS = [
  { value: "UNDER_REPAIR", label: "Under Repair" },
  { value: "REPAIRED", label: "Repaired" },
  { value: "DEAD", label: "Dead" },
  { value: "NOT_REPAIRABLE", label: "Not Repairable" },
  { value: "REPLACEMENT", label: "Replacement" },
  { value: "NO_FAULT_FOUND", label: "No Fault Found" },
  { value: "WAITING_FOR_PARTS", label: "Waiting for Parts" },
  { value: "OTHER", label: "Other" },
];

export function RepairStatusDialog({
  open,
  asset,
  onClose,
  onSubmit,
}: RepairStatusDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<string>("UNDER_REPAIR");
  const [remarks, setRemarks] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && asset) {
      setSelectedStatus(
        asset.repairStatus && asset.repairStatus !== "NOT_REQUIRED"
          ? asset.repairStatus
          : "UNDER_REPAIR",
      );
      setRemarks("");
    }
  }, [open, asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset) return;

    setIsSubmitting(true);
    try {
      const success = await onSubmit(selectedStatus, remarks);
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className="max-w-md p-0 border border-border bg-card shadow-xl rounded-xl"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Wrench className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Update Repair Status
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Update vendor repair progress for{" "}
                {formatRecordId("ASSET", asset.seq)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Repair Status</Label>
            <Select
              value={selectedStatus}
              onValueChange={(val) => {
                if (val) setSelectedStatus(val);
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select repair status" />
              </SelectTrigger>
              <SelectContent>
                {REPAIR_STATUS_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    className="text-xs"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="statusRemarks" className="text-xs font-semibold">
              Status Remarks
            </Label>
            <Textarea
              id="statusRemarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add technician or vendor remarks about repair status..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <span>Update Status</span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
