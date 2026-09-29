"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AssetRow, ReceivedItemRow } from "@/types/assets";

type AssetDeleteDialogProps = {
  open: boolean;
  item?: ReceivedItemRow | null;
  asset?: AssetRow | null;
  onClose: () => void;
  onConfirm: (id: string, productId?: string) => Promise<boolean>;
};

export function AssetDeleteDialog({
  open,
  item,
  asset,
  onClose,
  onConfirm,
}: AssetDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!item && !asset) return null;

  const isItemDelete = Boolean(item);

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const success =
        isItemDelete && item
          ? await onConfirm(item.assetId, item.productId)
          : await onConfirm(asset!.id);

      if (success) {
        onClose();
      }
    } catch (error) {
      console.error("Delete asset error:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !val && !isDeleting && onClose()}
    >
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="flex flex-col items-center text-center sm:items-start sm:text-left gap-2">
          <div className="flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-1">
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle className="text-lg font-bold">
            {isItemDelete ? "Delete Material Record" : "Delete Asset Entry"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isItemDelete && item ? (
              <>
                Are you sure you want to delete product{" "}
                <span className="font-semibold text-foreground">
                  "{item.productType}"
                </span>{" "}
                (Serial:{" "}
                <span className="font-mono font-semibold text-foreground">
                  {item.serialNumber}
                </span>
                ) for customer{" "}
                <span className="font-semibold text-foreground">
                  "{item.customerName}"
                </span>
                ? Other products under Track ID{" "}
                <span className="font-mono font-semibold text-primary">
                  {item.trackId}
                </span>{" "}
                will remain intact. This action cannot be undone.
              </>
            ) : (
              <>
                Are you sure you want to delete{" "}
                <span className="font-semibold text-foreground">
                  "{asset?.name}"
                </span>
                ? This will permanently remove the asset and all its{" "}
                {asset?.productsCount} associated products. This action cannot
                be undone.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 rounded-lg border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5">
          {isItemDelete && item ? (
            <>
              <div className="flex justify-between">
                <span className="font-medium">Track ID:</span>
                <span className="font-mono font-semibold text-primary">
                  {item.trackId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Customer:</span>
                <span className="text-foreground font-medium">
                  {item.customerName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Product:</span>
                <span className="text-foreground">
                  {item.productType}
                  {item.brandName ? ` (${item.brandName})` : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Serial Number:</span>
                <span className="font-mono text-foreground font-semibold">
                  {item.serialNumber}
                </span>
              </div>
            </>
          ) : (
            asset && (
              <>
                <div className="flex justify-between">
                  <span className="font-medium">Customer:</span>
                  <span className="text-foreground">{asset.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Location:</span>
                  <span className="text-foreground">{asset.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Products Count:</span>
                  <span className="text-foreground">
                    {asset.productsCount} items
                  </span>
                </div>
              </>
            )
          )}
        </div>

        <DialogFooter className="mt-4 flex flex-row items-center justify-end gap-2.5 sm:gap-2.5">
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={handleDelete}
            className="gap-2 min-w-[90px]"
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
