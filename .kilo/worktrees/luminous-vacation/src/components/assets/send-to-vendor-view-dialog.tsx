"use client";

import { X } from "lucide-react";

import { DetailGrid, DetailRow } from "@/components/service-tickets/detail-row";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatDate, formatDateTime, formatRecordId } from "@/lib/format";
import type { SendToVendor, SendToVendorRow } from "@/types/send-to-vendor";

type SendToVendorViewDialogProps = {
  open: boolean;
  item: SendToVendor | SendToVendorRow | null;
  onClose: () => void;
};

export function SendToVendorViewDialog({
  open,
  item,
  onClose,
}: SendToVendorViewDialogProps) {
  if (!item) return null;

  const displayId = formatRecordId("STV", item.seq || 1);
  const primaryItem = Array.isArray(item.items) ? item.items[0] : undefined;
  const trackId =
    primaryItem?.trackId ||
    (item.assetSeq ? formatRecordId("ASSET", item.assetSeq) : "—");
  const productName = primaryItem?.productName || item.assetName || "Product";
  const brandName = primaryItem?.brandName || "—";
  const modelNumber = primaryItem?.modelNumber || "—";
  const serialNumber = primaryItem?.serialNumber || item.serialNumber || "—";
  const customerName = item.customerName || item.asset?.customerName || "—";
  const customerNumber = item.asset?.customerNumber || null;

  const statusRaw = (
    item.repairStatus ||
    item.status ||
    "SENT_TO_VENDOR"
  ).toUpperCase();

  const statusDisplay =
    statusRaw === "CUSTOMER_RECEIVED"
      ? "Customer Received"
      : statusRaw === "RETURN_TO_CUSTOMER" ||
          statusRaw === "RETURNED_TO_CUSTOMER"
        ? "Returned to Customer"
        : statusRaw === "REPAIR_COMPLETED" ||
            statusRaw === "VENDOR_RECEIVED" ||
            statusRaw === "RECEIVED_FROM_VENDOR"
          ? "Vendor Received"
          : statusRaw === "UNDER_REPAIR"
            ? "Under Repair"
            : "Sent to Vendor";

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl"
      >
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-background px-6 py-4 shadow-2xs">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                  {trackId}
                </span>
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground truncate">
                  Vendor Dispatch Details
                </DialogTitle>
                <span className="text-xs font-medium text-muted-foreground">
                  ({displayId})
                </span>
              </div>
            </div>

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

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Section 1: Product & Material Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Material & Product Information
            </h3>
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <DetailGrid>
                <DetailRow label="Track ID">
                  <span className="font-mono font-bold text-primary">
                    {trackId}
                  </span>
                </DetailRow>
                <DetailRow label="Customer Name">{customerName}</DetailRow>
                <DetailRow label="Product Type">{productName}</DetailRow>
                <DetailRow label="Brand">{brandName}</DetailRow>
                <DetailRow label="Model Number">{modelNumber}</DetailRow>
                <DetailRow label="Serial Number">
                  <span className="font-mono">{serialNumber}</span>
                </DetailRow>
                {customerNumber && (
                  <DetailRow label="Customer Phone">{customerNumber}</DetailRow>
                )}
                <DetailRow label="Status">
                  <span className="font-semibold text-foreground">
                    {statusDisplay}
                  </span>
                </DetailRow>
              </DetailGrid>
            </div>
          </div>

          {/* Section 1.5: Additional Dispatched Products Breakdown (if multiple) */}
          {Array.isArray(item.items) && item.items.length > 1 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Dispatched Products ({item.items.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {item.items.map((prod, pIdx) => (
                  <div
                    key={`${prod.receivedItemId || pIdx}`}
                    className="rounded-xl border border-border bg-card p-3.5 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {prod.trackId}
                      </span>
                      <span className="font-mono text-xs font-semibold text-foreground">
                        SN: {prod.serialNumber || "—"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-foreground">
                      {prod.productName}
                    </p>
                    {(prod.brandName || prod.modelNumber) && (
                      <p className="text-[11px] text-muted-foreground">
                        {[prod.brandName, prod.modelNumber]
                          .filter(Boolean)
                          .join(" ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Vendor Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Vendor Details
            </h3>
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <DetailGrid>
                <DetailRow label="Vendor Name">{item.vendorName}</DetailRow>
                <DetailRow label="Contact Person">
                  {item.contactPerson}
                </DetailRow>
                <DetailRow label="Phone Number">{item.phoneNumber}</DetailRow>
                <DetailRow label="Address">{item.address}</DetailRow>
              </DetailGrid>
            </div>
          </div>

          {/* Section 3: Repair Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Repair Details
            </h3>
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <DetailGrid>
                <DetailRow label="Reason for Repair">
                  {item.reasonForRepair}
                </DetailRow>
                <DetailRow label="Remarks">{item.remarks || "—"}</DetailRow>
              </DetailGrid>
            </div>
          </div>

          {/* Section 4: Courier / Dispatch Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Courier & Dispatch Details
            </h3>
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <DetailGrid>
                <DetailRow label="Courier Name">{item.courierName}</DetailRow>
                <DetailRow label="Docket / AWB Number">
                  <span className="font-mono font-medium text-foreground">
                    {item.docketAwbNumber}
                  </span>
                </DetailRow>
                <DetailRow label="Booking Date">
                  {formatDate(item.bookingDate)}
                </DetailRow>
                <DetailRow label="No. of Packages">
                  <span className="font-semibold text-foreground">
                    {item.numberOfPackages}
                  </span>
                </DetailRow>
                {item.dispatchRemarks && (
                  <DetailRow label="Dispatch Remarks">
                    {item.dispatchRemarks}
                  </DetailRow>
                )}
              </DetailGrid>
            </div>
          </div>

          {/* Section 5: System Timeline */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Record Timeline
            </h3>
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <DetailGrid>
                <DetailRow label="Created Date">
                  {formatDateTime(item.createdAt)}
                </DetailRow>
                {item.customerReceivedAt && (
                  <DetailRow label="Customer Received">
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatDateTime(item.customerReceivedAt)}
                    </span>
                  </DetailRow>
                )}
                <DetailRow label="Last Updated">
                  {formatDateTime(item.updatedAt)}
                </DetailRow>
              </DetailGrid>
            </div>
          </div>
        </div>

        {/* STICKY FOOTER */}
        <div className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-background px-6 py-3.5 sm:px-6 shadow-xs">
          <div className="flex items-center justify-end w-full">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
