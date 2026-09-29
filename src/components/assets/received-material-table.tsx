"use client";

import { Eye, Pencil, Trash2, Truck } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatRecordId } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AssetRow, ReceivedItemRow } from "@/types/assets";

import { AssetEmptyState } from "./asset-empty-state";
import { AssetsTableSkeleton } from "./asset-skeleton";

type ReceivedMaterialTableProps = {
  assets: AssetRow[];
  loading?: boolean;
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  onView: (item: ReceivedItemRow) => void;
  onEdit: (item: ReceivedItemRow) => void;
  onDelete: (item: ReceivedItemRow) => void;
  selectedItems: ReceivedItemRow[];
  onSelectionChange: (items: ReceivedItemRow[]) => void;
  onCreateDispatch: (items: ReceivedItemRow[]) => void;
  isSearch?: boolean;
  searchQuery?: string;
  onResetSearch?: () => void;
};

// Determine selectable (un-dispatched) rows
const isItemAvailable = (item: ReceivedItemRow) => {
  const s = (item.itemStatus || "").toLowerCase();
  const isDispatched =
    Boolean(item.dispatchId) ||
    s === "dispatched_to_vendor" ||
    s === "sent to vendor" ||
    s === "under repair" ||
    s === "under_repair" ||
    s === "vendor_received" ||
    s === "repair_completed";

  return !isDispatched;
};

