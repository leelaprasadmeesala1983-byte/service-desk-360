"use client";

import {
  CheckCircle2,
  Eye,
  PackageCheck,
  Printer,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell/page-header";
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
import {
  getSendToVendorList,
  updateVendorDispatchRepairStatus,
} from "@/lib/actions/send-to-vendor";
import { REPAIR_STATUS_TONE } from "@/lib/constants/assets";
import { formatDateTime, formatRecordId } from "@/lib/format";
import { cn } from "@/lib/utils";
import { printCustomerReturnReceipt } from "@/lib/utils/print-customer-return-receipt";
import type {
  SendToVendorListResponse,
  SendToVendorRow,
} from "@/types/send-to-vendor";

import { AssetEmptyState } from "./asset-empty-state";
import { AssetsTableSkeleton } from "./asset-skeleton";
import { SendToVendorViewDialog } from "./send-to-vendor-view-dialog";

type CustomerReturnViewProps = {
  initialDispatches?: SendToVendorListResponse;
};

export function CustomerReturnView({
  initialDispatches,
}: CustomerReturnViewProps) {
  const [data, setData] = useState<SendToVendorRow[]>(
    initialDispatches?.data || [],
  );
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(initialDispatches?.pagination?.total || 0);
  const [totalPages, setTotalPages] = useState(
    initialDispatches?.pagination?.totalPages || 1,
  );

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [viewDialogItem, setViewDialogItem] = useState<SendToVendorRow | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSendToVendorList({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        workflowStage: "CUSTOMER_RETURN",
      });

      if (res.ok) {
        setData(res.data.data || []);
        setTotal(res.data.pagination?.total || 0);
        setTotalPages(res.data.pagination?.totalPages || 1);
      } else {
        toast.error(res.error || "Failed to load customer return records.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkCustomerReceived = async (item: SendToVendorRow) => {
    setUpdatingId(item.id);
    try {
      const res = await updateVendorDispatchRepairStatus(
        item.id,
        "CUSTOMER_RECEIVED",
        "CUSTOMER_RETURN",
      );
      if (!res.ok) {
        toast.error(
          res.error || "Failed to update status to Customer Received.",
        );
        return;
      }

      toast.success("Status updated to Customer Received!");
      await fetchData();
    } catch (err: unknown) {
      console.error("Customer Received error:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to update status.";
      toast.error(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const handlePrintReceipt = useCallback((record: SendToVendorRow) => {
    printCustomerReturnReceipt(record, () => {
      toast.error(
        "Please allow pop-ups for ServiceDesk 360 to print the receipt.",
      );
    });
  }, []);

  const pageCount = Math.max(1, totalPages || Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), pageCount);

  // Generate pagination pages list
  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxButtons = 5;
    let startPage = Math.max(1, safePage - Math.floor(maxButtons / 2));
    const endPage = Math.min(pageCount, startPage + maxButtons - 1);

    if (endPage - startPage + 1 < maxButtons) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex w-full flex-col gap-5 pb-8">
      {/* Page Header & Search Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Customer Return" count={total} />

        {/* Search Input */}
        <div className="relative w-full sm:w-80 shrink-0">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Dispatch ID, Customer, Vendor..."
            className="h-9 rounded-md pl-8.5 pr-8.5 bg-card text-xs border-border shadow-2xs w-full"
          />

          {search.length > 0 && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table Section with strict inner horizontal scrolling */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-2xs w-full max-w-full">
        {loading ? (
          <AssetsTableSkeleton rows={limit} />
        ) : (
          <div className="w-full max-w-full overflow-x-auto overflow-y-hidden">
            <Table className="min-w-[1050px]">
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-14 text-center">S.No</TableHead>
                  <TableHead className="w-28">Dispatch ID</TableHead>
                  <TableHead className="w-40">Customer Name</TableHead>
                  <TableHead className="w-36">Vendor Name</TableHead>
                  <TableHead className="w-44">Products</TableHead>
                  <TableHead className="w-36 text-center">Status</TableHead>
                  <TableHead className="w-40 text-center">
                    Received Date & Time
                  </TableHead>
                  <TableHead className="w-36 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="p-0">
                      <AssetEmptyState
                        isSearch={Boolean(debouncedSearch)}
                        onResetSearch={() => setSearch("")}
                        emptyMessage="No customer return records found."
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item, index) => {
                    const sNo = (safePage - 1) * limit + index + 1;
                    const displayId = item.seq
                      ? formatRecordId("STV", item.seq)
                      : item.id;
                    const items = Array.isArray(item.items) ? item.items : [];
                    const isReceived =
                      item.repairStatus === "CUSTOMER_RECEIVED" ||
                      item.status === "CUSTOMER_RECEIVED";
                    const status = isReceived
                      ? "CUSTOMER_RECEIVED"
                      : item.repairStatus || "RETURN_TO_CUSTOMER";

                    const repairTone =
                      REPAIR_STATUS_TONE[status] ||
                      REPAIR_STATUS_TONE.CUSTOMER_RECEIVED;

                    const receivedDisplay = item.customerReceivedAt
                      ? formatDateTime(item.customerReceivedAt)
                      : isReceived && item.updatedAt
                        ? formatDateTime(item.updatedAt)
                        : "—";

                    return (
                      <TableRow
                        key={item.id}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        {/* 1. S.No */}
                        <TableCell className="text-center font-mono text-muted-foreground text-xs">
                          {sNo}
                        </TableCell>

                        {/* 2. Dispatch ID */}
                        <TableCell>
                          <span className="font-mono text-xs font-bold text-primary">
                            {displayId}
                          </span>
                        </TableCell>

                        {/* 3. Customer Name */}
                        <TableCell className="font-medium text-foreground text-xs truncate max-w-[150px]">
                          {item.customerName || item.asset?.customerName || "—"}
                        </TableCell>

                        {/* 4. Vendor Name */}
                        <TableCell className="font-medium text-foreground text-xs truncate max-w-[140px]">
                          {item.vendorName || "—"}
                        </TableCell>

                        {/* 5. Products */}
                        <TableCell>
                          <div className="flex flex-col gap-1 max-w-[180px]">
                            {items.length > 0 ? (
                              items.map((prod, pIdx) => (
                                <div
                                  key={`${item.id}_${prod.receivedItemId || pIdx}`}
                                  className="flex items-center gap-1.5 text-xs truncate"
                                >
                                  <span className="font-semibold text-foreground truncate">
                                    {prod.productName}
                                  </span>
                                  {prod.serialNumber &&
                                    prod.serialNumber !== "—" && (
                                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded shrink-0">
                                        {prod.serialNumber}
                                      </span>
                                    )}
                                </div>
                              ))
                            ) : item.assetName ? (
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="font-semibold text-foreground truncate">
                                  {item.assetName}
                                </span>
                                {item.serialNumber && (
                                  <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.2 rounded shrink-0">
                                    {item.serialNumber}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                —
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* 6. Status */}
                        <TableCell className="text-center whitespace-nowrap">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                              repairTone.badge,
                            )}
                          >
                            {repairTone.label || status}
                          </span>
                        </TableCell>

                        {/* 7. Received Date & Time */}
                        <TableCell className="text-center whitespace-nowrap">
                          {receivedDisplay !== "—" ? (
                            <div className="flex items-center justify-center gap-1 font-mono text-xs text-foreground font-medium">
                              <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                              <span>{receivedDisplay}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              Pending Handover
                            </span>
                          )}
                        </TableCell>

                        {/* 8. Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. Normal View Details Action */}
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => setViewDialogItem(item)}
                              title="View Details"
                              aria-label="View Details"
                              className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              <Eye className="size-3.5" />
                            </Button>

                            {/* 2. Print Receipt Action (Visible ONLY when status is CUSTOMER_RECEIVED) */}
                            {isReceived && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => handlePrintReceipt(item)}
                                title="Print Receipt"
                                aria-label="Print Receipt"
                                className="size-7 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                              >
                                <Printer className="size-3.5" />
                              </Button>
                            )}

                            {/* 3. Mark Customer Received Action */}
                            {!isReceived ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkCustomerReceived(item)}
                                disabled={updatingId === item.id}
                                title="Mark as Customer Received"
                                className="h-7 px-2 text-xs font-semibold gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer rounded-md"
                              >
                                <PackageCheck className="size-3.5" />
                                <span>Receive</span>
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination Footer — Matching Repair Status style */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
        <div className="text-muted-foreground text-xs">
          Showing {total === 0 ? 0 : (safePage - 1) * limit + 1}–
          {total === 0 ? 0 : Math.min(safePage * limit, total)} of {total}{" "}
          records
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-muted-foreground flex items-center gap-2 text-xs">
            Per page:
            <select
              value={limit}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
              className="border-border bg-card text-foreground rounded-md px-2 py-1 text-xs cursor-pointer focus:outline-none"
            >
              {[10, 25, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1">
            <button
              type="button"
              className="border-border bg-card text-foreground rounded-md px-2 py-1 text-xs disabled:opacity-50 cursor-pointer"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>

            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={cn(
                  "border-border rounded-md px-2.5 py-1 text-xs cursor-pointer font-medium",
                  pageNum === safePage
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-card text-foreground hover:bg-muted",
                )}
                onClick={() => setPage(pageNum)}
              >
                {pageNum}
              </button>
            ))}

            <button
              type="button"
              className="border-border bg-card text-foreground rounded-md px-2 py-1 text-xs disabled:opacity-50 cursor-pointer"
              disabled={safePage >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {/* 1. Normal View Details Dialog */}
      <SendToVendorViewDialog
        open={Boolean(viewDialogItem)}
        item={viewDialogItem}
        onClose={() => setViewDialogItem(null)}
      />
    </div>
  );
}
