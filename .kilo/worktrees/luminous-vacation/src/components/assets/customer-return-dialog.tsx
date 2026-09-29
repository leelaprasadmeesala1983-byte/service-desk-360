"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import { formatLocalDate, formatRecordId } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  type CustomerReturnFormValues,
  customerReturnFormSchema,
} from "@/lib/validations/customer-dispatch";
import type { AssetRow } from "@/types/assets";

type CustomerReturnDialogProps = {
  open: boolean;
  asset: AssetRow | null;
  onClose: () => void;
  onSubmit: (values: CustomerReturnFormValues) => Promise<boolean>;
};

export function CustomerReturnDialog({
  open,
  asset,
  onClose,
  onSubmit,
}: CustomerReturnDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CustomerReturnFormValues>({
    resolver: zodResolver(customerReturnFormSchema),
    defaultValues: {
      assetId: asset?.id || "",
      returnDate: formatLocalDate(new Date()),
      handedOverTo: asset?.customerName || "",
      phone: asset?.customerNumber || "",
      serviceCharges: 0,
      remarks: "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (open && asset) {
      reset({
        assetId: asset.id,
        returnDate: formatLocalDate(new Date()),
        handedOverTo: asset.customerName || "",
        phone: asset.customerNumber || "",
        serviceCharges: 0,
        remarks: "",
      });
    }
  }, [open, asset, reset]);

  const handleFormSubmit: SubmitHandler<CustomerReturnFormValues> = async (
    data,
  ) => {
    setIsSubmitting(true);
    try {
      const success = await onSubmit(data);
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!asset) return null;

  const product = asset.products?.[0];

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className="max-w-xl max-h-[90vh] overflow-y-auto p-0 border border-border bg-card shadow-xl rounded-xl"
        showCloseButton={false}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <RotateCcw className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Return Material to Customer
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Hand over repaired material back to original client & complete
                lifecycle
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="p-6 space-y-6"
        >
          {/* Linked Material Details Card */}
          <div className="rounded-lg border border-border/80 bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Material Information
              </span>
              <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                {formatRecordId("ASSET", asset.seq)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground block">Customer:</span>
                <span className="font-semibold text-foreground">
                  {asset.customerName}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Contact:</span>
                <span className="font-semibold text-foreground">
                  {asset.customerNumber}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Product:</span>
                <span className="font-semibold text-foreground">
                  {product
                    ? `${product.brandName || ""} ${product.modelNumber || ""} (${product.productType})`.trim()
                    : asset.name}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">
                  Serial Number:
                </span>
                <span className="font-mono font-semibold text-foreground">
                  {product?.serialNumber || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Return Details */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Handover & Return Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Return Date */}
              <div className="space-y-1.5">
                <Label htmlFor="returnDate" className="text-xs font-semibold">
                  Return Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="returnDate"
                  type="date"
                  {...register("returnDate")}
                  className={cn(
                    "h-9 text-xs",
                    errors.returnDate && "border-destructive",
                  )}
                />
                {errors.returnDate && (
                  <p className="text-[11px] text-destructive">
                    {errors.returnDate.message}
                  </p>
                )}
              </div>

              {/* Handed Over To */}
              <div className="space-y-1.5">
                <Label htmlFor="handedOverTo" className="text-xs font-semibold">
                  Handed Over To <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="handedOverTo"
                  placeholder="Customer or representative name"
                  {...register("handedOverTo")}
                  className={cn(
                    "h-9 text-xs",
                    errors.handedOverTo && "border-destructive",
                  )}
                />
                {errors.handedOverTo && (
                  <p className="text-[11px] text-destructive">
                    {errors.handedOverTo.message}
                  </p>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-semibold">
                  Contact Phone Number{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <PhoneInput
                  id="phone"
                  placeholder="10-digit mobile number"
                  {...register("phone")}
                  className={cn(
                    "h-9 text-xs font-mono",
                    errors.phone && "border-destructive",
                  )}
                />
                {errors.phone && (
                  <p className="text-[11px] text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              {/* Service Charges */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="serviceCharges"
                  className="text-xs font-semibold"
                >
                  Service Charges (₹)
                </Label>
                <Input
                  id="serviceCharges"
                  type="number"
                  min={0}
                  placeholder="0.00"
                  {...register("serviceCharges")}
                  className={cn(
                    "h-9 text-xs font-mono",
                    errors.serviceCharges && "border-destructive",
                  )}
                />
                {errors.serviceCharges && (
                  <p className="text-[11px] text-destructive">
                    {errors.serviceCharges.message}
                  </p>
                )}
              </div>
            </div>

            {/* Remarks / Sign-off notes */}
            <div className="space-y-1.5">
              <Label htmlFor="remarks" className="text-xs font-semibold">
                Sign-off Remarks / Customer Notes
              </Label>
              <Textarea
                id="remarks"
                placeholder="Enter customer handover notes, testing verification remarks, invoice references..."
                rows={3}
                {...register("remarks")}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 text-xs font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Processing Handover...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  <span>Complete Customer Return</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
