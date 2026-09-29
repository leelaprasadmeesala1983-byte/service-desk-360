"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Circle,
  Loader2,
  Package,
  Printer,
  Search,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ItemReportData } from "@/types/reports";

type ItemReportViewProps = {
  initialTrackId?: string;
};

export function ItemReportView({ initialTrackId = "" }: ItemReportViewProps) {
  const [searchQuery, setSearchQuery] = useState(initialTrackId);
  const [reportData, setReportData] = useState<ItemReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (overrideQuery?: string) => {
    const q = (
      overrideQuery !== undefined ? overrideQuery : searchQuery
    ).trim();
    if (!q) {
      toast.error("Please enter a Track ID or Serial Number to search.");
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    fetch(`/api/reports/items?trackId=${encodeURIComponent(q)}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(
            err.error || `No material found with Track ID "${q}".`,
          );
        }
        return res.json();
      })
      .then((data: ItemReportData) => {
        setReportData(data);
      })
      .catch((err: Error) => {
        setReportData(null);
        setError(err.message || "Failed to find item report.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handlePrint = () => {
    if (!reportData) {
      toast.error("Please search and load a material first.");
      return;
    }
    const printUrl = `/reports/print/item?trackId=${encodeURIComponent(reportData.trackId)}`;
    window.open(
      printUrl,
      "_blank",
      "noopener,noreferrer,width=1000,height=800",
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Print Full Report Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Item Report
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            View complete service journey and lifecycle timeline for an
            individual material or track ID.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handlePrint}
            disabled={!reportData || loading}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold"
          >
            <Printer className="size-4" />
            Print Full Report
          </Button>
        </div>
      </div>

      {/* 2. Track ID Search Section */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
        <label
          htmlFor="track-id-search-input"
          className="text-xs font-bold text-foreground block mb-2 uppercase tracking-wider"
        >
          Track ID / Serial Number Search
        </label>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              id="track-id-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. AST-1001 or REP-2026-00019 or Serial Number..."
              className="h-10 pl-9 pr-8 text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <Button
            onClick={() => handleSearch()}
            disabled={loading || !searchQuery.trim()}
            className="h-10 px-5 gap-2 bg-primary text-primary-foreground font-semibold shrink-0 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}
            Search
          </Button>
        </div>
      </div>

      {/* 3. Item Report Content or Empty States */}
      {loading ? (
        <div className="py-16 text-center border border-border bg-card rounded-xl">
          <Loader2 className="size-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm font-semibold text-foreground">
            Searching Material Records...
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Retrieving complete workflow history and timeline.
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center border border-destructive/30 bg-destructive/5 rounded-xl text-destructive space-y-3">
          <AlertCircle className="size-8 mx-auto text-destructive" />
          <p className="text-sm font-semibold">{error}</p>
          <p className="text-xs text-muted-foreground">
            Please verify the Track ID (e.g. AST-1001) or serial number and try
            again.
          </p>
        </div>
      ) : !reportData ? (
        <div className="py-16 text-center border border-dashed border-border bg-card/50 rounded-xl">
          <Package className="size-10 mx-auto text-muted-foreground/60 mb-3" />
          <p className="text-base font-bold text-foreground">
            {hasSearched ? "No Material Found" : "Track ID Search"}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Enter a Track ID (e.g. AST-1001) or Serial Number above and click
            Search to view complete lifecycle journey.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Info Banner with Badges */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 mb-4">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase">
                    Track ID:
                  </span>
                  <span className="font-mono text-lg font-bold text-primary bg-primary/10 px-3 py-0.5 rounded-md border border-primary/20">
                    {reportData.trackId}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-md text-xs font-semibold text-foreground border border-border">
                  <User className="size-3.5 text-muted-foreground" />
                  <span>Customer: {reportData.customer}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">
                  Status:
                </span>
                <span
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider inline-block",
                    reportData.currentStatus === "Returned to Customer" ||
                      reportData.currentStatus === "Customer Returned" ||
                      reportData.currentStatus === "Delivered"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                      : reportData.currentStatus === "Under Repair" ||
                          reportData.currentStatus === "Sent to Vendor"
                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                        : reportData.currentStatus === "Received From Vendor"
                          ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
                  )}
                >
                  {reportData.currentStatus}
                </span>
              </div>
            </div>

            {/* 2-Column Responsive Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Left Column: Customer & Basic Meta */}
              <div className="space-y-3 rounded-lg bg-muted/20 p-4 border border-border/60">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block border-b border-border pb-1.5">
                  Customer & Location Details
                </span>

                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-muted-foreground font-semibold">
                    Customer:
                  </span>
                  <span className="col-span-2 font-bold text-foreground text-sm">
                    {reportData.customer}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-muted-foreground font-semibold">
                    Mobile Number:
                  </span>
                  <span className="col-span-2 font-mono font-medium text-foreground">
                    {reportData.customerMobile || "—"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-muted-foreground font-semibold">
                    Address / Location:
                  </span>
                  <span className="col-span-2 text-foreground">
                    {reportData.customerAddress || "—"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-muted-foreground font-semibold">
                    Received Date:
                  </span>
                  <span className="col-span-2 font-medium text-foreground">
                    {formatDate(reportData.receivedDate)}
                  </span>
                </div>
              </div>

              {/* Right Column: Product & Repair Details */}
              <div className="space-y-3 rounded-lg bg-muted/20 p-4 border border-border/60">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block border-b border-border pb-1.5">
                  Product & Service Details
                </span>

                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-muted-foreground font-semibold">
                    Product:
                  </span>
                  <span className="col-span-2 font-bold text-foreground text-sm">
                    {reportData.product}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-muted-foreground font-semibold">
                    Category / Type:
                  </span>
                  <span className="col-span-2 text-foreground">
                    {reportData.category}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-muted-foreground font-semibold">
                    Serial Number:
                  </span>
                  <span className="col-span-2 font-mono font-bold text-foreground">
                    {reportData.serialNumber}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-muted-foreground font-semibold">
                    Complaint / Fault:
                  </span>
                  <span className="col-span-2 text-foreground italic">
                    {reportData.complaint}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-muted-foreground font-semibold">
                    Assigned Vendor:
                  </span>
                  <span className="col-span-2 font-medium text-foreground">
                    {reportData.vendor}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 py-1">
                  <span className="text-muted-foreground font-semibold">
                    Repair Status:
                  </span>
                  <span className="col-span-2 font-semibold text-foreground">
                    {reportData.repairStatus.replace(/_/g, " ")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Complete Dynamic Journey Timeline */}
          <div className="rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-6">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  Complete Material Journey Timeline
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dynamic chronological audit log of all transitions from
                  receipt to return.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {reportData.timeline.length} Milestones
              </span>
            </div>

            {/* Vertical Timeline */}
            <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:top-3 before:bottom-3 before:left-3 sm:before:left-4 before:w-0.5 before:bg-border">
              {reportData.timeline.map((event, idx) => {
                const isLast = idx === reportData.timeline.length - 1;
                return (
                  <div
                    key={event.id || idx}
                    className="relative group text-xs sm:text-sm"
                  >
                    {/* Circle Pin */}
                    <div
                      className={cn(
                        "absolute -left-6 sm:-left-8 top-1 flex size-6 items-center justify-center rounded-full bg-background border-2 transition-transform group-hover:scale-110",
                        isLast
                          ? "border-emerald-500 text-emerald-600 shadow-xs"
                          : "border-primary text-primary",
                      )}
                    >
                      {isLast ? (
                        <CheckCircle2 className="size-3.5 fill-emerald-500/20" />
                      ) : (
                        <Circle className="size-2 fill-primary" />
                      )}
                    </div>

                    <div className="rounded-xl border border-border bg-muted/30 hover:bg-muted/50 p-4 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                        <span className="font-bold text-foreground text-sm sm:text-base">
                          {event.title}
                        </span>
                        <span className="font-medium text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-muted-foreground/70" />
                          {event.date} {event.time && `· ${event.time}`}
                        </span>
                      </div>

                      <p className="text-muted-foreground text-xs sm:text-sm">
                        {event.description}
                      </p>

                      {(event.vendorOrPerson ||
                        event.courier ||
                        event.docketNumber) && (
                        <div className="mt-2.5 pt-2 border-t border-border/50 flex flex-wrap items-center gap-4 text-xs font-mono text-muted-foreground">
                          {event.vendorOrPerson && (
                            <span>
                              Party:{" "}
                              <strong className="text-foreground font-semibold">
                                {event.vendorOrPerson}
                              </strong>
                            </span>
                          )}
                          {event.courier && (
                            <span>
                              Carrier:{" "}
                              <strong className="text-foreground font-semibold">
                                {event.courier}
                              </strong>
                            </span>
                          )}
                          {event.docketNumber && (
                            <span className="bg-background px-2 py-0.5 rounded border border-border">
                              Docket:{" "}
                              <strong className="text-foreground">
                                {event.docketNumber}
                              </strong>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
