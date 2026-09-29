"use client";

import { X } from "lucide-react";
import { DetailGrid, DetailRow } from "@/components/service-tickets/detail-row";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/format";
import type { Asset, AssetRow, ReceivedItemRow } from "@/types/assets";

type ReceivedMaterialViewDialogProps = {
  open: boolean;
  item?: ReceivedItemRow | null;
  asset?: Asset | AssetRow | null;
  onClose: () => void;
};

export function ReceivedMaterialViewDialog({
  open,
  item,
  asset,
  onClose,
}: ReceivedMaterialViewDialogProps) {
  // If item is passed, view single item record
  const targetItem = item;
  const targetAsset = asset || item?.rawAsset;

  if (!targetItem && !targetAsset) return null;

  const customerName =
    targetItem?.customerName || targetAsset?.customerName || "—";
  const customerNumber =
    targetItem?.customerNumber || targetAsset?.customerNumber || "—";
  const location = targetItem?.location || targetAsset?.location || "—";
  const createdAt =
    targetItem?.createdAt || targetAsset?.createdAt || new Date();
  const trackId = targetItem?.trackId;

  const productTypeLabel = targetItem
    ? targetItem.productType === "Other" && targetItem.otherProductType
      ? `Other (${targetItem.otherProductType})`
      : targetItem.productType
    : undefined;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl"
      >
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-background px-6 py-4 shadow-2xs">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                Received Material Details
              </DialogTitle>
              {trackId && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                  {trackId}
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close"
              className="size-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg shrink-0"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Section 1: Customer Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Customer Information
            </h3>
            <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
              <DetailGrid>
                <DetailRow label="Customer Name">{customerName}</DetailRow>
                <DetailRow label="Customer Contact">{customerNumber}</DetailRow>
                <DetailRow label="Location / Branch">{location}</DetailRow>
                <DetailRow label="Receipt Date">
                  {formatDateTime(createdAt)}
                </DetailRow>
              </DetailGrid>
            </div>
          </div>

          {/* Section 2: Product Record Details */}
          {targetItem ? (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Product Details
              </h3>
              <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <h4 className="text-sm font-bold uppercase tracking-wide text-foreground">
                    {productTypeLabel}
                  </h4>
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                    Qty: {targetItem.quantity}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Product Type
                    </p>
                    <p className="font-semibold text-foreground mt-0.5">
                      {productTypeLabel}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Brand Name</p>
                    <p className="font-semibold text-foreground mt-0.5">
                      {targetItem.brandName || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Model Number
                    </p>
                    <p className="font-semibold text-foreground mt-0.5 font-mono">
                      {targetItem.modelNumber || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Serial Number
                    </p>
                    <p className="font-semibold text-foreground mt-0.5 font-mono text-primary">
                      {targetItem.serialNumber || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-semibold text-foreground mt-0.5">
                      {targetItem.itemStatus || "Available"}
                    </p>
                  </div>
                  {targetItem.accessories && (
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">
                        Accessories
                      </p>
                      <p className="font-semibold text-foreground mt-0.5">
                        {targetItem.accessories}
                      </p>
                    </div>
                  )}
                  {targetItem.description && (
                    <div className="sm:col-span-3">
                      <p className="text-xs text-muted-foreground">
                        Description
                      </p>
                      <p className="text-foreground mt-0.5 text-xs">
                        {targetItem.description}
                      </p>
                    </div>
                  )}
                  {targetItem.remarks && (
                    <div className="sm:col-span-3">
                      <p className="text-xs text-muted-foreground">
                        Complaint / Remarks
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        {targetItem.remarks}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            targetAsset && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Products Included ({(targetAsset.products || []).length})
                </h3>
                <div className="space-y-3">
                  {(targetAsset.products || []).map((product, idx) => (
                    <div
                      key={product.id || idx}
                      className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs"
                    >
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <span className="text-xs font-bold text-foreground">
                          Product #{idx + 1}: {product.productType}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Qty: {product.quantity}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>Brand: {product.brandName || "—"}</div>
                        <div>Model: {product.modelNumber || "—"}</div>
                        <div>Serial: {product.serialNumber || "—"}</div>
                        <div>Remarks: {product.remarks || "—"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>

        {/* STICKY ACTION FOOTER */}
        <div className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-background px-6 py-3.5 flex items-center justify-end gap-3 shadow-2xs">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8.5 text-xs font-semibold cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
