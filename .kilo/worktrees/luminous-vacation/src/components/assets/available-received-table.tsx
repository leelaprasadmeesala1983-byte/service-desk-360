"use client";

import { Package, Send } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
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
import type { ReceivedItemRow } from "@/types/assets";

type AvailableReceivedTableProps = {
  items: ReceivedItemRow[];
  loading?: boolean;
  onDispatch: (item: ReceivedItemRow) => void;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
};

export function AvailableReceivedTable({
  items,
  loading = false,
  onDispatch,
  page,
  perPage = 10,
  onPageChange,
  onPerPageChange,
}: AvailableReceivedTableProps) {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), pageCount);

  // Slice items for current page (client-side pagination)
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, safePage, perPage]);

  return (
    <div className="space-y-4">
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-2xs">
        <div className="overflow-x-auto max-w-full">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-36">Track ID</TableHead>
                <TableHead className="w-44">Customer</TableHead>
                <TableHead className="w-48">Product</TableHead>
                <TableHead className="w-40">Serial Number</TableHead>
                <TableHead className="w-36">Received Date</TableHead>
                <TableHead className="w-28 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                ["a", "b", "c", "d", "e"].map((key) => (
                  <TableRow key={`skeleton-${key}`} className="animate-pulse">
                    <TableCell colSpan={6} className="h-12 bg-muted/20" />
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground py-4">
                      <Package className="size-6 text-muted-foreground/50" />
                      <p className="text-xs font-medium">
                        No material available for dispatch.
                      </p>
                      <p className="text-[11px] text-muted-foreground/70">
                        All received materials have been dispatched or no new
                        materials received.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item) => {
                  return (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      {/* Track ID */}
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-primary">
                          {item.trackId}
                        </span>
                      </TableCell>

                      {/* Customer */}
                      <TableCell className="text-foreground font-medium text-xs truncate max-w-[160px]">
                        {item.customerName}
                      </TableCell>

                      {/* Product */}
                      <TableCell>
                        <div className="flex flex-col min-w-0">
                          <span className="font-semibold text-foreground text-xs truncate">
                            {item.productType}
                          </span>
                          {(item.brandName || item.modelNumber) && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              {[item.brandName, item.modelNumber]
                                .filter(Boolean)
                                .join(" - ")}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Serial Number */}
                      <TableCell>
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {item.serialNumber || "—"}
                        </span>
                      </TableCell>

                      {/* Received Date */}
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => onDispatch(item)}
                          className="text-primary hover:text-primary-foreground hover:bg-primary border-primary/40 gap-1.5 h-7 text-xs font-semibold cursor-pointer shadow-2xs transition-all"
                        >
                          <Send className="size-3" />
                          <span>Dispatch</span>
                        </Button>
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
          Showing {total === 0 ? 0 : (safePage - 1) * perPage + 1}–
          {Math.min(safePage * perPage, total)} of {total} records
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-muted-foreground flex items-center gap-2 text-xs">
            Per page:
            <select
              value={perPage}
              onChange={(event) => {
                onPerPageChange(Number(event.target.value));
                onPageChange(1);
              }}
              className="border-border bg-card text-foreground rounded-md px-2 py-1 text-xs cursor-pointer focus:outline-none"
            >
              {[10, 20, 50, 100].map((value) => (
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
