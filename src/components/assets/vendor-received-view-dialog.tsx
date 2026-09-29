"use client";

import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { REPAIR_STATUS_TONE } from "@/lib/constants/assets";
import { formatRecordId } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SendToVendorRow } from "@/types/send-to-vendor";

type VendorReceivedViewDialogProps = {
  open: boolean;
  item: SendToVendorRow | null;
  onClose: () => void;
};

export function VendorReceivedViewDialog({
  open,
  item,
  onClose,
}: VendorReceivedViewDialogProps) {
  if (!item) return null;

  const dispatchId = item.seq ? formatRecordId("STV", item.seq) : item.id;
  const customerName = item.customerName || "—";
  const vendorName = item.vendorName || "—";
  const status = item.repairStatus || "UNDER_REPAIR";

  const repairTone =
    REPAIR_STATUS_TONE[status] || REPAIR_STATUS_TONE.UNDER_REPAIR;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className="max-w-md p-0 border border-border bg-card shadow-2xl rounded-2xl overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-background px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Eye className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Vendor Repair Details
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Dispatch {dispatchId}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
            className="size-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3.5">
            {/* 1. Dispatch ID */}
            <div>
              <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider">
                Dispatch ID
              </span>
              <span className="font-mono font-bold text-primary text-base mt-0.5 block">
                {dispatchId}
              </span>
            </div>

            {/* 2. Customer Name */}
            <div className="pt-2 border-t border-border/60">
              <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider">
                Customer Name
              </span>
              <span className="font-semibold text-foreground text-sm mt-0.5 block">
                {customerName}
              </span>
            </div>

            {/* 3. Vendor Name */}
            <div className="pt-2 border-t border-border/60">
              <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider">
                Vendor Name
              </span>
              <span className="font-semibold text-foreground text-sm mt-0.5 block">
                {vendorName}
              </span>
            </div>

            {/* 4. Current Status */}
            <div className="pt-2 border-t border-border/60">
              <span className="text-muted-foreground block text-xs font-medium uppercase tracking-wider mb-1">
                Current Status
              </span>
              <span
                className={cn(
                  "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold border",
                  repairTone.badge,
                )}
              >
                {status}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-background px-6 py-3.5 flex items-center justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 px-4 text-xs font-semibold cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
