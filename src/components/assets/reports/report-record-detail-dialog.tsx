"use client";

import { Eye, Printer, X } from "lucide-react";

import { DetailGrid, DetailRow } from "@/components/service-tickets/detail-row";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  printSingleReportRecord,
  type UnifiedReportRecord,
} from "@/lib/utils/print-report-record";

type ReportRecordDetailDialogProps = {
  open: boolean;
  record: UnifiedReportRecord | null;
  onClose: () => void;
};

export function ReportRecordDetailDialog({
  open,
  record,
  onClose,
}: ReportRecordDetailDialogProps) {
  if (!record) return null;

  const isReturned =
    record.currentStatus === "Returned to Customer" ||
    record.currentStatus === "Customer Returned" ||
    record.currentStatus === "Delivered" ||
    record.currentStatus === "Closed";

  const isUnderRepair =
    record.currentStatus === "Under Repair" ||
    record.currentStatus === "Sent to Vendor" ||
    record.repairStatus === "UNDER_REPAIR";

  const isVendorReceived =
    record.currentStatus === "Received From Vendor" ||
    record.currentStatus === "Vendor Received" ||
    record.repairStatus === "REPAIR_COMPLETED";

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl"
      >
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-background px-6 py-4 shadow-2xs">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                Material Record Details
              </DialogTitle>
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                {record.trackId}
              </span>
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
          {/* Status Highlight Banner */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/40 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                Current Status:
              </span>
              <span
                className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-bold inline-block",
                  isReturned
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                    : isUnderRepair
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                      : isVendorReceived
                        ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                        : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
                )}
              >
                {record.currentStatus}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[11px]">
                Repair Status:
              </span>
              <span className="font-semibold text-foreground">
                {record.repairStatus.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Section 1: Customer Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Customer Information
            </h3>
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <DetailGrid>
                <DetailRow label="Customer Name">
                  {record.customerName}
                </DetailRow>
                <DetailRow label="Customer Contact">
                  {record.customerContact || "—"}
                </DetailRow>
                <DetailRow label="Location / Branch">
                  {record.customerLocation || "—"}
                </DetailRow>
                <DetailRow label="Received Date">
                  {formatDate(record.receivedDate)}
                </DetailRow>
              </DetailGrid>
            </div>
          </div>

          {/* Section 2: Material & Product Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Material Details
            </h3>
            <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border/60 pb-2">
                <h4 className="text-sm font-bold uppercase tracking-wide text-foreground">
                  {record.productName}
                </h4>
                <span className="font-mono text-xs font-bold text-primary">
                  {record.trackId}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Product</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {record.productName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Serial Number</p>
                  <p className="font-semibold text-foreground mt-0.5 font-mono text-primary">
                    {record.serialNumber || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    Complaint / Issue
                  </p>
                  <p className="font-medium text-foreground mt-0.5 italic">
                    {record.complaint || "Service & Repair"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Vendor & Service Logistics */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Vendor & Service Logistics
            </h3>
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <DetailGrid>
                <DetailRow label="Assigned Vendor">
                  {record.vendorName || "—"}
                </DetailRow>
                <DetailRow label="Repair Charges">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(record.repairCost)}
                  </span>
                </DetailRow>
                <DetailRow label="Sent to Vendor Date">
                  {formatDate(record.sentDate)}
                </DetailRow>
                <DetailRow label="Vendor Return Date">
                  {formatDate(record.vendorReceivedDate)}
                </DetailRow>
                <DetailRow label="Customer Return Date">
                  {formatDate(record.returnedDate)}
                </DetailRow>
              </DetailGrid>
            </div>
          </div>
        </div>

        {/* STICKY FOOTER */}
        <div className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-background px-6 py-3.5 shadow-2xs">
          <div className="flex items-center justify-end gap-2.5 w-full">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                printSingleReportRecord(record);
              }}
              className="h-8.5 text-xs font-semibold gap-1.5 cursor-pointer text-primary border-primary/30 hover:bg-primary/10"
            >
              <Printer className="size-3.5" />
              Print / Save PDF
            </Button>
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
