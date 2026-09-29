"use client";

import {
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
  Package,
  Send,
  Truck,
  UserCheck,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { DetailGrid, DetailRow } from "@/components/service-tickets/detail-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ASSET_STATUS_TONE, REPAIR_STATUS_TONE } from "@/lib/constants/assets";
import {
  formatDateTime,
  formatRecordId,
  formatRelativeTime,
} from "@/lib/format";
import { AssetsApiService } from "@/lib/services/assets-api";
import { cn } from "@/lib/utils";
import type { Asset, AssetRow, AssetStatusHistoryRow } from "@/types/assets";

type AssetViewDialogProps = {
  open: boolean;
  asset: Asset | AssetRow | null;
  onClose: () => void;
  onSendToVendor?: (asset: AssetRow) => void;
  onReceiveFromVendor?: (asset: AssetRow) => void;
  onDispatchToCustomer?: (asset: AssetRow) => void;
  onConfirmDelivery?: (asset: AssetRow) => void;
  onCloseLifecycle?: (asset: AssetRow) => void;
};

const LIFECYCLE_STEPS = [
  { key: "Received", label: "Received Material" },
  { key: "Under Repair", label: "Under Repair" },
  { key: "Received From Vendor", label: "Vendor Received" },
  { key: "Customer Returned", label: "Customer Returned" },
];

export function AssetViewDialog({
  open,
  asset,
  onClose,
  onSendToVendor,
  onReceiveFromVendor,
  onDispatchToCustomer,
  onConfirmDelivery,
  onCloseLifecycle,
}: AssetViewDialogProps) {
  const [history, setHistory] = useState<AssetStatusHistoryRow[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [activeView, setActiveView] = useState<"details" | "timeline">(
    "details",
  );

  useEffect(() => {
    if (open && asset?.id) {
      setActiveView("details");
      setIsLoadingHistory(true);
      AssetsApiService.getAssetHistory(asset.id)
        .then((data) => setHistory(data))
        .catch((err) => console.error("Failed to fetch asset history:", err))
        .finally(() => setIsLoadingHistory(false));
    }
  }, [open, asset?.id]);

  if (!asset) return null;

  const products = asset.products || [];
  const displayId = formatRecordId("ASSET", asset.seq || 1);
  const statusTone =
    ASSET_STATUS_TONE[asset.status] || ASSET_STATUS_TONE.Received;
  const repairTone =
    REPAIR_STATUS_TONE[(asset as AssetRow).repairStatus] ||
    REPAIR_STATUS_TONE.NOT_REQUIRED;

  // Determine current step index
  const currentStepIdx = LIFECYCLE_STEPS.findIndex(
    (step) =>
      step.key.toLowerCase() === asset.status.toLowerCase() ||
      (asset.status === "Sent to Vendor" && step.key === "Under Repair") ||
      (asset.status === "Ready For Customer Dispatch" &&
        step.key === "Received From Vendor") ||
      (asset.status === "Dispatched To Customer" &&
        step.key === "Customer Returned") ||
      (asset.status === "Delivered" && step.key === "Customer Returned") ||
      (asset.status === "Closed" && step.key === "Customer Returned"),
  );

  const assetRow = asset as AssetRow;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl"
      >
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-background px-6 py-4 shadow-2xs">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                  {displayId}
                </span>
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground truncate">
                  {asset.name}
                </DialogTitle>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0",
                    statusTone.badge,
                  )}
                >
                  <span
                    className={cn("size-1.5 rounded-full", statusTone.dot)}
                  />
                  {asset.status}
                </span>
                {(asset as AssetRow).repairStatus &&
                  (asset as AssetRow).repairStatus !== "NOT_REQUIRED" && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold shrink-0",
                        repairTone.badge,
                      )}
                    >
                      <Wrench className="size-3" />
                      {repairTone.label}
                    </span>
                  )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-1 truncate">
                Customer: {asset.customerName} ({asset.customerNumber}) •
                Location: {asset.location}
              </DialogDescription>
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

          {/* Navigation Subtabs: Details vs Timeline */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => setActiveView("details")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                activeView === "details"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              Material Details
            </button>
            <button
              type="button"
              onClick={() => setActiveView("timeline")}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5",
                activeView === "timeline"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
              )}
            >
              <History className="size-3.5" />
              Lifecycle Timeline ({history.length})
            </button>
          </div>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Section: Material Lifecycle Stepper */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Material Lifecycle Progress
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {LIFECYCLE_STEPS.map((step, idx) => {
                const isPassed = currentStepIdx >= idx;
                const isCurrent = currentStepIdx === idx;
                return (
                  <div
                    key={step.key}
                    className={cn(
                      "flex flex-col items-center text-center p-2 rounded-lg border transition-all",
                      isCurrent
                        ? "border-primary bg-primary/5 text-primary font-bold shadow-2xs"
                        : isPassed
                          ? "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-semibold"
                          : "border-border/60 bg-muted/20 text-muted-foreground opacity-60",
                    )}
                  >
                    <div className="flex size-6 items-center justify-center rounded-full mb-1">
                      {isPassed && !isCurrent ? (
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                      ) : isCurrent ? (
                        <div className="size-2.5 rounded-full bg-primary animate-pulse" />
                      ) : (
                        <div className="size-2 rounded-full bg-muted-foreground/40" />
                      )}
                    </div>
                    <span className="text-[11px] leading-tight">
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {activeView === "details" ? (
            <>
              {/* Section 1: Asset Information */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Material Information
                </h3>
                <div className="rounded-xl border border-border bg-card p-4">
                  <DetailGrid>
                    <DetailRow label="Material / Asset Name">
                      {asset.name}
                    </DetailRow>
                    <DetailRow label="Customer Name">
                      {asset.customerName}
                    </DetailRow>
                    <DetailRow label="Customer Contact">
                      {asset.customerNumber}
                    </DetailRow>
                    <DetailRow label="Location / Branch">
                      {asset.location}
                    </DetailRow>
                    <DetailRow label="Material Status">
                      {asset.status}
                    </DetailRow>
                    <DetailRow label="Repair Status">
                      {(asset as AssetRow).repairStatus || "NOT_REQUIRED"}
                    </DetailRow>
                    <DetailRow label="Receipt Date">
                      {formatDateTime(asset.createdAt)}
                    </DetailRow>
                    <DetailRow label="Last Updated">
                      {formatDateTime(asset.updatedAt)}
                    </DetailRow>
                  </DetailGrid>
                </div>
              </div>

              {/* Section 2: Products Breakdown */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Products Included ({products.length})
                  </h3>
                </div>

                {products.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">
                    No products listed.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {products.map((product, idx) => {
                      const productTypeLabel =
                        product.productType === "Other" &&
                        product.otherProductType
                          ? `Other (${product.otherProductType})`
                          : product.productType;

                      return (
                        <div
                          // biome-ignore lint/suspicious/noArrayIndexKey: product idx
                          key={product.id || idx}
                          className="rounded-xl border border-border bg-card p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between border-b border-border/60 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="flex size-5.5 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">
                                {idx + 1}
                              </span>
                              <h4 className="text-sm font-bold uppercase tracking-wide text-foreground">
                                Product #{idx + 1}
                              </h4>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-foreground">
                              Qty: {product.quantity}
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
                              <p className="text-xs text-muted-foreground">
                                Brand Name
                              </p>
                              <p className="font-semibold text-foreground mt-0.5">
                                {product.brandName}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Model Number
                              </p>
                              <p className="font-semibold text-foreground mt-0.5 font-mono">
                                {product.modelNumber}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Serial Number
                              </p>
                              <p className="font-semibold text-foreground mt-0.5 font-mono">
                                {product.serialNumber}
                              </p>
                            </div>
                            {product.accessories && (
                              <div className="sm:col-span-2">
                                <p className="text-xs text-muted-foreground">
                                  Accessories
                                </p>
                                <p className="font-semibold text-foreground mt-0.5">
                                  {product.accessories}
                                </p>
                              </div>
                            )}
                            {product.remarks && (
                              <div className="sm:col-span-3">
                                <p className="text-xs text-muted-foreground">
                                  Remarks
                                </p>
                                <p className="text-muted-foreground mt-0.5 text-xs">
                                  {product.remarks}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Timeline History View */
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Chronological Audit History
              </h3>

              {isLoadingHistory ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Loading lifecycle timeline...
                </div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No status transition history recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {history.map((item) => (
                    <div key={item.id} className="relative group">
                      <div className="absolute -left-[29px] top-0.5 size-3.5 rounded-full border-2 border-background bg-primary" />
                      <div className="rounded-xl border border-border bg-card p-3.5 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-foreground">
                            {item.action.replace(/_/g, " ")}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDateTime(item.performedAt)} (
                            {formatRelativeTime(item.performedAt)})
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          {item.previousStatus && (
                            <>
                              <span className="text-muted-foreground">
                                {item.previousStatus}
                              </span>
                              <span className="text-muted-foreground">→</span>
                            </>
                          )}
                          <span className="font-semibold text-primary">
                            {item.newStatus}
                          </span>
                        </div>
                        {item.remarks && (
                          <p className="text-xs text-muted-foreground pt-1 border-t border-border/50">
                            {item.remarks}
                          </p>
                        )}
                        <p className="text-[11px] text-muted-foreground/80">
                          Actor: {item.performedByName || "System"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* STICKY ACTION FOOTER */}
        <div className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-background px-6 py-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="text-xs text-muted-foreground">
            Current Status:{" "}
            <strong className="text-foreground">{asset.status}</strong>
          </div>

          <div className="flex items-center gap-2">
            {/* Contextual Actions */}
            {asset.status === "Received" && onSendToVendor && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onSendToVendor(assetRow);
                }}
                className="h-8.5 text-xs font-semibold gap-1.5 cursor-pointer bg-amber-600 hover:bg-amber-700 text-white"
              >
                <Truck className="size-3.5" />
                Send to Vendor
              </Button>
            )}

            {(asset.status === "Under Repair" ||
              asset.status === "Sent to Vendor") &&
              onReceiveFromVendor && (
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    onReceiveFromVendor(assetRow);
                  }}
                  className="h-8.5 text-xs font-semibold gap-1.5 cursor-pointer bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <CheckCircle2 className="size-3.5" />
                  Receive from Vendor
                </Button>
              )}

            {asset.status === "Ready For Customer Dispatch" &&
              onDispatchToCustomer && (
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    onDispatchToCustomer(assetRow);
                  }}
                  className="h-8.5 text-xs font-semibold gap-1.5 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Send className="size-3.5" />
                  Dispatch to Customer
                </Button>
              )}

            {asset.status === "Dispatched To Customer" && onConfirmDelivery && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onConfirmDelivery(assetRow);
                }}
                className="h-8.5 text-xs font-semibold gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="size-3.5" />
                Confirm Delivery
              </Button>
            )}

            {asset.status === "Delivered" && onCloseLifecycle && (
              <Button
                size="sm"
                onClick={() => {
                  onClose();
                  onCloseLifecycle(assetRow);
                }}
                className="h-8.5 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                Close Material Lifecycle
              </Button>
            )}

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
        </div>
      </DialogContent>
    </Dialog>
  );
}
