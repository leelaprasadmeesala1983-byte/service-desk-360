"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  type VendorFormValues,
  vendorFormSchema,
} from "@/lib/validations/vendors";
import type { Vendor, VendorRow } from "@/types/vendors";

type VendorFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialData?: Vendor | VendorRow | null;
  onClose: () => void;
  onSubmit: (values: VendorFormValues) => Promise<boolean>;
};

const defaultValues: VendorFormValues = {
  vendorName: "",
  contactPerson: "",
  phoneNumber: "",
  address: "",
};

export function VendorFormDialog({
  open,
  mode,
  initialData,
  onClose,
  onSubmit,
}: VendorFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = form;

  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        reset({
          vendorName: initialData.vendorName || "",
          contactPerson: initialData.contactPerson || "",
          phoneNumber: initialData.phoneNumber || "",
          address: initialData.address || "",
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [open, mode, initialData, reset]);

  const onFormSubmit: SubmitHandler<VendorFormValues> = async (values) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const success = await onSubmit(values);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error("Vendor form submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !val && !isSubmitting && onClose()}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-lg flex flex-col p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl"
      >
        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-col h-full overflow-hidden"
        >
          {/* STICKY HEADER */}
          <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-background px-5 py-3.5 sm:px-6 sm:py-4 shadow-2xs">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground">
                {mode === "create" ? "Add Vendor" : "Edit Vendor"}
              </DialogTitle>

              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isSubmitting}
                onClick={onClose}
                aria-label="Close"
                className="size-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-lg"
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>

          {/* FORM BODY */}
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 space-y-4">
            {/* 1. Vendor Name */}
            <div className="space-y-1.5">
              <Label htmlFor="vendor-name-input">
                Vendor Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="vendor-name-input"
                placeholder="e.g. ABC Electronics"
                {...register("vendorName")}
                className={cn(
                  "h-9 bg-background",
                  errors.vendorName &&
                    "border-destructive ring-1 ring-destructive/30",
                )}
              />
              {errors.vendorName && (
                <p className="text-xs text-destructive">
                  {errors.vendorName.message}
                </p>
              )}
            </div>

            {/* 2. Contact Person */}
            <div className="space-y-1.5">
              <Label htmlFor="contact-person-input">
                Contact Person <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-person-input"
                placeholder="e.g. Ramesh Kumar"
                {...register("contactPerson")}
                className={cn(
                  "h-9 bg-background",
                  errors.contactPerson &&
                    "border-destructive ring-1 ring-destructive/30",
                )}
              />
              {errors.contactPerson && (
                <p className="text-xs text-destructive">
                  {errors.contactPerson.message}
                </p>
              )}
            </div>

            {/* 3. Phone Number */}
            <div className="space-y-1.5">
              <Label htmlFor="phone-number-input">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone-number-input"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="e.g. 9876543210"
                {...register("phoneNumber", {
                  onChange: (e) => {
                    const digitsOnly = e.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10);
                    setValue("phoneNumber", digitsOnly, {
                      shouldValidate: true,
                    });
                  },
                })}
                className={cn(
                  "h-9 bg-background font-mono",
                  errors.phoneNumber &&
                    "border-destructive ring-1 ring-destructive/30",
                )}
              />
              {errors.phoneNumber && (
                <p className="text-xs text-destructive">
                  {errors.phoneNumber.message}
                </p>
              )}
            </div>

            {/* 4. Address */}
            <div className="space-y-1.5">
              <Label htmlFor="address-input">
                Address <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="address-input"
                rows={3}
                placeholder="e.g. Hyderabad, Telangana"
                {...register("address")}
                className={cn(
                  "bg-background resize-y min-h-[70px]",
                  errors.address &&
                    "border-destructive ring-1 ring-destructive/30",
                )}
              />
              {errors.address && (
                <p className="text-xs text-destructive">
                  {errors.address.message}
                </p>
              )}
            </div>
          </div>

          {/* STICKY FOOTER */}
          <div className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-background px-5 py-3.5 sm:px-6 shadow-xs">
            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={onClose}
                className="h-9 px-4 text-xs sm:text-sm cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                className="h-9 px-4 text-xs sm:text-sm font-semibold gap-1.5 min-w-[110px] cursor-pointer shadow-xs"
              >
                {isSubmitting && <Loader2 className="size-3.5 animate-spin" />}
                {mode === "create" ? "Create Vendor" : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
