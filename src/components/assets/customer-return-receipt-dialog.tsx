"use client";

import { Printer, X } from "lucide-react";
import { PrintReportHeader } from "@/components/assets/reports/print/print-report-header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { REPAIR_STATUS_TONE } from "@/lib/constants/assets";
import { formatDate, formatDateTime, formatRecordId } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SendToVendorRow } from "@/types/send-to-vendor";

type CustomerReturnReceiptDialogProps = {
  open: boolean;
  item: SendToVendorRow | null;
  onClose: () => void;
};

export function CustomerReturnReceiptDialog({
  open,
  item,
  onClose,
}: CustomerReturnReceiptDialogProps) {
  if (!item) return null;

  const dispatchId = item.seq ? formatRecordId("STV", item.seq) : item.id;
  const items = Array.isArray(item.items) ? item.items : [];

  const customerName = item.customerName || item.asset?.customerName || "—";
  const customerNumber = item.asset?.customerNumber || item.phoneNumber || "—";
  const vendorName = item.vendorName || "—";
  const vendorContact = item.contactPerson || "—";

  const statusRaw = (
    item.repairStatus ||
    item.status ||
    "CUSTOMER_RECEIVED"
  ).toUpperCase();
  const repairTone = REPAIR_STATUS_TONE[statusRaw] ||
    REPAIR_STATUS_TONE.CUSTOMER_RECEIVED || {
      badge: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      label: "Customer Received",
    };

  const receivedDateTime = item.customerReceivedAt
    ? formatDateTime(item.customerReceivedAt)
    : item.updatedAt
      ? formatDateTime(item.updatedAt)
      : formatDateTime(new Date());

  const receivedDate = item.customerReceivedAt
    ? formatDate(item.customerReceivedAt)
    : item.updatedAt
      ? formatDate(item.updatedAt)
      : formatDate(new Date());

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className="w-[min(900px,95vw)] max-w-[95vw] max-h-[90vh] h-[90vh] flex flex-col overflow-hidden p-0 border border-border bg-card shadow-2xl rounded-2xl"
        showCloseButton={false}
      >
        {/* 1. Fixed Modal Header (never scrolls horizontally or vertically) */}
        <div className="no-print flex-shrink-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-6 py-3.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm text-foreground truncate">
              Customer Return Receipt Preview
            </span>
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
              {dispatchId}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
            >
              <Printer className="size-3.5" />
              <span>Print Receipt</span>
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* 2. Scrollable Content Area (Vertical Only) */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 bg-muted/20 flex justify-center">
          <div
            id="customer-return-receipt"
            className="customer-receipt w-full max-w-[700px] my-auto bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 rounded-xl border border-zinc-200 dark:border-zinc-800 p-5 sm:p-8 shadow-xs box-border print:border-0 print:shadow-none print:p-0 print:bg-white print:text-black"
          >
            {/* Header Section */}
            <PrintReportHeader
              reportTitle="CUSTOMER RETURN RECEIPT"
              className="dark:border-zinc-800 [&>h1]:dark:text-zinc-100 [&>p]:dark:text-zinc-400 [&>div]:dark:bg-zinc-900 [&>div]:dark:text-zinc-100 [&>div]:dark:border-zinc-800"
            />

            {/* Metadata / Receipt Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 border-b border-zinc-200 dark:border-zinc-800 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 font-medium">
                    Dispatch / Receipt ID:
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {dispatchId}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500 font-medium">Issue Date:</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {receivedDate}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 sm:text-right">
                <div className="flex items-center sm:justify-end gap-1.5">
                  <span className="text-zinc-500 font-medium">Status:</span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                      repairTone.badge,
                    )}
                  >
                    {repairTone.label}
                  </span>
                </div>
                <div className="flex items-center sm:justify-end gap-1.5">
                  <span className="text-zinc-500 font-medium">
                    Received At:
                  </span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {receivedDateTime}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer & Vendor Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 py-4 border-b border-zinc-200 dark:border-zinc-800 text-xs">
              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-3 border border-zinc-200/80 dark:border-zinc-800/80 break-words">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Customer Details
                </span>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm break-words">
                  {customerName}
                </p>
                {customerNumber !== "—" && (
                  <p className="text-zinc-600 dark:text-zinc-400 mt-0.5 break-words">
                    Contact: {customerNumber}
                  </p>
                )}
              </div>

              <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-3 border border-zinc-200/80 dark:border-zinc-800/80 break-words">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1">
                  Vendor Serviced By
                </span>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm break-words">
                  {vendorName}
                </p>
                {vendorContact !== "—" && (
                  <p className="text-zinc-600 dark:text-zinc-400 mt-0.5 break-words">
                    Contact: {vendorContact}
                  </p>
                )}
              </div>
            </div>

            {/* Material / Product Details */}
            <div className="py-4 border-b border-zinc-200 dark:border-zinc-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2.5">
                Returned Material Details
              </span>

              <div className="w-full">
                <table className="w-full table-fixed text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60">
                      <th className="w-[22%] py-2 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
                        Track ID
                      </th>
                      <th className="w-[28%] py-2 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
                        Product
                      </th>
                      <th className="w-[26%] py-2 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
                        Details
                      </th>
                      <th className="w-[24%] py-2 px-2 font-semibold text-zinc-700 dark:text-zinc-300">
                        Serial No.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? (
                      items.map((prod, idx) => {
                        const productDetails = [
                          prod.brandName,
                          prod.modelNumber,
                        ]
                          .filter(Boolean)
                          .join(" - ");
                        return (
                          <tr
                            key={prod.receivedItemId || idx}
                            className="border-b border-zinc-100 dark:border-zinc-900/60"
                          >
                            <td className="py-2.5 px-2 font-mono font-bold text-zinc-800 dark:text-zinc-200 break-words [overflow-wrap:anywhere]">
                              {prod.trackId ||
                                (item.assetSeq
                                  ? formatRecordId("ASSET", item.assetSeq)
                                  : "—")}
                            </td>
                            <td className="py-2.5 px-2 font-semibold text-zinc-900 dark:text-zinc-100 break-words [overflow-wrap:anywhere]">
                              {prod.productName}
                            </td>
                            <td className="py-2.5 px-2 text-zinc-600 dark:text-zinc-400 break-words [overflow-wrap:anywhere]">
                              {productDetails || "—"}
                            </td>
                            <td className="py-2.5 px-2 font-mono font-medium text-zinc-700 dark:text-zinc-300 break-words [overflow-wrap:anywhere]">
                              {prod.serialNumber || "—"}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr className="border-b border-zinc-100 dark:border-zinc-900/60">
                        <td className="py-2.5 px-2 font-mono font-bold text-zinc-800 dark:text-zinc-200 break-words [overflow-wrap:anywhere]">
                          {item.assetSeq
                            ? formatRecordId("ASSET", item.assetSeq)
                            : "—"}
                        </td>
                        <td className="py-2.5 px-2 font-semibold text-zinc-900 dark:text-zinc-100 break-words [overflow-wrap:anywhere]">
                          {item.assetName || "Product"}
                        </td>
                        <td className="py-2.5 px-2 text-zinc-600 dark:text-zinc-400 break-words [overflow-wrap:anywhere]">
                          —
                        </td>
                        <td className="py-2.5 px-2 font-mono font-medium text-zinc-700 dark:text-zinc-300 break-words [overflow-wrap:anywhere]">
                          {item.serialNumber || "—"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Return & Courier Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 border-b border-zinc-200 dark:border-zinc-800 text-xs">
              <div className="break-words">
                <span className="text-zinc-500">Courier / Handover:</span>
                <p className="font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 break-words">
                  {item.courierName || "Direct Handover"}
                </p>
              </div>
              {item.docketAwbNumber && (
                <div className="break-words">
                  <span className="text-zinc-500">Docket / Reference No:</span>
                  <p className="font-mono font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 break-words">
                    {item.docketAwbNumber}
                  </p>
                </div>
              )}
            </div>

            {/* Customer Acknowledgement & Signatures */}
            <div className="pt-6 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-6 text-center">
                Customer Acknowledgement
              </span>

              <div className="grid grid-cols-3 gap-3 sm:gap-4 text-xs">
                <div className="space-y-3 sm:space-y-4 min-w-0">
                  <div className="border-b border-zinc-400 dark:border-zinc-600 pb-1">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate block">
                      {customerName}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-zinc-500 block truncate">
                    Customer Name
                  </span>
                </div>

                <div className="space-y-3 sm:space-y-4 min-w-0">
                  <div className="border-b border-zinc-400 dark:border-zinc-600 pb-1 h-5" />
                  <span className="text-[10px] sm:text-[11px] text-zinc-500 block text-center truncate">
                    Authorized Sign
                  </span>
                </div>

                <div className="space-y-3 sm:space-y-4 min-w-0">
                  <div className="border-b border-zinc-400 dark:border-zinc-600 pb-1">
                    <span className="font-medium text-zinc-800 dark:text-zinc-200 block text-right truncate">
                      {receivedDate}
                    </span>
                  </div>
                  <span className="text-[10px] sm:text-[11px] text-zinc-500 block text-right truncate">
                    Date
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="mt-8 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800 text-center text-[10px] text-zinc-400 dark:text-zinc-500">
              <p>
                This is an official system-generated Material Return Receipt
                from MARUTHI IT SERVICES.
              </p>
              <p className="mt-0.5">
                Materials received in verified and satisfactory condition.
              </p>
            </div>
          </div>
        </div>

        {/* Global Print Stylesheet for this receipt */}
        <style jsx global>{`
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            body * {
              visibility: hidden;
            }
            .customer-receipt,
            .customer-receipt * {
              visibility: visible;
            }
            .customer-receipt {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 24px !important;
              box-shadow: none !important;
              border: none !important;
              background: white !important;
              color: black !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}
