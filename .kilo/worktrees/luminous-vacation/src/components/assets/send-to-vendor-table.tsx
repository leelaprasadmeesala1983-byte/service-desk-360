"use client";

import { Eye, FilePenLine, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { REPAIR_STATUS_TONE } from "@/lib/constants/assets";
import { formatDate, formatRecordId } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { SendToVendorRow } from "@/types/send-to-vendor";

import { AssetEmptyState } from "./asset-empty-state";
import { AssetsTableSkeleton } from "./asset-skeleton";

type SendToVendorTableProps = {
  records: SendToVendorRow[];
  loading?: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onView: (item: SendToVendorRow) => void;
  onEdit: (item: SendToVendorRow) => void;
  onDelete: (item: SendToVendorRow) => void;
  onUpdateStatus?: (item: SendToVendorRow) => void;
  onReceiveFromVendor?: (item: SendToVendorRow) => void;
  isSearch?: boolean;
  onResetSearch?: () => void;
};

export function SendToVendorTable({
  records,
  loading = false,
  page,
  limit = 10,
  total,
  totalPages,
  onPageChange,
  onLimitChange,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
  onReceiveFromVendor,
  isSearch = false,
  onResetSearch,
}: SendToVendorTableProps) {
  if (loading) {
    return <AssetsTableSkeleton rows={limit} />;
  }

  const pageCount = Math.max(1, totalPages || Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), pageCount);

  return (
    <div className="space-y-4">
      {/* Table Container */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-2xs">
        <div className="overflow-x-auto max-w-full">
          <Table className="min-w-[950px]">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-14 text-center">S.No</TableHead>
                <TableHead className="w-28">Track ID</TableHead>
                <TableHead className="w-36">Customer</TableHead>
                <TableHead className="w-44">Product</TableHead>
                <TableHead className="w-32">Serial Number</TableHead>
                <TableHead className="w-40">Vendor</TableHead>
                <TableHead className="w-32">Dispatch Date</TableHead>
                <TableHead className="w-32 text-center">Status</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <AssetEmptyState
                      isSearch={isSearch}
                      onResetSearch={onResetSearch}
                      emptyMessage="No vendor dispatch records yet."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                records.map((item, index) => {
                  const sNo = (page - 1) * limit + index + 1;
                  const items = Array.isArray(item.items) ? item.items : [];
                  const primaryItem = items[0];

                  const trackId =
                    primaryItem?.trackId ||
                    (item.assetSeq
                      ? formatRecordId("ASSET", item.assetSeq)
                      : "—");

                  const productName =
                    primaryItem?.productName || item.assetName || "Product";

                  const productDetails = [
                    primaryItem?.brandName,
                    primaryItem?.modelNumber,
                  ]
                    .filter(Boolean)
                    .join(" - ");

                  const serialNumber =
                    primaryItem?.serialNumber || item.serialNumber || "—";

                  const customerName =
                    item.customerName || item.asset?.customerName || "—";

                  const statusRaw = (
                    item.repairStatus ||
                    item.status ||
                    "SENT_TO_VENDOR"
                  ).toUpperCase();

                  const repairTone =
                    REPAIR_STATUS_TONE[statusRaw] ||
                    (statusRaw === "SENT_TO_VENDOR" ||
                    statusRaw === "DISPATCHED"
                      ? {
                          badge:
                            "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200",
                          label: "Sent to Vendor",
                        }
                      : statusRaw === "RETURN_TO_CUSTOMER"
                        ? {
                            badge:
                              "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200",
                            label: "Returned to Customer",
                          }
                        : statusRaw === "REPAIR_COMPLETED" ||
                            statusRaw === "RECEIVED_FROM_VENDOR"
                          ? {
                              badge:
                                "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200",
                              label: "Vendor Received",
                            }
                          : {
                              badge:
                                "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200",
                              label: statusRaw.replace(/_/g, " "),
                            });

                  return (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      {/* 1. S.No */}
                      <TableCell className="text-center font-mono text-muted-foreground text-xs">
                        {sNo}
                      </TableCell>

                      {/* 2. Track ID */}
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          {trackId}
                        </span>
                      </TableCell>

                      {/* 3. Customer */}
                      <TableCell className="text-foreground font-medium text-xs truncate max-w-[150px]">
                        {customerName}
                      </TableCell>

                      {/* 4. Product */}
                      <TableCell>
                        <div className="flex flex-col min-w-0 max-w-[180px]">
                          <span className="font-semibold text-foreground text-xs truncate">
                            {productName}
                          </span>
                          {productDetails && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              {productDetails}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* 5. Serial Number */}
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {serialNumber}
                      </TableCell>

                      {/* 6. Vendor */}
                      <TableCell>
                        <div className="flex flex-col min-w-0 max-w-[160px]">
                          <button
                            type="button"
                            onClick={() => onView(item)}
                            className="font-medium text-foreground hover:underline cursor-pointer text-left truncate text-xs"
                            title={item.vendorName}
                          >
                            {item.vendorName}
                          </button>
                          {item.contactPerson && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              {item.contactPerson}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* 7. Dispatch Date */}
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(item.bookingDate || item.createdAt)}
                      </TableCell>

                      {/* 8. Status */}
                      <TableCell className="text-center whitespace-nowrap">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                            repairTone.badge,
                          )}
                        >
                          {repairTone.label}
                        </span>
                      </TableCell>

                      {/* 9. Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onUpdateStatus && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => onUpdateStatus(item)}
                              aria-label="Update Repair Status"
                              title="Update Repair Status"
                              className="size-7 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer"
                            >
                              <FilePenLine className="size-3.5" />
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

                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onEdit(item)}
                            aria-label="Edit Dispatch"
                            title="Edit Dispatch"
                            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Pencil className="size-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onDelete(item)}
                            aria-label="Delete Dispatch"
                            title="Delete Dispatch"
                            className="size-7 text-muted-foreground hover:text-destructive cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
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

      {/* Pagination Footer — Service Management style */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
        <div className="text-muted-foreground text-xs">
          Showing {total === 0 ? 0 : (safePage - 1) * limit + 1}–
          {Math.min(safePage * limit, total)} of {total} records
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-muted-foreground flex items-center gap-2 text-xs">
            Per page:
            <select
              value={limit}
              onChange={(event) => {
                onLimitChange(Number(event.target.value));
                onPageChange(1);
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
              onClick={() => onPageChange(Math.max(1, safePage - 1))}
            >
              ‹
            </button>

            {Array.from(
              { length: Math.min(3, pageCount) },
              (_, i) => i + 1,
            ).map((index) => (
              <button
                key={index}
                type="button"
                className={cn(
                  "border-border rounded-md px-2.5 py-1 text-xs cursor-pointer font-medium",
                  index === safePage
                    ? "bg-primary text-primary-foreground shadow-2xs"
                    : "bg-card text-foreground hover:bg-muted",
                )}
                onClick={() => onPageChange(index)}
              >
                {index}
              </button>
            ))}

            <button
              type="button"
              className="border-border bg-card text-foreground rounded-md px-2 py-1 text-xs disabled:opacity-50 cursor-pointer"
              disabled={safePage >= pageCount}
              onClick={() => onPageChange(Math.min(pageCount, safePage + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
