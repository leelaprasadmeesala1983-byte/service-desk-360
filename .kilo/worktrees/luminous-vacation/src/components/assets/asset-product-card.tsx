"use client";

import { Check, ChevronDown, Trash2 } from "lucide-react";
import type {
  Control,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from "react-hook-form";
import { Controller, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCT_TYPES } from "@/lib/constants/assets";
import { cn } from "@/lib/utils";
import type { AssetFormValues } from "@/lib/validations/assets";
import type { ProductType } from "@/types/assets";

type AssetProductCardProps = {
  index: number;
  totalProducts: number;
  control: Control<AssetFormValues>;
  register: UseFormRegister<AssetFormValues>;
  setValue: UseFormSetValue<AssetFormValues>;
  watch: UseFormWatch<AssetFormValues>;
  errors: FieldErrors<AssetFormValues>;
  onRemove: (index: number) => void;
};

export function AssetProductCard({
  index,
  totalProducts,
  control,
  register,
  setValue,
  watch,
  errors,
  onRemove,
}: AssetProductCardProps) {
  const productType = useWatch({
    control,
    name: `products.${index}.productType`,
    defaultValue: "Camera",
  });
  const isOther = productType === "Other";
  const productErrors = errors.products?.[index];

  return (
    <div className="rounded-xl border border-border bg-card/90 p-4 sm:p-5 shadow-xs transition-colors space-y-4">
      {/* Product Card Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
            {index + 1}
          </span>
          <h4 className="text-sm font-bold tracking-wide uppercase text-foreground">
            Product #{index + 1}
          </h4>
        </div>
        {totalProducts > 1 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive cursor-pointer"
          >
            <Trash2 className="size-3.5" />
            <span>Remove</span>
          </Button>
        )}
      </div>

      {/* 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Row 1, Col 1: Product Type Dropdown */}
        <div className="space-y-1.5">
          <Label htmlFor={`product-${index}-type`}>
            Product Type <span className="text-destructive">*</span>
          </Label>
          <Controller
            control={control}
            name={`products.${index}.productType`}
            render={({ field }) => (
              <Select
                value={field.value || "Camera"}
                onValueChange={(val) => {
                  field.onChange(val as ProductType);
                  if (val !== "Other") {
                    setValue(`products.${index}.otherProductType`, "");
                  }
                }}
              >
                <SelectTrigger
                  id={`product-${index}-type`}
                  className={cn(
                    "h-9 w-full rounded-md border-border bg-background",
                    productErrors?.productType &&
                      "border-destructive ring-1 ring-destructive/30",
                  )}
                >
                  <SelectValue placeholder="Select product type" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {productErrors?.productType && (
            <p className="text-xs text-destructive">
              {productErrors.productType.message}
            </p>
          )}
        </div>

        {/* Row 1, Col 2: Brand Name */}
        <div className="space-y-1.5">
          <Label htmlFor={`product-${index}-brand`}>
            Brand Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`product-${index}-brand`}
            placeholder="e.g. Hikvision, TP-Link, Dahua"
            {...register(`products.${index}.brandName`)}
            className={cn(
              "h-9 bg-background",
              productErrors?.brandName &&
                "border-destructive ring-1 ring-destructive/30",
            )}
          />
          {productErrors?.brandName && (
            <p className="text-xs text-destructive">
              {productErrors.brandName.message}
            </p>
          )}
        </div>

        {/* Conditional Custom Product Type (when 'Other' selected) */}
        {isOther && (
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor={`product-${index}-other`}>
              Other Product Type <span className="text-destructive">*</span>
            </Label>
            <Input
              id={`product-${index}-other`}
              placeholder="e.g. Router, Access Point, Firewall"
              {...register(`products.${index}.otherProductType`)}
              className={cn(
                "h-9 bg-background",
                productErrors?.otherProductType &&
                  "border-destructive ring-1 ring-destructive/30",
              )}
            />
            {productErrors?.otherProductType && (
              <p className="text-xs text-destructive">
                {productErrors.otherProductType.message}
              </p>
            )}
          </div>
        )}

        {/* Row 2, Col 1: Model Number */}
        <div className="space-y-1.5">
          <Label htmlFor={`product-${index}-model`}>
            Model Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`product-${index}-model`}
            placeholder="e.g. DS-2CD2043G2-I"
            {...register(`products.${index}.modelNumber`)}
            className={cn(
              "h-9 bg-background",
              productErrors?.modelNumber &&
                "border-destructive ring-1 ring-destructive/30",
            )}
          />
          {productErrors?.modelNumber && (
            <p className="text-xs text-destructive">
              {productErrors.modelNumber.message}
            </p>
          )}
        </div>

        {/* Row 2, Col 2: Serial Number */}
        <div className="space-y-1.5">
          <Label htmlFor={`product-${index}-serial`}>
            Serial Number <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`product-${index}-serial`}
            placeholder="e.g. SN12345678"
            {...register(`products.${index}.serialNumber`)}
            className={cn(
              "h-9 bg-background",
              productErrors?.serialNumber &&
                "border-destructive ring-1 ring-destructive/30",
            )}
          />
          {productErrors?.serialNumber && (
            <p className="text-xs text-destructive">
              {productErrors.serialNumber.message}
            </p>
          )}
        </div>

        {/* Row 3: Quantity (Full Width) */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor={`product-${index}-quantity`}>
            Quantity <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`product-${index}-quantity`}
            type="number"
            min="1"
            step="1"
            placeholder="1"
            {...register(`products.${index}.quantity`)}
            className={cn(
              "h-9 bg-background",
              productErrors?.quantity &&
                "border-destructive ring-1 ring-destructive/30",
            )}
          />
          {productErrors?.quantity && (
            <p className="text-xs text-destructive">
              {productErrors.quantity.message}
            </p>
          )}
        </div>

        {/* Row 4: Accessories (Full Width) */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor={`product-${index}-accessories`}>Accessories</Label>
          <Input
            id={`product-${index}-accessories`}
            placeholder="e.g. Power Adapter, Mount, LAN Cable"
            {...register(`products.${index}.accessories`)}
            className="h-9 bg-background"
          />
        </div>

        {/* Row 4: Description (Full Width) */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor={`product-${index}-description`}>Description</Label>
          <Input
            id={`product-${index}-description`}
            placeholder="e.g. 4MP Dome Camera for entrance hallway"
            {...register(`products.${index}.description`)}
            className="h-9 bg-background"
          />
        </div>

        {/* Row 5: Remarks (Full Width) */}
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor={`product-${index}-remarks`}>Remarks</Label>
          <Input
            id={`product-${index}-remarks`}
            placeholder="e.g. Tested on bench, working fine"
            {...register(`products.${index}.remarks`)}
            className="h-9 bg-background"
          />
        </div>
      </div>
    </div>
  );
}
