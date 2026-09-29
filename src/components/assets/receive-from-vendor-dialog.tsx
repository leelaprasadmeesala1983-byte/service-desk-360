"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatLocalDate, formatRecordId } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  type ReceiveFromVendorFormValues,
  receiveFromVendorSchema,
} from "@/lib/validations/send-to-vendor";
import type { AssetRow } from "@/types/assets";
import type { SendToVendorRow } from "@/types/send-to-vendor";

type ReceiveFromVendorDialogProps = {
  open: boolean;
  asset?: AssetRow | null;
  dispatchRecord?: SendToVendorRow | null;
  onClose: () => void;
  onSubmit: (values: ReceiveFromVendorFormValues) => Promise<boolean>;
};

export function ReceiveFromVendorDialog({
  open,
  asset,
  dispatchRecord,
  onClose,
  onSubmit,
}: ReceiveFromVendorDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReceiveFromVendorFormValues>({
    resolver: zodResolver(receiveFromVendorSchema),
    defaultValues: {
      vendorReturnDate: formatLocalDate(new Date()),
      repairStatus: "REPAIR_COMPLETED",
      repairRemarks: "",
      returnDocketNumber: "",
      additionalRemarks: "",
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = form;

  const currentRepairStatus = watch("repairStatus");

  useEffect(() => {
    if (open) {
      reset({
        vendorReturnDate: formatLocalDate(new Date()),
        repairStatus: "REPAIR_COMPLETED",
        repairRemarks: "",
        returnDocketNumber: "",
        additionalRemarks: "",
      });
    }
  }, [open, reset]);

  const onFormSubmit: SubmitHandler<ReceiveFromVendorFormValues> = async (
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

  const materialId = asset?.seq
    ? formatRecordId("ASSET", asset.seq)
    : dispatchRecord?.assetSeq
      ? formatRecordId("ASSET", dispatchRecord.assetSeq)
      : null;

  const materialName = asset?.name || dispatchRecord?.assetName || "Material";
  const vendorName = dispatchRecord?.vendorName || "Vendor";

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl"
      >
        {/* Sticky Header */}
        <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-background px-6 py-4 shadow-2xs">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {materialId && (
                  <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                    {materialId}
                  </span>
                )}
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                  Receive Material from Vendor
                </DialogTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Record the repair outcome and return of {materialName} from{" "}
                {vendorName}
              </p>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close"
              className="size-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg shrink-0"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4.5">
            {/* Vendor Return Date */}
            <div className="space-y-1.5">
              <Label
                htmlFor="vendorReturnDate"
                className="text-xs font-semibold text-foreground"
              >
                Vendor Return Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vendorReturnDate"
                type="date"
                {...register("vendorReturnDate")}
                className={cn(
                  "h-9.5 text-sm bg-background",
                  errors.vendorReturnDate &&
                    "border-destructive focus-visible:ring-destructive",
                )}
              />
              {errors.vendorReturnDate && (
                <p className="text-xs text-destructive">
                  {errors.vendorReturnDate.message}
                </p>
              )}
            </div>

            {/* Repair Outcome */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">
                Repair Status / Outcome{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={currentRepairStatus}
                onValueChange={(
                  val: "REPAIR_COMPLETED" | "REPAIR_REJECTED" | null,
                ) => {
                  if (val) {
                    setValue("repairStatus", val, { shouldValidate: true });
                  }
                }}
              >
                <SelectTrigger className="h-9.5 text-sm bg-background">
                  <SelectValue placeholder="Select repair status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REPAIR_COMPLETED">
                    ✓ Repair Completed (Functional & Tested)
                  </SelectItem>
                  <SelectItem value="REPAIR_REJECTED">
                    ✕ Repair Rejected / Non-Repairable
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.repairStatus && (
                <p className="text-xs text-destructive">
                  {errors.repairStatus.message}
                </p>
              )}
            </div>

            {/* Return Docket / AWB Number */}
            <div className="space-y-1.5">
              <Label
                htmlFor="returnDocketNumber"
                className="text-xs font-semibold text-foreground"
              >
                Return Courier Docket / AWB Number
              </Label>
              <Input
                id="returnDocketNumber"
                placeholder="Enter return docket number (optional)"
                {...register("returnDocketNumber")}
                className="h-9.5 text-sm bg-background"
              />
            </div>

            {/* Repair Remarks */}
            <div className="space-y-1.5">
              <Label
                htmlFor="repairRemarks"
                className="text-xs font-semibold text-foreground"
              >
                Repair Remarks / Work Done{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="repairRemarks"
                rows={3}
                placeholder="Describe parts replaced, tests conducted, or repair notes..."
                {...register("repairRemarks")}
                className={cn(
                  "text-sm bg-background resize-none",
                  errors.repairRemarks &&
                    "border-destructive focus-visible:ring-destructive",
                )}
              />
              {errors.repairRemarks && (
                <p className="text-xs text-destructive">
                  {errors.repairRemarks.message}
                </p>
              )}
            </div>

            {/* Additional Remarks */}
            <div className="space-y-1.5">
              <Label
                htmlFor="additionalRemarks"
                className="text-xs font-semibold text-foreground"
              >
                Additional Notes
              </Label>
              <Textarea
                id="additionalRemarks"
                rows={2}
                placeholder="Any special handling or client instructions..."
                {...register("additionalRemarks")}
                className="text-sm bg-background resize-none"
              />
            </div>

            <div className="rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 p-3 text-xs text-blue-800 dark:text-blue-300">
              Upon recording return, the material status will become{" "}
              <strong>Ready for Customer Dispatch</strong>.
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-background px-6 py-3.5 flex items-center justify-end gap-3 shadow-2xs">
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
              className="h-9 text-xs font-semibold gap-2 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
              <span>Confirm Vendor Return</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
