"use client";

import { Printer, X } from "lucide-react";
import { useEffect } from "react";
import { PrintReportHeader } from "@/components/assets/reports/print/print-report-header";
import { formatDate, formatDateTime } from "@/lib/format";
import type { CustomerReportData } from "@/types/reports";

type CustomerPrintReportProps = {
  data: CustomerReportData;
};

export function CustomerPrintReport({ data }: CustomerPrintReportProps) {
  const { summary, materials } = data;
  const now = new Date();
  const generatedDate = formatDate(now);
  const generatedTime = formatDateTime(now).split(",")[1]?.trim() || "";

  useEffect(() => {
    // Automatically trigger browser print dialog after render
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
            Customer Report Print Preview
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
        <PrintReportHeader reportTitle="CUSTOMER REPORT" />

        {/* 2. Customer Summary Banner & Details */}
        <div className="py-4 border-b border-zinc-300">
          <div className="bg-zinc-50 p-3.5 rounded-lg border border-zinc-200 mb-3">
            <div className="text-sm font-bold text-zinc-900 flex flex-wrap items-center gap-2">
              <span>{summary.customerName}</span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-700 font-mono">
                {summary.customerNumber || "—"}
              </span>
              {summary.address && (
                <>
                  <span className="text-zinc-400">·</span>
                  <span className="text-zinc-700">{summary.address}</span>
                </>
              )}
              <span className="text-zinc-400">·</span>
              <span className="text-blue-700 font-bold">
                {materials.length} item(s)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-zinc-500 font-semibold block text-[10px] uppercase">
                Customer Name
              </span>
              <span className="font-bold text-zinc-900 text-sm mt-0.5 block">
                {summary.customerName}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 font-semibold block text-[10px] uppercase">
                Mobile Number
              </span>
              <span className="font-semibold text-zinc-900 text-sm mt-0.5 block">
                {summary.customerNumber || "—"}
              </span>
            </div>
            <div>
              <span className="text-zinc-500 font-semibold block text-[10px] uppercase">
                Address
              </span>
              <span className="font-medium text-zinc-900 text-sm mt-0.5 block">
                {summary.address || "—"}
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

        {/* 3. Complete Customer Material Table */}
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
                <th className="py-2 px-2 font-bold text-zinc-900 border-r border-zinc-200 w-24">
                  Date
                </th>
                <th className="py-2 px-2 font-bold text-zinc-900 border-r border-zinc-200">
                  Product
                </th>
                <th className="py-2 px-2 font-bold text-zinc-900 border-r border-zinc-200 w-24">
                  Serial
                </th>
                <th className="py-2 px-2 font-bold text-zinc-900 border-r border-zinc-200 w-28">
                  Vendor
                </th>
                <th className="py-2 px-2 font-bold text-zinc-900 border-r border-zinc-200 w-28">
                  Status
                </th>
                <th className="py-2 px-2 font-bold text-zinc-900 w-28">
                  Location
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
                    No material records found for this customer.
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
                    <td className="py-2 px-2 text-zinc-700 border-r border-b border-zinc-200 whitespace-nowrap">
                      {formatDate(m.receivedDate)}
                    </td>
                    <td className="py-2 px-2 border-r border-b border-zinc-200 font-medium text-zinc-900">
                      <div>{m.product}</div>
                      {m.complaint && (
                        <div className="text-[10px] text-zinc-500 italic truncate max-w-xs">
                          {m.complaint}
                        </div>
                      )}
                    </td>
                    <td className="py-2 px-2 font-mono text-zinc-700 border-r border-b border-zinc-200">
                      {m.serialNumber}
                    </td>
                    <td className="py-2 px-2 text-zinc-700 border-r border-b border-zinc-200">
                      {m.vendor || "—"}
                    </td>
                    <td className="py-2 px-2 font-semibold text-zinc-900 border-r border-b border-zinc-200 whitespace-nowrap">
                      {m.currentStatus}
                    </td>
                    <td className="py-2 px-2 text-zinc-700 border-b border-zinc-200 whitespace-nowrap">
                      {m.location || summary.address || "—"}
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
