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
import type { VendorRow } from "@/types/vendors";

type VendorDeleteDialogProps = {
  open: boolean;
  vendor: VendorRow | null;
  onClose: () => void;
  onConfirm: (id: string) => Promise<boolean>;
};

export function VendorDeleteDialog({
  open,
  vendor,
  onClose,
  onConfirm,
}: VendorDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!vendor) return null;

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const success = await onConfirm(vendor.id);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error("Delete vendor error:", error);
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
          <DialogTitle className="text-lg font-bold">Delete Vendor</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              "{vendor.vendorName}"
            </span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 rounded-lg border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground space-y-1.5">
          <div className="flex justify-between">
            <span className="font-medium">Vendor Name:</span>
            <span className="text-foreground font-medium">
              {vendor.vendorName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Contact Person:</span>
            <span className="text-foreground">{vendor.contactPerson}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">Phone Number:</span>
            <span className="font-mono text-foreground">
              {vendor.phoneNumber}
            </span>
          </div>
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
