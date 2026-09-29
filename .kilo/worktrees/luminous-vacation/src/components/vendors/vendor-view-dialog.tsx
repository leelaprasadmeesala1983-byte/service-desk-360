"use client";

import { X } from "lucide-react";
import { DetailGrid, DetailRow } from "@/components/service-tickets/detail-row";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import type { Vendor, VendorRow } from "@/types/vendors";

type VendorViewDialogProps = {
  open: boolean;
  vendor: Vendor | VendorRow | null;
  onClose: () => void;
};

export function VendorViewDialog({
  open,
  vendor,
  onClose,
}: VendorViewDialogProps) {
  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg flex flex-col p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl"
      >
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-background px-6 py-4 shadow-2xs">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
              Vendor Details
            </DialogTitle>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
              className="size-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg shrink-0"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
            <DetailGrid>
              <DetailRow label="Vendor Name">{vendor.vendorName}</DetailRow>
              <DetailRow label="Contact Person">
                {vendor.contactPerson}
              </DetailRow>
              <DetailRow label="Phone Number">{vendor.phoneNumber}</DetailRow>
              <DetailRow label="Address">{vendor.address}</DetailRow>
              <DetailRow label="Created Date">
                {formatDateTime(vendor.createdAt)}
              </DetailRow>
            </DetailGrid>
          </div>
        </div>

        {/* STICKY FOOTER */}
        <div className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-background px-6 py-3.5 flex items-center justify-end gap-3 shadow-2xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8.5 text-xs font-semibold cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
