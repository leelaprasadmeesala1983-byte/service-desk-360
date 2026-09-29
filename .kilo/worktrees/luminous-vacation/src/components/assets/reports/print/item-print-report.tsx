"use client";

import { CheckCircle2, Circle, Printer, X } from "lucide-react";
import { useEffect } from "react";
import { PrintReportHeader } from "@/components/assets/reports/print/print-report-header";
import { formatDate, formatDateTime } from "@/lib/format";
import type { ItemReportData } from "@/types/reports";

type ItemPrintReportProps = {
  data: ItemReportData;
};

export function ItemPrintReport({ data }: ItemPrintReportProps) {
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
      <div className="no-print max-w-4xl mx-auto mb-6 flex items-center justify-between bg-white p-4 rounded-xl border border-border shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm text-foreground">
            Material Full Report Preview
          </span>
          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
            {data.trackId}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-colors"
          >
            <Printer className="size-4" />
            Print Full Report / Save as PDF
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
        <PrintReportHeader reportTitle="MATERIAL SERVICE & REPAIR FULL REPORT" />

        {/* 2. Track ID & Current Status Banner */}
        <div className="flex items-center justify-between py-3.5 border-b border-zinc-300 bg-zinc-50 px-4 mt-4 rounded border">
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 font-semibold uppercase">
              Track ID:
            </span>
            <span className="font-mono text-base font-bold text-zinc-900">
              {data.trackId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-semibold uppercase">
              Current Status:
            </span>
            <span className="px-2.5 py-0.5 rounded font-bold text-xs bg-zinc-900 text-white uppercase tracking-wide">
              {data.currentStatus}
            </span>
          </div>
        </div>

        {/* 3. Material & Customer Information (2 Column Layout) */}
        <div className="grid grid-cols-2 gap-6 py-4 border-b border-zinc-300 text-xs">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block pb-1 border-b border-zinc-200">
              Customer Details
            </span>
            <div className="flex items-start gap-2">
              <span className="text-zinc-500 font-semibold w-28 shrink-0">
                Customer:
              </span>
              <span className="font-bold text-zinc-900">{data.customer}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-semibold w-28 shrink-0">
                Mobile Number:
              </span>
              <span className="font-medium text-zinc-900">
                {data.customerMobile}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-zinc-500 font-semibold w-28 shrink-0">
                Address:
              </span>
              <span className="text-zinc-900">{data.customerAddress}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-semibold w-28 shrink-0">
                Received Date:
              </span>
              <span className="font-medium text-zinc-900">
                {formatDate(data.receivedDate)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block pb-1 border-b border-zinc-200">
              Product & Repair Details
            </span>
            <div className="flex items-start gap-2">
              <span className="text-zinc-500 font-semibold w-28 shrink-0">
                Product:
              </span>
              <span className="font-bold text-zinc-900">{data.product}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-semibold w-28 shrink-0">
                Category / Type:
              </span>
              <span className="text-zinc-900">{data.category}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-semibold w-28 shrink-0">
                Serial Number:
              </span>
              <span className="font-mono font-medium text-zinc-900">
                {data.serialNumber}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-zinc-500 font-semibold w-28 shrink-0">
                Complaint / Fault:
              </span>
              <span className="text-zinc-900">{data.complaint}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-semibold w-28 shrink-0">
                Assigned Vendor:
              </span>
              <span className="text-zinc-900">{data.vendor}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 font-semibold w-28 shrink-0">
                Repair Status:
              </span>
              <span className="font-semibold text-zinc-900">
                {data.repairStatus.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Complete Dynamic Journey Timeline */}
        <div className="py-5 border-b border-zinc-300">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 block mb-3">
            Complete Material Journey Timeline
          </span>

          <div className="relative pl-6 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-2.5 before:w-0.5 before:bg-zinc-300">
            {data.timeline.map((event, idx) => (
              <div key={event.id || idx} className="relative group text-xs">
                {/* Timeline Dot */}
                <div className="absolute -left-6 top-0.5 flex size-5 items-center justify-center rounded-full bg-white border-2 border-zinc-900">
                  {idx === data.timeline.length - 1 ? (
                    <CheckCircle2 className="size-3 text-emerald-600" />
                  ) : (
                    <Circle className="size-2 fill-zinc-900 text-zinc-900" />
                  )}
                </div>

                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-900 text-sm">
                      {event.title}
                    </span>
                    <span className="font-medium text-zinc-500 text-[11px]">
                      {event.date} {event.time && `· ${event.time}`}
                    </span>
                  </div>
                  <p className="text-zinc-700 mt-1">{event.description}</p>
                  {(event.courier || event.docketNumber) && (
                    <div className="mt-1.5 flex items-center gap-4 text-[11px] text-zinc-600 font-mono">
                      {event.courier && <span>Carrier: {event.courier}</span>}
                      {event.docketNumber && (
                        <span>Docket / AWB: {event.docketNumber}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Final Status Banner */}
        <div className="mt-5 p-3 rounded-lg bg-emerald-50 border border-emerald-300 text-center">
          <span className="font-bold text-emerald-900 text-sm">
            Current Lifecycle Status: {data.currentStatus}
          </span>
        </div>

        {/* 6. Footer & Signatures */}
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
                  Authorized Signature
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
        }
      `}</style>
    </div>
  );
}
