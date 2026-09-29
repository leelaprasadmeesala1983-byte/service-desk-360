"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { COURIER_OPTIONS } from "@/lib/constants/assets";
import { formatLocalDate, formatRecordId } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  type CustomerDispatchFormValues,
  customerDispatchFormSchema,
} from "@/lib/validations/customer-dispatch";
import type { AssetRow } from "@/types/assets";

type CustomerDispatchDialogProps = {
  open: boolean;
  asset: AssetRow | null;
  onClose: () => void;
  onSubmit: (values: CustomerDispatchFormValues) => Promise<boolean>;
};

export function CustomerDispatchDialog({
  open,
  asset,
  onClose,
  onSubmit,
}: CustomerDispatchDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [customCourier, setCustomCourier] = useState<string>("");

  const form = useForm<CustomerDispatchFormValues>({
    resolver: zodResolver(customerDispatchFormSchema),
    defaultValues: {
      assetId: asset?.id || "",
      customerName: asset?.customerName || "",
      customerContact: asset?.customerNumber || "",
      customerAddress: asset?.location || "",
      courierName: "",
      docketAwbNumber: "",
      dispatchDate: formatLocalDate(new Date()),
      numberOfPackages: 1,
      dispatchRemarks: "",
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

  const numberOfPackagesValue = watch("numberOfPackages");

  useEffect(() => {
    if (open && asset) {
      reset({
        assetId: asset.id,
        customerName: asset.customerName,
        customerContact: asset.customerNumber,
        customerAddress: asset.location,
        courierName: "",
        docketAwbNumber: "",
        dispatchDate: formatLocalDate(new Date()),
        numberOfPackages: 1,
        dispatchRemarks: "",
      });
      setSelectedCourier("");
      setCustomCourier("");
    }
  }, [open, asset, reset]);

  const onFormSubmit: SubmitHandler<CustomerDispatchFormValues> = async (
    data,
  ) => {
    setIsSubmitting(true);
    try {
      const finalCourier =
        selectedCourier === "Other"
          ? customCourier.trim()
          : selectedCourier.trim();

      const parsedPackages =
        typeof data.numberOfPackages === "number"
          ? data.numberOfPackages
          : Number.parseInt(String(data.numberOfPackages), 10);

      const success = await onSubmit({
        ...data,
        courierName: finalCourier,
        numberOfPackages: Number.isNaN(parsedPackages) ? 1 : parsedPackages,
      });
      if (success) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const materialId = asset?.seq
    ? formatRecordId("ASSET", asset.seq)
    : "Material";

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
                <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0">
                  {materialId}
                </span>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground truncate">
                  Dispatch Material to Customer
                </DialogTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                Deliver {asset?.name} back to {asset?.customerName}
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
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Customer Details Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="customerName"
                  className="text-xs font-semibold text-foreground"
                >
                  Customer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="customerName"
                  {...register("customerName")}
                  className={cn(
                    "h-9.5 text-sm bg-background",
                    errors.customerName &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.customerName && (
                  <p className="text-xs text-destructive">
                    {errors.customerName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="customerContact"
                  className="text-xs font-semibold text-foreground"
                >
                  Customer Phone <span className="text-destructive">*</span>
                </Label>
                <PhoneInput
                  id="customerContact"
                  {...register("customerContact")}
                  className={cn(
                    "h-9.5 text-sm bg-background",
                    errors.customerContact &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.customerContact && (
                  <p className="text-xs text-destructive">
                    {errors.customerContact.message}
                  </p>
                )}
              </div>
            </div>

            {/* Customer Address */}
            <div className="space-y-1.5">
              <Label
                htmlFor="customerAddress"
                className="text-xs font-semibold text-foreground"
              >
                Delivery Address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="customerAddress"
                rows={2}
                {...register("customerAddress")}
                className={cn(
                  "text-sm bg-background resize-none",
                  errors.customerAddress &&
                    "border-destructive focus-visible:ring-destructive",
                )}
              />
              {errors.customerAddress && (
                <p className="text-xs text-destructive">
                  {errors.customerAddress.message}
                </p>
              )}
            </div>

            {/* Courier & Docket Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">
                  Courier / Transport Name{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={selectedCourier}
                  onValueChange={(val: string | null) => {
                    const resolved = val || "";
                    setSelectedCourier(resolved);
                    if (resolved !== "Other") {
                      setValue("courierName", resolved, {
                        shouldValidate: true,
                      });
                    } else {
                      setValue("courierName", customCourier, {
                        shouldValidate: true,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="h-9.5 text-sm bg-background">
                    <SelectValue placeholder="Select courier" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURIER_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCourier === "Other" && (
                  <Input
                    placeholder="Enter courier name"
                    value={customCourier}
                    onChange={(e) => {
                      setCustomCourier(e.target.value);
                      setValue("courierName", e.target.value, {
                        shouldValidate: true,
                      });
                    }}
                    className="h-9.5 text-sm bg-background mt-2"
                  />
                )}
                {errors.courierName && (
                  <p className="text-xs text-destructive">
                    {errors.courierName.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="docketAwbNumber"
                  className="text-xs font-semibold text-foreground"
                >
                  Docket / AWB Number{" "}
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="docketAwbNumber"
                  placeholder="Enter tracking/AWB number"
                  {...register("docketAwbNumber")}
                  className={cn(
                    "h-9.5 text-sm bg-background",
                    errors.docketAwbNumber &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.docketAwbNumber && (
                  <p className="text-xs text-destructive">
                    {errors.docketAwbNumber.message}
                  </p>
                )}
              </div>
            </div>

            {/* Dispatch Date & Packages */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="dispatchDate"
                  className="text-xs font-semibold text-foreground"
                >
                  Dispatch Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="dispatchDate"
                  type="date"
                  {...register("dispatchDate")}
                  className={cn(
                    "h-9.5 text-sm bg-background",
                    errors.dispatchDate &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.dispatchDate && (
                  <p className="text-xs text-destructive">
                    {errors.dispatchDate.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="numberOfPackages"
                  className="text-xs font-semibold text-foreground"
                >
                  No. of Packages <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="numberOfPackages"
                  type="text"
                  inputMode="numeric"
                  placeholder="1"
                  value={
                    numberOfPackagesValue === undefined ||
                    numberOfPackagesValue === null
                      ? ""
                      : String(numberOfPackagesValue)
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "e" ||
                      e.key === "E" ||
                      e.key === "+" ||
                      e.key === "-" ||
                      e.key === "." ||
                      e.key === ","
                    ) {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val)) {
                      setValue(
                        "numberOfPackages",
                        val === "" ? ("" as any) : Number.parseInt(val, 10),
                        { shouldValidate: true },
                      );
                    }
                  }}
                  className={cn(
                    "h-9.5 text-sm bg-background font-mono",
                    errors.numberOfPackages &&
                      "border-destructive focus-visible:ring-destructive",
                  )}
                />
                {errors.numberOfPackages && (
                  <p className="text-xs text-destructive">
                    {errors.numberOfPackages.message}
                  </p>
                )}
              </div>
            </div>

            {/* Dispatch Remarks */}
            <div className="space-y-1.5">
              <Label
                htmlFor="dispatchRemarks"
                className="text-xs font-semibold text-foreground"
              >
                Dispatch Remarks
              </Label>
              <Textarea
                id="dispatchRemarks"
                rows={2}
                placeholder="Special delivery instructions, gate pass info..."
                {...register("dispatchRemarks")}
                className="text-sm bg-background resize-none"
              />
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
              <span>Confirm Customer Dispatch</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
