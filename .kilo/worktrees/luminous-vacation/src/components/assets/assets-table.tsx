"use client";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Send,
  Trash2,
  Truck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ASSET_STATUS_TONE, REPAIR_STATUS_TONE } from "@/lib/constants/assets";
import { formatDate, formatRecordId } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AssetRow } from "@/types/assets";

import { AssetEmptyState } from "./asset-empty-state";
import { AssetsTableSkeleton } from "./asset-skeleton";

type AssetsTableProps = {
  assets: AssetRow[];
  loading?: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onView: (asset: AssetRow) => void;
  onEdit: (asset: AssetRow) => void;
  onDelete: (asset: AssetRow) => void;
  onSendToVendor?: (asset: AssetRow) => void;
  onReceiveFromVendor?: (asset: AssetRow) => void;
  onDispatchToCustomer?: (asset: AssetRow) => void;
  onConfirmDelivery?: (asset: AssetRow) => void;
  isSearch?: boolean;
  onResetSearch?: () => void;
};

export function AssetsTable({
  assets,
  loading = false,
  page,
  limit,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  onView,
  onEdit,
  onDelete,
  onSendToVendor,
  onReceiveFromVendor,
  onDispatchToCustomer,
  onConfirmDelivery,
  isSearch = false,
  onResetSearch,
}: AssetsTableProps) {
  if (loading) {
    return <AssetsTableSkeleton rows={limit} />;
  }

  const formatProductsSummary = (item: AssetRow) => {
    if (!item.products || item.products.length === 0) {
      return `${item.productsCount || 0} Products`;
    }

    const firstProduct = item.products[0];
    const serial = firstProduct.serialNumber
      ? ` [SN: ${firstProduct.serialNumber}]`
      : "";

    if (item.products.length === 1) {
      return `${firstProduct.productType} × ${firstProduct.quantity}${serial}`;
    }

    return `${item.products.length} Products${serial}`;
  };

  const getVisiblePages = () => {
    if (totalPages <= 3) {
      return Array.from({ length: Math.max(1, totalPages) }, (_, i) => i + 1);
    }
    let start = Math.max(1, page - 1);
    let end = start + 2;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - 2);
    }
    const pages = [];
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="overflow-x-auto max-w-full">
          <Table className="min-w-[1100px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 text-center">S.No</TableHead>
                <TableHead className="w-28">Material ID</TableHead>
                <TableHead className="w-40">Material Name</TableHead>
                <TableHead className="w-36">Customer Name</TableHead>
                <TableHead className="w-32">Customer Number</TableHead>
                <TableHead className="w-32">Location</TableHead>
                <TableHead className="w-44">Products</TableHead>
                <TableHead className="w-36">Material Status</TableHead>
                <TableHead className="w-32">Repair Status</TableHead>
                <TableHead className="w-28">Created Date</TableHead>
                <TableHead className="w-36 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="p-0">
                    <AssetEmptyState
                      isSearch={isSearch}
                      onResetSearch={onResetSearch}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((item, index) => {
                  const sNo = (page - 1) * limit + index + 1;
                  const displayId = formatRecordId(
                    "ASSET",
                    item.seq || index + 1,
                  );
                  const productsSummary = formatProductsSummary(item);
                  const statusTone =
                    ASSET_STATUS_TONE[item.status] ||
                    ASSET_STATUS_TONE.Received;
                  const repairTone =
                    REPAIR_STATUS_TONE[item.repairStatus] ||
                    REPAIR_STATUS_TONE.NOT_REQUIRED;

                  return (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      {/* 1. S.No */}
                      <TableCell className="text-center font-mono text-muted-foreground">
                        {sNo}
                      </TableCell>

                      {/* 2. Material ID */}
                      <TableCell>
                        <span className="font-mono text-xs font-semibold text-primary">
                          {displayId}
                        </span>
                      </TableCell>

                      {/* 3. Material Name */}
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => onView(item)}
                          className="font-medium text-foreground hover:underline cursor-pointer text-left truncate max-w-[180px]"
                        >
                          {item.name}
                        </button>
                      </TableCell>

                      {/* 4. Customer Name */}
                      <TableCell className="text-foreground truncate max-w-[140px]">
                        {item.customerName}
                      </TableCell>

                      {/* 5. Customer Number */}
                      <TableCell className="font-mono text-muted-foreground">
                        {item.customerNumber}
                      </TableCell>

                      {/* 6. Location */}
                      <TableCell className="text-muted-foreground truncate max-w-[130px]">
                        {item.location}
                      </TableCell>

                      {/* 7. Products */}
                      <TableCell className="text-muted-foreground text-xs truncate max-w-[160px]">
                        {productsSummary}
                      </TableCell>

                      {/* 8. Material Status */}
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold",
                            statusTone.badge,
                          )}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              statusTone.dot,
                            )}
                          />
                          {item.status}
                        </span>
                      </TableCell>

                      {/* 9. Repair Status */}
                      <TableCell>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium",
                            repairTone.badge,
                          )}
                        >
                          {repairTone.label}
                        </span>
                      </TableCell>

                      {/* 10. Created Date */}
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </TableCell>

                      {/* 11. Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Contextual Action Button */}
                          {item.status === "Received" && onSendToVendor && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => onSendToVendor(item)}
                              aria-label="Send to Vendor"
                              title="Send to Vendor"
                              className="size-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                            >
                              <Truck className="size-3.5" />
                            </Button>
                          )}

                          {(item.status === "Under Repair" ||
                            item.status === "Sent to Vendor") &&
                            onReceiveFromVendor && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => onReceiveFromVendor(item)}
                                aria-label="Receive from Vendor"
                                title="Receive from Vendor"
                                className="size-7 text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/40 cursor-pointer"
                              >
                                <CheckCircle2 className="size-3.5" />
                              </Button>
                            )}

                          {item.status === "Ready For Customer Dispatch" &&
                            onDispatchToCustomer && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => onDispatchToCustomer(item)}
                                aria-label="Dispatch to Customer"
                                title="Dispatch to Customer"
                                className="size-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 cursor-pointer"
                              >
                                <Send className="size-3.5" />
                              </Button>
                            )}

                          {item.status === "Dispatched To Customer" &&
                            onConfirmDelivery && (
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => onConfirmDelivery(item)}
                                aria-label="Confirm Delivery"
                                title="Confirm Delivery"
                                className="size-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer"
                              >
                                <CheckCircle2 className="size-3.5" />
                              </Button>
                            )}

                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onView(item)}
                            aria-label="View Details"
                            title="View Details"
                            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Eye className="size-3.5" />
                          </Button>

                          {item.status === "Received" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => onEdit(item)}
                                aria-label="Edit Material"
                                title="Edit Material"
                                className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                              >
                                <Pencil className="size-3.5" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon-xs"
                                onClick={() => onDelete(item)}
                                aria-label="Delete Material"
                                title="Delete Material"
                                className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination Footer */}
      {assets.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>
              Showing {Math.min((page - 1) * limit + 1, total)}–
              {Math.min(page * limit, total)} of {total} materials
            </span>
            <span>•</span>
            <div className="flex items-center gap-1.5">
              <span>Show</span>
              <select
                value={limit}
                onChange={(e) => onLimitChange(Number(e.target.value))}
                className="bg-card border-border text-foreground rounded-md border px-1.5 py-0.5 text-xs focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="size-8 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>

            {getVisiblePages().map((pageNum) => (
              <Button
                key={pageNum}
                variant={pageNum === page ? "default" : "outline"}
                size="icon-xs"
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  "size-8 text-xs font-semibold cursor-pointer",
                  pageNum === page && "shadow-2xs",
                )}
              >
                {pageNum}
              </Button>
            ))}

            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="size-8 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
