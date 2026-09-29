"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type SubmitHandler, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_ASSET_PRODUCT } from "@/lib/constants/assets";
import { cn } from "@/lib/utils";
import {
  type AssetFormValues,
  assetFormSchema,
} from "@/lib/validations/assets";
import type { Asset, AssetRow, ProductType } from "@/types/assets";

import { AssetProductCard } from "./asset-product-card";

type AssetFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialData?: Asset | AssetRow | null;
  onClose: () => void;
  onSubmit: (values: AssetFormValues) => Promise<boolean>;
};

const defaultValues: AssetFormValues = {
  customerName: "",
  customerNumber: "",
  location: "",
  status: "Received",
  products: [
    {
      id: crypto.randomUUID(),
      productType: "Camera",
      otherProductType: "",
      brandName: "",
      modelNumber: "",
      serialNumber: "",
      quantity: 1,
      accessories: "",
      description: "",
      remarks: "",
    },
  ],
};

export function AssetFormDialog({
  open,
  mode,
  initialData,
  onClose,
  onSubmit,
}: AssetFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues,
    mode: "onChange",
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "products",
    keyName: "_key",
  });

  // Reset or populate form whenever dialog opens or initialData changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        reset({
          name: initialData.name || "",
          customerName: initialData.customerName || "",
          customerNumber: initialData.customerNumber || "",
          location: initialData.location || "",
          status: initialData.status || "Received",
          products:
            initialData.products && initialData.products.length > 0
              ? initialData.products.map((p) => ({
                  id: p.id || crypto.randomUUID(),
                  productType: (p.productType as ProductType) || "Camera",
                  otherProductType: p.otherProductType || "",
                  brandName: p.brandName || "",
                  modelNumber: p.modelNumber || "",
                  serialNumber: p.serialNumber || "",
                  quantity: Number(p.quantity) || 1,
                  accessories: p.accessories || "",
                  description: p.description || "",
                  remarks: p.remarks || "",
                }))
              : [
                  {
                    id: crypto.randomUUID(),
                    productType: "Camera",
                    otherProductType: "",
                    brandName: "",
                    modelNumber: "",
                    serialNumber: "",
                    quantity: 1,
                    accessories: "",
                    description: "",
                    remarks: "",
                  },
                ],
        });
      } else {
        reset({
          customerName: "",
          customerNumber: "",
          location: "",
          status: "Received",
          products: [
            {
              id: crypto.randomUUID(),
              productType: "Camera",
              otherProductType: "",
              brandName: "",
              modelNumber: "",
              serialNumber: "",
              quantity: 1,
              accessories: "",
              description: "",
              remarks: "",
            },
          ],
        });
      }
    }
  }, [open, mode, initialData, reset]);

  const handleAddProduct = () => {
    append({
      id: crypto.randomUUID(),
      productType: "Camera",
      otherProductType: "",
      brandName: "",
      modelNumber: "",
      serialNumber: "",
      quantity: 1,
      accessories: "",
      description: "",
      remarks: "",
    });
  };

  const handleRemoveProduct = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      toast.warning("At least one product is required for an asset entry.");
    }
  };

  const onFormSubmit: SubmitHandler<AssetFormValues> = async (values) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const success = await onSubmit(values);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error("Form submit error:", error);
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
        className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl"
      >
        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-col h-full max-h-[90vh] overflow-hidden"
        >
          {/* STICKY HEADER */}
          <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-background px-5 py-3.5 sm:px-6 sm:py-4 shadow-2xs">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-lg sm:text-xl font-bold text-foreground truncate">
                {mode === "create" ? "Create Asset" : "Edit Asset"}
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

          {/* SCROLLABLE FORM BODY */}
          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6 space-y-6">
            {/* Section 1: Asset Information */}
            <div className="space-y-4">
              <div className="border-b border-border/80 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Asset Information
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Customer Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="customer-name">
                    Customer Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customer-name"
                    placeholder="e.g. ABC Company"
                    {...register("customerName")}
                    className={cn(
                      "h-9 bg-background",
                      errors.customerName &&
                        "border-destructive ring-1 ring-destructive/30",
                    )}
                  />
                  {errors.customerName && (
                    <p className="text-xs text-destructive">
                      {errors.customerName.message}
                    </p>
                  )}
                </div>

                {/* 2. Customer Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="customer-number">
                    Customer Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customer-number"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    {...register("customerNumber", {
                      onChange: (e) => {
                        const digitsOnly = e.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        setValue("customerNumber", digitsOnly, {
                          shouldValidate: true,
                        });
                      },
                    })}
                    className={cn(
                      "h-9 bg-background font-mono",
                      errors.customerNumber &&
                        "border-destructive ring-1 ring-destructive/30",
                    )}
                  />
                  {errors.customerNumber && (
                    <p className="text-xs text-destructive">
                      {errors.customerNumber.message}
                    </p>
                  )}
                </div>

                {/* 3. Location */}
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="asset-location">
                    Location <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="asset-location"
                    placeholder="e.g. Hyderabad, HITEC City"
                    {...register("location")}
                    className={cn(
                      "h-9 bg-background",
                      errors.location &&
                        "border-destructive ring-1 ring-destructive/30",
                    )}
                  />
                  {errors.location && (
                    <p className="text-xs text-destructive">
                      {errors.location.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Products */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-border/80 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Products ({fields.length})
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddProduct}
                  className="gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  Add Product
                </Button>
              </div>

              {/* Dynamic Product Cards */}
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <AssetProductCard
                    key={field._key}
                    index={index}
                    totalProducts={fields.length}
                    control={control}
                    register={register}
                    setValue={setValue}
                    watch={watch}
                    errors={errors}
                    onRemove={handleRemoveProduct}
                  />
                ))}
              </div>
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
                {mode === "create" ? "Create Asset" : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
