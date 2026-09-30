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
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  type UnifiedReportRecord,
  normalizeCustomerRecord,
  printSingleReportRecord,
} from "@/lib/utils/print-report-record";
import { printCustomerReportDirect } from "@/lib/utils/print-reports";
import type {
  CustomerMaterialItem,
  CustomerReportData,
  CustomerReportOption,
} from "@/types/reports";
import { ReportRecordDetailDialog } from "./report-record-detail-dialog";

type CustomerReportViewProps = {
  initialOptions?: CustomerReportOption[];
};

export function CustomerReportView({
  initialOptions = [],
}: CustomerReportViewProps) {
  // Customer options for dropdown
  const [customerOptions, setCustomerOptions] =
    useState<CustomerReportOption[]>(initialOptions);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownSearch, setDropdownSearch] = useState("");

  // Report state
  const [reportData, setReportData] = useState<CustomerReportData | null>(null);
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

  // Fetch customer options on mount
  useEffect(() => {
    let isMounted = true;
    setLoadingOptions(true);
    fetch("/api/reports/customers")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.customers) {
          setCustomerOptions(data.customers);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch customer options", err);
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
    (customerId: string, newPage = page, newLimit = limit) => {
      if (!customerId) {
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
        `/api/reports/customers/${encodeURIComponent(customerId)}?${queryParams.toString()}`,
      )
        .then(async (res) => {
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to load customer report");
          }
          return res.json();
        })
        .then((data: CustomerReportData) => {
          setReportData(data);
          setPage(data.pagination.page);
          setLimit(data.pagination.limit);
        })
        .catch((err: Error) => {
          setError(err.message || "Failed to load customer report.");
          toast.error("Failed to load customer report.");
        })
        .finally(() => {
          setLoadingReport(false);
        });
    },
    [page, limit],
  );

  const handleSelectCustomer = (cust: CustomerReportOption) => {
    setSelectedCustomerId(cust.id);
    setDropdownOpen(false);
    setDropdownSearch("");
    setPage(1);
    fetchReport(cust.id, 1, limit);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (selectedCustomerId) {
      fetchReport(selectedCustomerId, newPage, limit);
    }
  };

  const handleViewRecord = (item: CustomerMaterialItem) => {
    const unified = normalizeCustomerRecord(
      item,
      reportData?.summary.address,
      reportData?.summary.customerNumber,
    );
    setSelectedRecord(unified);
    setRecordDialogOpen(true);
  };

  const handlePrintRecord = (item: CustomerMaterialItem) => {
    const unified = normalizeCustomerRecord(
      item,
      reportData?.summary.address,
      reportData?.summary.customerNumber,
    );
    printSingleReportRecord(unified);
  };

  const handlePrint = () => {
    if (!reportData) {
      toast.error("Please select a customer and load report data first.");
      return;
    }
    // Direct client print ensures instant generation with 0 failures
    printCustomerReportDirect(reportData);
  };

  const filteredDropdownOptions = customerOptions.filter((c) => {
    const s = dropdownSearch.toLowerCase().trim();
    if (!s) return true;
    return (
      c.customerName.toLowerCase().includes(s) ||
      c.customerNumber.includes(s) ||
      c.location?.toLowerCase().includes(s)
    );
  });

  const selectedCustomer = customerOptions.find(
    (c) => c.id === selectedCustomerId,
  );

  return (
    <div className="space-y-4">
      {/* 1. SELECT CUSTOMER & PRINT REPORT ROW */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="flex-1 max-w-md">
          <label
            htmlFor="customer-select-btn"
            className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase block mb-1.5"
          >
            SELECT CUSTOMER
          </label>

          <div className="relative" ref={dropdownRef}>
            <button
              id="customer-select-btn"
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between border border-input bg-card rounded-lg px-3.5 py-2 text-sm cursor-pointer hover:border-primary/50 transition-colors text-left shadow-xs"
            >
              <span
                className={cn(
                  "truncate text-xs sm:text-sm",
                  !selectedCustomer
                    ? "text-muted-foreground"
                    : "font-semibold text-foreground",
                )}
              >
                {selectedCustomer
                  ? `${selectedCustomer.customerName} (${selectedCustomer.itemCount} items)`
                  : "Select Customer..."}
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
                      placeholder="Search customer name or phone..."
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
                      Loading customers...
                    </div>
                  ) : filteredDropdownOptions.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No customers found matching &quot;{dropdownSearch}&quot;
                    </div>
                  ) : (
                    filteredDropdownOptions.map((cust) => (
                      <button
                        key={cust.id}
                        type="button"
                        onClick={() => handleSelectCustomer(cust)}
                        className={cn(
                          "w-full text-left px-3.5 py-2 text-xs cursor-pointer hover:bg-accent flex items-center justify-between gap-2 transition-colors",
                          selectedCustomerId === cust.id
                            ? "bg-accent/80 font-bold"
                            : "",
                        )}
                      >
                        <span className="font-medium text-foreground truncate">
                          {cust.customerName}
                        </span>
                        <span className="text-[11px] text-muted-foreground shrink-0 font-semibold">
                          ({cust.itemCount} items)
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
            Loading report data...
          </p>
        </div>
      ) : error ? (
        <div className="p-4 text-center border border-destructive/30 bg-destructive/5 rounded-xl text-destructive space-y-2">
          <AlertCircle className="size-5 mx-auto text-destructive" />
          <p className="text-xs font-semibold">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              selectedCustomerId && fetchReport(selectedCustomerId)
            }
            className="text-xs h-7"
          >
            <RefreshCw className="size-3 mr-1" />
            Retry
          </Button>
        </div>
      ) : !reportData ? (
        <div className="py-12 text-center border border-dashed border-border bg-card/40 rounded-xl">
          <p className="text-xs text-muted-foreground font-medium">
            Select a customer from the dropdown to view report records.
          </p>
        </div>
      ) : (
        <>
          {/* 3. SELECTED CUSTOMER SUMMARY LINE */}
          <div className="text-xs sm:text-sm font-bold text-foreground py-1 flex flex-wrap items-center gap-1.5">
            <span>{reportData.summary.customerName}</span>
            {reportData.summary.customerNumber && (
              <>
                <span className="text-muted-foreground font-normal">·</span>
                <span className="text-muted-foreground font-mono font-medium">
                  {reportData.summary.customerNumber}
                </span>
              </>
            )}
            {reportData.summary.address && (
              <>
                <span className="text-muted-foreground font-normal">·</span>
                <span className="text-muted-foreground font-medium">
                  {reportData.summary.address}
                </span>
              </>
            )}
            <span className="text-muted-foreground font-normal">—</span>
            <span className="text-primary font-bold">
              {reportData.pagination.total} item(s)
            </span>
          </div>

          {/* 4. MATERIAL TABLE WITH ACTIONS */}
          <div className="border border-border bg-card overflow-hidden rounded-xl shadow-xs">
            <div className="overflow-x-auto max-w-full">
              <Table className="min-w-[950px] text-xs">
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-28 font-bold">Track ID</TableHead>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead className="w-44">Product</TableHead>
                    <TableHead className="w-28">Serial</TableHead>
                    <TableHead className="w-32">Vendor</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead className="w-32">Location</TableHead>
                    <TableHead className="w-24 text-right font-bold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.materials.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No material records found for this customer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.materials.map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono font-bold text-primary whitespace-nowrap">
                          {item.trackId}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDate(item.receivedDate)}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {item.product}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                          {item.serialNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.vendor || "—"}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-[11px] font-bold inline-block whitespace-nowrap",
                              item.currentStatus === "Returned to Customer" ||
                                item.currentStatus === "Customer Returned" ||
                                item.currentStatus === "Delivered"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                                : item.currentStatus === "Under Repair" ||
                                    item.currentStatus === "Sent to Vendor"
                                  ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                                  : item.currentStatus ===
                                      "Received From Vendor"
                                    ? "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20"
                                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20",
                            )}
                          >
                            {item.currentStatus}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.location || reportData.summary.address || "—"}
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
