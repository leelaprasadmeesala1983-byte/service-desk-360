"use client";

import { PrintReportHeader } from "@/components/assets/reports/print/print-report-header";
import { formatDate, formatDateTime, formatRecordId } from "@/lib/format";
import type { SendToVendorRow } from "@/types/send-to-vendor";

type CustomerReturnPrintReceiptProps = {
  item: SendToVendorRow | null;
};

export function CustomerReturnPrintReceipt({
  item,
}: CustomerReturnPrintReceiptProps) {
  if (!item) return null;

  const dispatchId = item.seq ? formatRecordId("STV", item.seq) : item.id;
  const items = Array.isArray(item.items) ? item.items : [];

  const customerName = item.customerName || item.asset?.customerName || "—";
  const customerNumber = item.asset?.customerNumber || item.phoneNumber || "—";
  const vendorName = item.vendorName || "—";
  const vendorContact = item.contactPerson || "—";

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

  return (
    <div className="customer-return-print-receipt">
      <div className="w-full bg-white text-black p-4 font-sans text-xs box-border">
        {/* 1. Header */}
        <PrintReportHeader reportTitle="CUSTOMER RETURN RECEIPT" />

        {/* 2. Metadata Grid */}
        <div className="grid grid-cols-2 gap-4 py-3 border-b border-black text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-600 font-medium">
                Dispatch / Receipt ID:
              </span>
              <span className="font-mono font-bold text-black">
                {dispatchId}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-600 font-medium">Issue Date:</span>
              <span className="font-medium text-black">{receivedDate}</span>
            </div>
          </div>

          <div className="space-y-1 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-zinc-600 font-medium">Status:</span>
              <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                Customer Received
              </span>
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-zinc-600 font-medium">Received At:</span>
              <span className="font-mono font-semibold text-black">
                {receivedDateTime}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Customer & Vendor Details */}
        <div className="grid grid-cols-2 gap-4 py-3 border-b border-black text-xs">
          <div className="rounded border border-zinc-300 bg-zinc-50 p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
              Customer Details
            </span>
            <p className="font-bold text-black text-sm">{customerName}</p>
            {customerNumber !== "—" && (
              <p className="text-zinc-700 mt-0.5">Contact: {customerNumber}</p>
            )}
          </div>

          <div className="rounded border border-zinc-300 bg-zinc-50 p-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-1">
              Vendor Serviced By
            </span>
            <p className="font-bold text-black text-sm">{vendorName}</p>
            {vendorContact !== "—" && (
              <p className="text-zinc-700 mt-0.5">Contact: {vendorContact}</p>
            )}
          </div>
        </div>

        {/* 4. Returned Material Details Table */}
        <div className="py-3 border-b border-black">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-2">
            Returned Material Details
          </span>

          <table className="w-full table-fixed text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-black bg-zinc-100">
                <th className="w-[22%] py-1.5 px-2 font-bold text-black">
                  Track ID
                </th>
                <th className="w-[28%] py-1.5 px-2 font-bold text-black">
                  Product
                </th>
                <th className="w-[26%] py-1.5 px-2 font-bold text-black">
                  Details
                </th>
                <th className="w-[24%] py-1.5 px-2 font-bold text-black">
                  Serial No.
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((prod, idx) => {
                  const productDetails = [prod.brandName, prod.modelNumber]
                    .filter(Boolean)
                    .join(" - ");
                  return (
                    <tr
                      key={prod.receivedItemId || idx}
                      className="border-b border-zinc-200"
                    >
                      <td className="py-2 px-2 font-mono font-bold text-black break-words">
                        {prod.trackId ||
                          (item.assetSeq
                            ? formatRecordId("ASSET", item.assetSeq)
                            : "—")}
                      </td>
                      <td className="py-2 px-2 font-semibold text-black break-words">
                        {prod.productName}
                      </td>
                      <td className="py-2 px-2 text-zinc-700 break-words">
                        {productDetails || "—"}
                      </td>
                      <td className="py-2 px-2 font-mono font-medium text-black break-words">
                        {prod.serialNumber || "—"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr className="border-b border-zinc-200">
                  <td className="py-2 px-2 font-mono font-bold text-black break-words">
                    {item.assetSeq
                      ? formatRecordId("ASSET", item.assetSeq)
                      : "—"}
                  </td>
                  <td className="py-2 px-2 font-semibold text-black break-words">
                    {item.assetName || "Product"}
                  </td>
                  <td className="py-2 px-2 text-zinc-700 break-words">—</td>
                  <td className="py-2 px-2 font-mono font-medium text-black break-words">
                    {item.serialNumber || "—"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Courier Details */}
        <div className="grid grid-cols-2 gap-3 py-2.5 border-b border-black text-xs">
          <div>
            <span className="text-zinc-600">Courier / Handover:</span>
            <p className="font-semibold text-black mt-0.5">
              {item.courierName || "Direct Handover"}
            </p>
          </div>
          {item.docketAwbNumber && (
            <div>
              <span className="text-zinc-600">Docket / Reference No:</span>
              <p className="font-mono font-semibold text-black mt-0.5">
                {item.docketAwbNumber}
              </p>
            </div>
          )}
        </div>

        {/* 6. Customer Acknowledgement & Signatures */}
        <div className="pt-5 pb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block mb-5 text-center">
            Customer Acknowledgement
          </span>

          <div className="grid grid-cols-3 gap-4 text-xs">
            <div className="space-y-3">
              <div className="border-b border-black pb-1">
                <span className="font-semibold text-black truncate block">
                  {customerName}
                </span>
              </div>
              <span className="text-[10px] text-zinc-600 block">
                Customer Name
              </span>
            </div>

            <div className="space-y-3">
              <div className="border-b border-black pb-1 h-5" />
              <span className="text-[10px] text-zinc-600 block text-center">
                Authorized Signature
              </span>
            </div>

            <div className="space-y-3">
              <div className="border-b border-black pb-1">
                <span className="font-medium text-black block text-right">
                  {receivedDate}
                </span>
              </div>
              <span className="text-[10px] text-zinc-600 block text-right">
                Date
              </span>
            </div>
          </div>
        </div>

        {/* 7. Footer Note */}
        <div className="mt-6 pt-3 border-t border-dashed border-zinc-400 text-center text-[9px] text-zinc-500">
          <p>
            This is an official system-generated Material Return Receipt from
            MARUTHI IT SERVICES.
          </p>
          <p className="mt-0.5">
            Materials received in verified and satisfactory condition.
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media screen {
          .customer-return-print-receipt {
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
          .customer-return-print-receipt,
          .customer-return-print-receipt * {
            visibility: visible !important;
          }
          .customer-return-print-receipt {
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
