"use client";

import {
  AlertCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  normalizeVendorRecord,
  printSingleReportRecord,
  type UnifiedReportRecord,
} from "@/lib/utils/print-report-record";
import { printVendorReportDirect } from "@/lib/utils/print-reports";
import type {
  VendorMaterialItem,
  VendorReportData,
  VendorReportOption,
} from "@/types/reports";
import { ReportRecordDetailDialog } from "./report-record-detail-dialog";

type VendorReportViewProps = {
  initialOptions?: VendorReportOption[];
};

export function VendorReportView({
  initialOptions = [],
}: VendorReportViewProps) {
  // Vendor dropdown options
  const [vendorOptions, setVendorOptions] =
    useState<VendorReportOption[]>(initialOptions);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");

  // Report state
  const [reportData, setReportData] = useState<VendorReportData | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Individual Record Dialog State
  const [selectedRecord, setSelectedRecord] =
    useState<UnifiedReportRecord | null>(null);
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch vendor options on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingOptions(true);
    fetch("/api/reports/vendors")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.vendors) {
          setVendorOptions(data.vendors);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch vendor options", err);
      })
      .finally(() => {
        if (isMounted) setLoadingOptions(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch report
  const fetchReport = useCallback(
    (vendorId: string, newPage = page, newLimit = limit) => {
      if (!vendorId) {
        setReportData(null);
        return;
      }

      setLoadingReport(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: String(newPage),
        limit: String(newLimit),
      });

      fetch(
        `/api/reports/vendors/${encodeURIComponent(vendorId)}?${queryParams.toString()}`,
      )
        .then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to load vendor report");
          }
          return res.json();
        })
        .then((data: VendorReportData) => {
          setReportData(data);
          setPage(data.pagination.page);
          setLimit(data.pagination.limit);
        })
        .catch((err: Error) => {
          setError(err.message || "Failed to load vendor report.");
          toast.error("Failed to load vendor report.");
        })
        .finally(() => {
          setLoadingReport(false);
        });
    },
    [page, limit],
  );

  const handleSelectVendor = (vend: VendorReportOption) => {
    setSelectedVendorId(vend.id);
    setDropdownOpen(false);
    setDropdownSearch("");
    setPage(1);
    fetchReport(vend.id, 1, limit);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (selectedVendorId) {
      fetchReport(selectedVendorId, newPage, limit);
    }
  };

  const handleViewRecord = (item: VendorMaterialItem) => {
    const unified = normalizeVendorRecord(
      item,
      reportData?.summary.address,
      reportData?.summary.vendorName,
    );
    setSelectedRecord(unified);
    setRecordDialogOpen(true);
  };

  const handlePrintRecord = (item: VendorMaterialItem) => {
    const unified = normalizeVendorRecord(
      item,
      reportData?.summary.address,
      reportData?.summary.vendorName,
    );
    printSingleReportRecord(unified);
  };

  const handlePrint = () => {
    if (!reportData) {
      toast.error("Please select a vendor and load report data first.");
      return;
    }
    // Direct client print ensures instant generation with 0 failures
    printVendorReportDirect(reportData);
  };

  const filteredDropdownOptions = vendorOptions.filter((v) => {
    const s = dropdownSearch.toLowerCase().trim();
    if (!s) return true;
    return (
      v.vendorName.toLowerCase().includes(s) ||
      v.contactPerson.toLowerCase().includes(s) ||
      v.phoneNumber.includes(s) ||
      v.address?.toLowerCase().includes(s)
    );
  });

  const selectedVendor = vendorOptions.find((v) => v.id === selectedVendorId);

  return (
    <div className="space-y-4">
      {/* 1. SELECT VENDOR & PRINT REPORT ROW */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex-1 max-w-md">
          <label
            htmlFor="vendor-select-btn"
            className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase block mb-1.5"
          >
            SELECT VENDOR
          </label>

          <div className="relative" ref={dropdownRef}>
            <button
              id="vendor-select-btn"
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between border border-input bg-card rounded-lg px-3.5 py-2 text-sm cursor-pointer hover:border-primary/50 transition-colors text-left shadow-xs"
            >
              <span
                className={cn(
                  "truncate text-xs sm:text-sm",
                  !selectedVendor
                    ? "text-muted-foreground"
                    : "font-semibold text-foreground",
                )}
              >
                {selectedVendor
                  ? `${selectedVendor.vendorName} (${selectedVendor.itemCount} items)`
                  : "Select Vendor..."}
              </span>
              <ChevronDown className="size-4 text-muted-foreground shrink-0 ml-2" />
            </button>

            {dropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in-50 zoom-in-95">
                <div className="p-2 border-b border-border bg-muted/40">
                  <div className="relative">
                    <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      value={dropdownSearch}
                      onChange={(e) => setDropdownSearch(e.target.value)}
                      placeholder="Search vendor name, contact..."
                      className="h-8 pl-8 text-xs bg-background"
                      autoFocus
                    />
                    {dropdownSearch && (
                      <button
                        type="button"
                        onClick={() => setDropdownSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-60 overflow-y-auto py-1 divide-y divide-border/30">
                  {loadingOptions ? (
                    <div className="p-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="size-3.5 animate-spin text-primary" />
                      Loading vendors...
                    </div>
                  ) : filteredDropdownOptions.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No vendors found matching &quot;{dropdownSearch}&quot;
                    </div>
                  ) : (
                    filteredDropdownOptions.map((vend) => (
                      <button
                        key={vend.id}
                        type="button"
                        onClick={() => handleSelectVendor(vend)}
                        className={cn(
                          "w-full text-left px-3.5 py-2 text-xs cursor-pointer hover:bg-accent flex items-center justify-between gap-2 transition-colors",
                          selectedVendorId === vend.id
                            ? "bg-accent/80 font-bold"
                            : "",
                        )}
                      >
                        <span className="font-medium text-foreground truncate">
                          {vend.vendorName}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0 font-semibold">
                          ({vend.itemCount} items)
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <Button
            onClick={handlePrint}
            disabled={!reportData || loadingReport}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-semibold cursor-pointer h-9 px-4 text-xs sm:text-sm"
          >
            <Printer className="size-4" />
            Print Report
          </Button>
        </div>
      </div>

      {/* 2. LOADING / ERROR / EMPTY STATES */}
      {loadingReport ? (
        <div className="py-12 text-center border border-border bg-card rounded-xl">
          <Loader2 className="size-6 animate-spin mx-auto text-primary mb-2" />
          <p className="text-xs font-semibold text-muted-foreground">
            Loading vendor report...
          </p>
        </div>
      ) : error ? (
        <div className="p-4 text-center border border-destructive/30 bg-destructive/5 rounded-xl text-destructive space-y-2">
          <AlertCircle className="size-5 mx-auto text-destructive" />
          <p className="text-xs font-semibold">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedVendorId && fetchReport(selectedVendorId)}
            className="text-xs h-7"
          >
            <RefreshCw className="size-3 mr-1" />
            Retry
          </Button>
        </div>
      ) : !reportData ? (
        <div className="py-12 text-center border border-dashed border-border bg-card/40 rounded-xl">
          <p className="text-xs text-muted-foreground font-medium">
            Select a vendor from the dropdown to view report records.
          </p>
        </div>
      ) : (
        <>
          {/* 3. SELECTED VENDOR SUMMARY LINE */}
          <div className="text-xs sm:text-sm font-bold text-foreground py-1 flex flex-wrap items-center gap-1.5">
            <span>{reportData.summary.vendorName}</span>
            <span className="text-muted-foreground font-normal">·</span>
            <span className="text-primary font-bold">
              {reportData.pagination.total} item(s)
            </span>
            <span className="text-muted-foreground font-normal">·</span>
            <span className="text-muted-foreground font-medium">
              Total Cost {formatCurrency(reportData.summary.totalRepairCost)}
            </span>
          </div>

          {/* 4. VENDOR MATERIAL TABLE WITH ACTIONS */}
          <div className="border border-border bg-card overflow-hidden rounded-xl shadow-xs">
            <div className="overflow-x-auto max-w-full">
              <Table className="min-w-[950px] text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-28 font-bold">Track ID</TableHead>
                    <TableHead className="w-36">Customer</TableHead>
                    <TableHead className="w-44">Product</TableHead>
                    <TableHead className="w-28">Serial</TableHead>
                    <TableHead className="w-24">Sent</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-24 text-right">Cost</TableHead>
                    <TableHead className="w-24 text-right font-bold">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.materials.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No material records found for this vendor.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.materials.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono font-bold text-primary whitespace-nowrap">
                          {item.trackId}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {item.customer}
                        </TableCell>
                        <TableCell className="text-foreground">
                          {item.product}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                          {item.serialNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDate(item.sentDate)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-bold inline-block whitespace-nowrap",
                              item.currentStatus === "Returned to Customer"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : item.currentStatus === "Under Repair" ||
                                    item.currentStatus === "Sent to Vendor"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                  : item.currentStatus === "Vendor Received"
                                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
                            )}
                          >
                            {item.currentStatus}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-foreground whitespace-nowrap">
                          {formatCurrency(item.repairCost)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleViewRecord(item)}
                              aria-label="View Record Details"
                              title="View Record Details"
                              className="size-7 text-foreground/70 hover:text-foreground hover:bg-muted cursor-pointer"
                            >
                              <Eye className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handlePrintRecord(item)}
                              aria-label="Print / PDF Record"
                              title="Print / PDF Record"
                              className="size-7 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                            >
                              <Printer className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          {reportData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="text-muted-foreground">
                Showing {(page - 1) * limit + 1}–
                {Math.min(page * limit, reportData.pagination.total)} of{" "}
                {reportData.pagination.total} records
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 cursor-pointer"
                  disabled={page <= 1 || loadingReport}
                  onClick={() => handlePageChange(page - 1)}
                >
                  <ChevronLeft className="size-3.5" />
                </Button>

                {Array.from(
                  { length: Math.min(5, reportData.pagination.totalPages) },
                  (_, i) => {
                    let pageNum = i + 1;
                    if (reportData.pagination.totalPages > 5 && page > 3) {
                      pageNum = page - 2 + i;
                      if (pageNum > reportData.pagination.totalPages) {
                        pageNum = reportData.pagination.totalPages - 4 + i;
                      }
                    }
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={cn(
                          "border rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                          pageNum === page
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:bg-muted",
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  },
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 cursor-pointer"
                  disabled={
                    page >= reportData.pagination.totalPages || loadingReport
                  }
                  onClick={() => handlePageChange(page + 1)}
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Dialog */}
      <ReportRecordDetailDialog
        open={recordDialogOpen}
        record={selectedRecord}
        onClose={() => {
          setRecordDialogOpen(false);
          setSelectedRecord(null);
        }}
      />
    </div>
  );
}
