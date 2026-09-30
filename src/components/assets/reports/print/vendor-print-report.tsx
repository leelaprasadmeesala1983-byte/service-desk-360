"use client";

import { Printer, X } from "lucide-react";
import { useEffect } from "react";
import { PrintReportHeader } from "@/components/assets/reports/print/print-report-header";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import type { VendorReportData } from "@/types/reports";

type VendorPrintReportProps = {
  data: VendorReportData;
};

export function VendorPrintReport({ data }: VendorPrintReportProps) {
  const summary = data?.summary || {
    vendorName: "Vendor",
    contactPerson: "",
    phoneNumber: "",
    email: "",
    address: "",
    totalMaterials: 0,
    sentToVendor: 0,
    vendorReceived: 0,
    underRepair: 0,
    returnedToCustomer: 0,
    totalRepairCost: 0,
  };
  const materials = Array.isArray(data?.materials) ? data.materials : [];
  const now = new Date();
  const generatedDate = formatDate(now);
  const generatedTime = formatDateTime(now).split(",")[1]?.trim() || "";

  useEffect(() => {
    // Auto trigger print
    const timer = setTimeout(() => {
      window.print();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-100 p-4 sm:p-8 print:p-0 print:bg-white text-zinc-900 font-sans">
      {/* On-screen control bar (Hidden in print) */}
      <div className="no-print max-w-4xl mx-auto mb-6 flex items-center justify-between bg-white p-4 rounded-xl border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-zinc-900">
            Vendor Report Print Preview
          </span>
          <span className="text-xs text-zinc-500">
            ({materials.length} item(s))
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <Printer className="size-4" />
            Print Report / Save as PDF
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg text-xs font-medium cursor-pointer transition-colors"
          >
            <X className="size-4" />
            Close
          </button>
        </div>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto bg-white p-8 sm:p-10 rounded-2xl shadow-md border border-zinc-200 print:shadow-none print:border-none print:p-0 print:max-w-none">
        {/* 1. Header */}
        <PrintReportHeader reportTitle="VENDOR REPORT" />

        {/* 2. Vendor Summary Banner & Details */}
        <div className="py-4 border-b border-zinc-300">
          <div className="bg-zinc-50 p-3.5 rounded-lg border border-zinc-200 mb-3">
            <div className="text-sm font-bold text-zinc-900 flex flex-wrap items-center gap-2">
              <span>{summary.vendorName}</span>
              <span className="text-zinc-400">·</span>
              <span className="text-blue-700 font-bold">
                {materials.length} item(s)
              </span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-900">
                Total Cost {formatCurrency(summary.totalRepairCost)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-zinc-500 font-semibold block text-[10px] uppercase">
                Vendor Name
              </span>
              <span className="font-bold text-zinc-900 text-sm mt-0.5 block">
                {summary.vendorName}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 font-semibold block text-[10px] uppercase">
                Contact Person
              </span>
              <span className="font-semibold text-zinc-900 text-sm mt-0.5 block">
                {summary.contactPerson || "—"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 font-semibold block text-[10px] uppercase">
                Mobile Number
              </span>
              <span className="font-medium text-zinc-900 text-sm mt-0.5 block">
                {summary.phoneNumber || "—"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 font-semibold block text-[10px] uppercase">
                Total Items
              </span>
              <span className="font-bold text-blue-700 text-sm mt-0.5 block">
                {materials.length}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Complete Vendor Material Table */}
        <div className="py-4">
          <table className="w-full text-left text-[11px] border-collapse border border-zinc-300">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-300">
                <th className="py-2 px-1.5 font-bold text-zinc-900 border-r border-zinc-200 text-center w-8">
                  #
                </th>
                <th className="py-2 px-2 font-bold text-zinc-900 border-r border-zinc-200 w-24">
                  Track ID
                </th>
                <th className="py-2 px-2 font-bold text-zinc-900 border-r border-zinc-200 w-36">
                  Customer
                </th>
                <th className="py-2 px-2 font-bold text-zinc-900 border-r border-zinc-200">
                  Product
                </th>
                <th className="py-2 px-2 font-bold text-zinc-900 border-r border-zinc-200 w-28">
                  Serial
                </th>
                <th className="py-2 px-2 font-bold text-zinc-900 border-r border-zinc-200 w-24">
                  Sent Date
                </th>
                <th className="py-2 px-2 font-bold text-zinc-900 border-r border-zinc-200 w-28">
                  Status
                </th>
                <th className="py-2 px-2 font-bold text-zinc-900 text-right w-24">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {materials.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-6 text-center text-zinc-500 italic border-b border-zinc-200"
                  >
                    No material records found for this vendor.
                  </td>
                </tr>
              ) : (
                materials.map((m, idx) => (
                  <tr
                    key={m.id}
                    className={idx % 2 === 1 ? "bg-zinc-50/70" : "bg-white"}
                  >
                    <td className="py-2 px-1.5 text-center text-zinc-500 border-r border-b border-zinc-200">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-2 font-mono font-bold text-zinc-900 border-r border-b border-zinc-200 whitespace-nowrap">
                      {m.trackId}
                    </td>
                    <td className="py-2 px-2 border-r border-b border-zinc-200 font-medium text-zinc-900">
                      {m.customer}
                    </td>
                    <td className="py-2 px-2 border-r border-b border-zinc-200 text-zinc-800">
                      {m.product}
                    </td>
                    <td className="py-2 px-2 font-mono text-zinc-700 border-r border-b border-zinc-200">
                      {m.serialNumber}
                    </td>
                    <td className="py-2 px-2 text-zinc-700 border-r border-b border-zinc-200 whitespace-nowrap">
                      {formatDate(m.sentDate)}
                    </td>
                    <td className="py-2 px-2 font-semibold text-zinc-900 border-r border-b border-zinc-200 whitespace-nowrap">
                      {m.currentStatus}
                    </td>
                    <td className="py-2 px-2 text-right font-mono font-bold text-zinc-900 border-b border-zinc-200 whitespace-nowrap">
                      {formatCurrency(m.repairCost)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Footer & Signature Section */}
        <div className="mt-8 pt-6 border-t-2 border-zinc-900">
          <div className="grid grid-cols-2 gap-8 text-xs">
            <div className="space-y-1">
              <div className="text-zinc-600 font-medium">
                Generated Date:{" "}
                <span className="font-semibold text-zinc-900">
                  {generatedDate}
                </span>
              </div>
              <div className="text-zinc-600 font-medium">
                Generated Time:{" "}
                <span className="font-semibold text-zinc-900">
                  {generatedTime}
                </span>
              </div>
              <p className="text-[9px] text-zinc-500 mt-2">
                This is an official system-generated service report from MARUTHI
                IT SERVICES.
              </p>
            </div>

            <div className="space-y-12 text-right">
              <div className="h-10" />
              <div className="border-t border-zinc-900 pt-1 inline-block min-w-48 text-center">
                <span className="text-xs font-bold text-zinc-900 block uppercase">
                  Signature
                </span>
                <span className="text-[10px] text-zinc-500 block">
                  MARUTHI IT SERVICES
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}</style>
    </div>
  );
}
