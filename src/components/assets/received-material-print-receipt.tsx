"use client";

import { PrintReportHeader } from "@/components/assets/reports/print/print-report-header";
import { formatDate, formatDateTime, formatRecordId } from "@/lib/format";
import type { ReceivedItemRow } from "@/types/assets";

type ReceivedMaterialPrintReceiptProps = {
  item: ReceivedItemRow | null;
};

export function ReceivedMaterialPrintReceipt({
  item,
}: ReceivedMaterialPrintReceiptProps) {
  if (!item) return null;

  const trackId =
    item.trackId ||
    (item.assetSeq ? formatRecordId("ASSET", item.assetSeq) : "—");

  const customerName = item.customerName || "—";
  const customerNumber = item.customerNumber || "—";
  const location = item.location || "—";

  const productName =
    item.productType === "Other" && item.otherProductType
      ? `Other (${item.otherProductType})`
      : item.productType || "Asset";

  const brandModelParts = [item.brandName, item.modelNumber].filter(Boolean);
  const productModel =
    brandModelParts.length > 0
      ? brandModelParts.join(" - ")
      : item.modelNumber || "—";

  const rawStatus = String(item.itemStatus || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  const isAvailable =
    !item.dispatchId &&
    (!rawStatus || rawStatus === "received" || rawStatus === "available");
  const currentStatus = isAvailable ? "Available" : "Dispatched to Vendor";

  const receivedDate = formatDate(item.createdAt);
  const receivedDateTime = formatDateTime(item.createdAt);
  const printedDateTime = formatDateTime(new Date());
  const complaintRemarks = item.remarks || item.description || "—";
  const accessories = item.accessories || "—";

  return (
    <div className="received-material-print-document">
      <div className="w-full bg-white text-slate-900 p-8 font-sans text-xs box-border">
        {/* 1. Header */}
        <PrintReportHeader
          reportTitle="RECEIVED MATERIAL DETAILS"
          refId={trackId}
          date={`Date: ${receivedDate}`}
        />

        {/* 2. Customer & Receipt Cards */}
        <div className="grid grid-cols-2 gap-4 py-4 border-b border-slate-300 text-xs">
          <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
              Customer Information
            </span>
            <p className="font-bold text-slate-900 text-sm">{customerName}</p>
            {customerNumber !== "—" && (
              <p className="text-slate-700 mt-1">Contact: {customerNumber}</p>
            )}
            {location !== "—" && (
              <p className="text-slate-600 mt-0.5">Location: {location}</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-300 bg-slate-50 p-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5">
              Receipt Details
            </span>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-600">Track ID:</span>
                <span className="font-mono font-bold text-blue-600">
                  {trackId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Received Date:</span>
                <span className="font-medium text-slate-900">
                  {receivedDateTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Status:</span>
                <span className="font-semibold text-slate-800">
                  {currentStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Material Information Table */}
        <div className="py-4 border-b border-slate-300">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-2.5">
            Material Information
          </span>

          <table className="w-full table-fixed text-left text-xs border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300">
                <th className="w-[20%] py-2 px-3 font-bold text-slate-900 border-r border-slate-300">
                  Track ID
                </th>
                <th className="w-[25%] py-2 px-3 font-bold text-slate-900 border-r border-slate-300">
                  Product Name
                </th>
                <th className="w-[25%] py-2 px-3 font-bold text-slate-900 border-r border-slate-300">
                  Product Model
                </th>
                <th className="w-[20%] py-2 px-3 font-bold text-slate-900 border-r border-slate-300">
                  Serial Number
                </th>
                <th className="w-[10%] py-2 px-3 font-bold text-slate-900 text-center">
                  Qty
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-2.5 px-3 font-mono font-bold text-blue-600 border-r border-slate-300">
                  {trackId}
                </td>
                <td className="py-2.5 px-3 font-semibold text-slate-900 border-r border-slate-300">
                  {productName}
                </td>
                <td className="py-2.5 px-3 text-slate-800 border-r border-slate-300">
                  {productModel}
                </td>
                <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-300">
                  {item.serialNumber || "—"}
                </td>
                <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                  {item.quantity || 1}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 4. Condition & Remarks */}
        <div className="py-4 border-b border-slate-300">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block mb-2">
            Condition & Remarks
          </span>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px] mb-0.5">
                Accessories:
              </span>
              <p className="text-slate-800 font-medium">{accessories}</p>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] mb-0.5">
                Current Status:
              </span>
              <p className="text-slate-800 font-semibold">{currentStatus}</p>
            </div>
            <div className="col-span-2 mt-1">
              <span className="text-slate-500 block text-[11px] mb-0.5">
                Complaint / Remarks:
              </span>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-slate-800">
                {complaintRemarks}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Signatures Footer */}
        <div className="pt-8 pb-4">
          <div className="grid grid-cols-3 gap-6 text-center text-xs">
            <div className="border-t-2 border-slate-900 pt-2 text-slate-700">
              Received By
            </div>
            <div className="border-t-2 border-slate-900 pt-2 text-slate-700">
              Verified By
            </div>
            <div className="border-t-2 border-slate-900 pt-2 text-slate-700 font-bold">
              Authorized Signature
            </div>
          </div>
        </div>

        {/* 6. Document Footer */}
        <div className="mt-6 pt-3 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-500 flex justify-between">
          <span>ServiceDesk 360 • Asset Management</span>
          <span>Printed: {printedDateTime}</span>
          <span>Track ID: {trackId}</span>
        </div>
      </div>

      <style jsx global>{`
        @media screen {
          .received-material-print-document {
            display: none !important;
          }
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          body * {
            visibility: hidden !important;
          }
          .received-material-print-document,
          .received-material-print-document * {
            visibility: visible !important;
          }
          .received-material-print-document {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