export function ReceivedMaterialTable({
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
  selectedItems,
  onSelectionChange,
  onCreateDispatch,
  isSearch = false,
  searchQuery = "",
  onResetSearch,
}: ReceivedMaterialTableProps) {
  // Flatten parent assets into individual product/item rows
  const itemRows = useMemo<ReceivedItemRow[]>(() => {
    const rows: ReceivedItemRow[] = [];

    assets.forEach((asset) => {
      const products =
        Array.isArray(asset.products) && asset.products.length > 0
          ? asset.products
          : [
              {
                id: `${asset.id}_fallback`,
                productType: "Asset",
                brandName: "",
                modelNumber: "",
                serialNumber: "—",
                quantity: 1,
                status: asset.status,
              },
            ];

      products.forEach((product, productIndex) => {
        const itemId = product.id || `${asset.id}_prod_${productIndex}`;
        const itemStatus = product.status || asset.status || "Received";

        rows.push({
          id: `${asset.id}__${itemId}`,
          assetId: asset.id,
          assetSeq: asset.seq,
          trackId: formatRecordId("ASSET", asset.seq),
          customerName: asset.customerName,
          customerNumber: asset.customerNumber,
          location: asset.location,
          createdAt: asset.createdAt,
          assetStatus: asset.status,
          productId: itemId,
          productType:
            product.productType === "Other" && product.otherProductType
              ? product.otherProductType
              : product.productType,
          otherProductType: product.otherProductType,
          brandName: product.brandName || "",
          modelNumber: product.modelNumber || "",
          serialNumber: product.serialNumber || "—",
          quantity: Number(product.quantity) || 1,
          accessories: product.accessories,
          description: product.description,
          remarks: product.remarks,
          itemStatus,
          dispatchId: product.dispatchId,
          rawAsset: asset,
          productIndex,
        });
      });
    });

    if (searchQuery && searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      return rows.filter((item) => {
        const values = [
          item.trackId,
          item.customerName,
          item.customerNumber,
          item.location,
          item.productType,
          item.otherProductType,
          item.brandName,
          item.modelNumber,
          item.serialNumber,
          item.remarks,
          item.description,
          item.accessories,
          item.itemStatus,
          item.assetStatus,
        ];
        return values.some(
          (val) => typeof val === "string" && val.toLowerCase().includes(q),
        );
      });
    }

    return rows;
  }, [assets, searchQuery]);

  const handleToggleItem = (item: ReceivedItemRow) => {
    const isSelected = selectedItems.some((sel) => sel.id === item.id);

    if (isSelected) {
      onSelectionChange(selectedItems.filter((sel) => sel.id !== item.id));
    } else {
      onSelectionChange([...selectedItems, item]);
    }
  };

  if (loading) {
    return <AssetsTableSkeleton rows={limit} />;
  }

  const totalRecords = itemRows.length;
  const pageCount = Math.max(1, Math.ceil(totalRecords / limit));
  const safePage = Math.min(Math.max(1, page), pageCount);

  const startIndex = (safePage - 1) * limit;
  const endIndex = Math.min(startIndex + limit, totalRecords);
  const paginatedRows = itemRows.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      {/* Floating / Top Multi-Select Action Banner */}
      {selectedItems.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
              {selectedItems.length}
            </span>
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-foreground">
                {selectedItems.length} item
                {selectedItems.length > 1 ? "s" : ""} selected
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectionChange([])}
              className="h-8.5 text-xs cursor-pointer"
            >
              Clear Selection
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onCreateDispatch(selectedItems)}
              className="h-8.5 gap-2 text-xs font-semibold shadow-xs cursor-pointer"
            >
              <Truck className="size-3.5" />
              <span>Create Dispatch</span>
            </Button>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="border-border bg-card overflow-hidden rounded-xl border shadow-2xs">
        <div className="overflow-x-auto max-w-full">
          <Table className="min-w-[1000px]">
            <TableHeader>
              <TableRow className="bg-muted/30">
                {/* Checkbox column header - No select all checkbox as per requirement */}
                <TableHead className="w-10 text-center" />
                <TableHead className="w-14 text-center">S.No</TableHead>
                <TableHead className="w-32">Track ID</TableHead>
                <TableHead className="w-40">Customer</TableHead>
                <TableHead className="w-44">Product</TableHead>
                <TableHead className="w-36">Serial Number</TableHead>
                <TableHead className="w-44">Complaint / Remarks</TableHead>
                <TableHead className="w-32">Received Date</TableHead>
                <TableHead className="w-32">Status</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="p-0">
                    <AssetEmptyState
                      isSearch={isSearch}
                      onResetSearch={onResetSearch}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((item, index) => {
                  const sNo = startIndex + index + 1;
                  const isAvailable = isItemAvailable(item);
                  const isChecked = selectedItems.some(
                    (sel) => sel.id === item.id,
                  );

                  return (
                    <TableRow
                      key={item.id}
                      className={cn(
                        "hover:bg-muted/50 transition-colors",
                        isChecked && "bg-primary/5 hover:bg-primary/10",
                      )}
                    >
                      {/* 0. Row Checkbox */}
                      <TableCell className="text-center">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => handleToggleItem(item)}
                          disabled={!isAvailable}
                          aria-label={`Select ${item.productType} ${item.serialNumber}`}
                          className="translate-y-[2px]"
                        />
                      </TableCell>

                      {/* 1. S.No */}
                      <TableCell className="text-center font-mono text-muted-foreground text-xs">
                        {sNo}
                      </TableCell>

                      {/* 2. Track ID */}
                      <TableCell>
                        <span className="font-mono text-xs font-bold text-primary">
                          {item.trackId}
                        </span>
                      </TableCell>

                      {/* 3. Customer */}
                      <TableCell className="text-foreground font-medium text-xs truncate max-w-[160px]">
                        {item.customerName}
                      </TableCell>

                      {/* 4. Product */}
                      <TableCell>
                        <div className="flex flex-col min-w-0">
                          <span className="text-foreground text-xs font-semibold truncate max-w-[180px]">
                            {item.productType}
                          </span>
                          {(item.brandName || item.modelNumber) && (
                            <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                              {[item.brandName, item.modelNumber]
                                .filter(Boolean)
                                .join(" ")}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* 5. Serial Number */}
                      <TableCell className="font-mono text-xs font-semibold text-primary truncate max-w-[140px]">
                        {item.serialNumber}
                      </TableCell>

                      {/* 6. Complaint / Remarks */}
                      <TableCell
                        className="text-muted-foreground text-xs truncate max-w-[180px]"
                        title={item.remarks || item.description || "—"}
                      >
                        {item.remarks || item.description || "—"}
                      </TableCell>

                      {/* 7. Received Date */}
                      <TableCell className="text-foreground font-medium text-xs whitespace-nowrap">
                        {formatDate(item.createdAt)}
                      </TableCell>

                      {/* 8. Status */}
                      <TableCell>
                        {isAvailable ? (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200">
                            Dispatched
                          </span>
                        )}
                      </TableCell>

                      {/* 9. Actions */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onView(item)}
                            aria-label="View Asset Details"
                            title="View Asset Details"
                            className="size-7 text-muted-foreground hover:text-foreground cursor-pointer"
                          >
                            <Eye className="size-3.5" />
                          </Button>

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

      {/* Pagination Footer — Matching Send to Vendor style */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
        <div className="text-muted-foreground text-xs">
          Showing {totalRecords === 0 ? 0 : startIndex + 1}–{endIndex} of{" "}
          {totalRecords} records
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
