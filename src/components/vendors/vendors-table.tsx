"use client";

import { ChevronLeft, ChevronRight, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { VendorRow } from "@/types/vendors";

type VendorsTableProps = {
  vendors: VendorRow[];
  loading?: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onView: (vendor: VendorRow) => void;
  onEdit: (vendor: VendorRow) => void;
  onDelete: (vendor: VendorRow) => void;
  isSearch?: boolean;
  onResetSearch?: () => void;
};

export function VendorsTable({
  vendors,
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
  isSearch = false,
  onResetSearch,
}: VendorsTableProps) {
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
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-2xs">
        <div className="overflow-x-auto max-w-full">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-14 text-center">S.No</TableHead>
                <TableHead className="w-48">Vendor Name</TableHead>
                <TableHead className="w-40">Contact Person</TableHead>
                <TableHead className="w-36">Phone Number</TableHead>
                <TableHead className="w-64">Address</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {isSearch ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <p className="text-sm">
                          No vendors matching your search.
                        </p>
                        {onResetSearch && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onResetSearch}
                            className="h-8 text-xs cursor-pointer"
                          >
                            Clear Search
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm">
                        No vendors found. Click "+ Add Vendor" to create one.
                      </p>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                vendors.map((vendor, index) => {
                  const sNo = (page - 1) * limit + index + 1;

                  return (
                    <TableRow
                      key={vendor.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      {/* 1. S.No */}
                      <TableCell className="text-center font-mono text-muted-foreground text-xs">
                        {sNo}
                      </TableCell>

                      {/* 2. Vendor Name */}
                      <TableCell className="font-semibold text-foreground text-xs">
                        {vendor.vendorName}
                      </TableCell>

                      {/* 3. Contact Person */}
                      <TableCell className="text-foreground text-xs">
                        {vendor.contactPerson}
                      </TableCell>

                      {/* 4. Phone Number */}
                      <TableCell className="font-mono text-xs text-foreground">
                        {vendor.phoneNumber}
                      </TableCell>

                      {/* 5. Address */}
                      <TableCell
                        className="text-muted-foreground text-xs truncate max-w-[240px]"
                        title={vendor.address}
                      >
                        {vendor.address}
                      </TableCell>

                      {/* 6. Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onView(vendor)}
                            aria-label="View Vendor"
                            title="View Vendor"
                            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Eye className="size-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onEdit(vendor)}
                            aria-label="Edit Vendor"
                            title="Edit Vendor"
                            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Pencil className="size-3.5" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onDelete(vendor)}
                            aria-label="Delete Vendor"
                            title="Delete Vendor"
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

      {/* Pagination Footer */}
      {vendors.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>
              Showing {Math.min((page - 1) * limit + 1, total)}–
              {Math.min(page * limit, total)} of {total} vendors
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
                <option value={25}>25</option>
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
