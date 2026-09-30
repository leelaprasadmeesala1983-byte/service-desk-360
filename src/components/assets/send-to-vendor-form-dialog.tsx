"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Package, Truck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type SubmitHandler, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getActiveVendors } from "@/lib/actions/vendors";
import { formatLocalDate, formatRecordId } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  type SendToVendorFormValues,
  sendToVendorFormSchema,
} from "@/lib/validations/send-to-vendor";
import type { AssetProduct, AssetRow, ReceivedItemRow } from "@/types/assets";
import type {
  DispatchItem,
  SendToVendor,
  SendToVendorRow,
} from "@/types/send-to-vendor";
import type { VendorRow } from "@/types/vendors";

export const COURIER_OPTIONS = [
  "DTDC",
  "Blue Dart",
  "Professional",
  "VRL",
  "India Post",
  "Speed Post",
  "Hand Delivery",
  "Other",
] as const;

type SendToVendorFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialData?: SendToVendor | SendToVendorRow | null;
  initialAsset?: AssetRow | null;
  initialDispatchItems?: ReceivedItemRow[] | DispatchItem[] | null;
  availableAssets?: AssetRow[];
  onClose: () => void;
  onSubmit: (values: SendToVendorFormValues) => Promise<boolean>;
};

const DEFAULT_SEND_TO_VENDOR_VALUES: SendToVendorFormValues = {
  assetId: "",
  vendorId: "",
  vendorName: "",
  contactPerson: "",
  phoneNumber: "",
  address: "",
  reasonForRepair: "",
  remarks: "",
  courierName: "",
  docketAwbNumber: "",
  bookingDate: "",
  numberOfPackages: "" as unknown as number,
  noOfPackages: "" as unknown as number,
  dispatchRemarks: "",
};

export function SendToVendorFormDialog({
  open,
  mode,
  initialData,
  initialAsset,
  initialDispatchItems,
  availableAssets = [],
  onClose,
  onSubmit,
}: SendToVendorFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<string>("");
  const [customCourier, setCustomCourier] = useState<string>("");

  // Customer & items state
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [selectedItems, setSelectedItems] = useState<DispatchItem[]>([]);

  // Vendor dynamic state
  const [vendorsList, setVendorsList] = useState<VendorRow[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [isLoadingVendors, setIsLoadingVendors] = useState<boolean>(false);

  const form = useForm<SendToVendorFormValues>({
    resolver: zodResolver(sendToVendorFormSchema),
    defaultValues: {
      ...DEFAULT_SEND_TO_VENDOR_VALUES,
      bookingDate: formatLocalDate(new Date()),
    },
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = form;

  const numberOfPackagesValue =
    watch("numberOfPackages") ?? watch("noOfPackages");

  // Flatten available assets into available un-dispatched product items
  const allAvailableItems = useMemo<DispatchItem[]>(() => {
    const list: DispatchItem[] = [];

    availableAssets.forEach((ast) => {
      const products =
        Array.isArray(ast.products) && ast.products.length > 0
          ? ast.products
          : [];

      products.forEach((p, idx) => {
        const itemStatus = (p.status || ast.status || "").toLowerCase();
        const isDispatched =
          Boolean(p.dispatchId) ||
          itemStatus === "dispatched_to_vendor" ||
          itemStatus === "sent to vendor" ||
          itemStatus === "under repair" ||
          itemStatus === "under_repair" ||
          itemStatus === "vendor_received" ||
          itemStatus === "repair_completed";

        if (!isDispatched) {
          list.push({
            receivedMaterialId: ast.id,
            receivedItemId: p.id || `${ast.id}_prod_${idx}`,
            trackId: formatRecordId("ASSET", ast.seq),
            productId: p.id || `${ast.id}_prod_${idx}`,
            productName:
              p.productType === "Other" && p.otherProductType
                ? p.otherProductType
                : p.productType,
            serialNumber: p.serialNumber || "—",
            brandName: p.brandName || "",
            modelNumber: p.modelNumber || "",
            quantity: Number(p.quantity) || 1,
            customerName: ast.customerName || "",
          });
        }
      });
    });

    return list;
  }, [availableAssets]);

  // Extract unique customers from available received materials
  const uniqueCustomers = useMemo(() => {
    const map = new Map<
      string,
      { customerName: string; availableCount: number }
    >();

    availableAssets.forEach((ast) => {
      if (ast.customerName && ast.customerName.trim()) {
        const name = ast.customerName.trim();
        const current = map.get(name) || {
          customerName: name,
          availableCount: 0,
        };
        const products = Array.isArray(ast.products) ? ast.products : [];
        const unDispatched = products.filter((p) => {
          const s = (p.status || ast.status || "").toLowerCase();
          return (
            !p.dispatchId &&
            s !== "dispatched_to_vendor" &&
            s !== "sent to vendor"
          );
        }).length;

        current.availableCount += unDispatched || 1;
        map.set(name, current);
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.customerName.localeCompare(b.customerName),
    );
  }, [availableAssets]);

  // Available products for the selected customer
  const customerAvailableProducts = useMemo(() => {
    if (!selectedCustomer) return [];
    return allAvailableItems.filter((item) => {
      const parentAsset = availableAssets.find(
        (a) => a.id === item.receivedMaterialId,
      );
      return (
        parentAsset?.customerName?.trim().toLowerCase() ===
        selectedCustomer.trim().toLowerCase()
      );
    });
  }, [allAvailableItems, availableAssets, selectedCustomer]);

  // Load active vendors when dialog opens
  useEffect(() => {
    if (open) {
      setIsLoadingVendors(true);
      getActiveVendors()
        .then((res) => {
          if (res.ok && res.data) {
            setVendorsList(res.data);
            if (initialData) {
              const matched = res.data.find(
                (v) =>
                  (initialData.vendorId && v.id === initialData.vendorId) ||
                  (initialData.vendorName &&
                    v.vendorName.toLowerCase() ===
                      initialData.vendorName.toLowerCase()),
              );
              if (matched) {
                setSelectedVendorId(matched.id);
                setValue("vendorId", matched.id);
                setValue("vendorName", matched.vendorName);
                setValue("contactPerson", matched.contactPerson);
                setValue("phoneNumber", matched.phoneNumber);
                setValue("address", matched.address);
              }
            }
          }
        })
        .finally(() => {
          setIsLoadingVendors(false);
        });
    }
  }, [open, initialData, setValue]);

  // Initialize or reset form state on open
  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        const rawCourier = initialData.courierName || "";
        const isStandard = (
          COURIER_OPTIONS.filter((c) => c !== "Other") as readonly string[]
        ).includes(rawCourier);

        if (isStandard) {
          setSelectedCourier(rawCourier);
          setCustomCourier("");
        } else if (rawCourier) {
          setSelectedCourier("Other");
          setCustomCourier(rawCourier === "Other" ? "" : rawCourier);
        } else {
          setSelectedCourier("");
          setCustomCourier("");
        }

        const items = Array.isArray(initialData.items) ? initialData.items : [];
        setSelectedItems(items);
        setSelectedCustomer(
          initialData.customerName || initialData.asset?.customerName || "",
        );
        setSelectedVendorId(initialData.vendorId || "");

        reset({
          assetId: initialData.assetId || items[0]?.receivedMaterialId || "",
          items,
          vendorId: initialData.vendorId || "",
          vendorName: initialData.vendorName || "",
          contactPerson: initialData.contactPerson || "",
          phoneNumber: initialData.phoneNumber || "",
          address: initialData.address || "",
          reasonForRepair: initialData.reasonForRepair || "",
          remarks: initialData.remarks || "",
          courierName: initialData.courierName || "",
          docketAwbNumber: initialData.docketAwbNumber || "",
          bookingDate: formatLocalDate(initialData.bookingDate),
          numberOfPackages:
            initialData.numberOfPackages ||
            (initialData as any).noOfPackages ||
            1,
          noOfPackages:
            initialData.numberOfPackages ||
            (initialData as any).noOfPackages ||
            1,
          dispatchRemarks: initialData.dispatchRemarks || "",
        });
      } else if (initialDispatchItems && initialDispatchItems.length > 0) {
        // Populated from Received Material Selection
        const formattedItems: DispatchItem[] = initialDispatchItems.map(
          (it: any) => ({
            receivedMaterialId: it.assetId || it.receivedMaterialId,
            receivedItemId: it.productId || it.receivedItemId,
            trackId:
              it.trackId || (it.assetSeq ? `AST-${it.assetSeq + 1000}` : "—"),
            productId: it.productId || it.receivedItemId,
            productName: it.productType || it.productName || "Product",
            serialNumber: it.serialNumber || "—",
            brandName: it.brandName || "",
            modelNumber: it.modelNumber || "",
            quantity: Number(it.quantity) || 1,
            customerName: it.customerName || it.rawAsset?.customerName || "",
          }),
        );

        setSelectedCustomer("");
        setSelectedItems(formattedItems);
        setSelectedCourier("");
        setCustomCourier("");
        setSelectedVendorId("");

        reset({
          ...DEFAULT_SEND_TO_VENDOR_VALUES,
          assetId: formattedItems[0]?.receivedMaterialId || "",
          items: formattedItems,
          numberOfPackages: "" as unknown as number,
          noOfPackages: "" as unknown as number,
          bookingDate: formatLocalDate(new Date()),
        });
      } else if (initialAsset) {
        const products = Array.isArray(initialAsset.products)
          ? initialAsset.products
          : [];
        const formattedItems: DispatchItem[] = products.map((p, idx) => ({
          receivedMaterialId: initialAsset.id,
          receivedItemId: p.id || `${initialAsset.id}_prod_${idx}`,
          trackId: formatRecordId("ASSET", initialAsset.seq),
          productId: p.id || `${initialAsset.id}_prod_${idx}`,
          productName: p.productType,
          serialNumber: p.serialNumber || "—",
          brandName: p.brandName || "",
          modelNumber: p.modelNumber || "",
          quantity: Number(p.quantity) || 1,
          customerName: initialAsset.customerName || "",
        }));

        setSelectedCustomer(initialAsset.customerName || "");
        setSelectedItems(formattedItems);
        setSelectedCourier("");
        setCustomCourier("");
        setSelectedVendorId("");

        reset({
          ...DEFAULT_SEND_TO_VENDOR_VALUES,
          assetId: initialAsset.id,
          items: formattedItems,
          numberOfPackages: "" as unknown as number,
          noOfPackages: "" as unknown as number,
          bookingDate: formatLocalDate(new Date()),
        });
      } else {
        setSelectedCustomer("");
        setSelectedItems([]);
        setSelectedCourier("");
        setCustomCourier("");
        setSelectedVendorId("");

        reset({
          ...DEFAULT_SEND_TO_VENDOR_VALUES,
          assetId: "",
          items: [],
          numberOfPackages: "" as unknown as number,
          noOfPackages: "" as unknown as number,
          bookingDate: formatLocalDate(new Date()),
        });
      }
    }
  }, [open, mode, initialData, initialAsset, initialDispatchItems, reset]);

  const handleVendorChange = (vendorId: string | null) => {
    const vId = vendorId || "";
    setSelectedVendorId(vId);
    const found = vendorsList.find((v) => v.id === vId);
    if (found) {
      setValue("vendorId", found.id, { shouldValidate: true });
      setValue("vendorName", found.vendorName, { shouldValidate: true });
      setValue("contactPerson", found.contactPerson, { shouldValidate: true });
      setValue("phoneNumber", found.phoneNumber, { shouldValidate: true });
      setValue("address", found.address, { shouldValidate: true });
    } else {
      setValue("vendorId", "", { shouldValidate: true });
      setValue("vendorName", "", { shouldValidate: true });
      setValue("contactPerson", "", { shouldValidate: true });
      setValue("phoneNumber", "", { shouldValidate: true });
      setValue("address", "", { shouldValidate: true });
    }
  };

  const handleCustomerSelect = (value: string | null) => {
    const custName = value || "";
    setSelectedCustomer(custName);
    // Auto-select all available items for this customer by default
    const matching = allAvailableItems.filter((item) => {
      const parentAsset = availableAssets.find(
        (a) => a.id === item.receivedMaterialId,
      );
      return (
        parentAsset?.customerName?.trim().toLowerCase() ===
        custName.trim().toLowerCase()
      );
    });

    setSelectedItems(matching);
    setValue("assetId", matching[0]?.receivedMaterialId || "", {
      shouldValidate: true,
    });
    setValue("items", matching, { shouldValidate: true });
  };

  const handleToggleProduct = (item: DispatchItem) => {
    const exists = selectedItems.some(
      (it) =>
        it.receivedMaterialId === item.receivedMaterialId &&
        it.receivedItemId === item.receivedItemId,
    );

    let nextItems: DispatchItem[];
    if (exists) {
      nextItems = selectedItems.filter(
        (it) =>
          !(
            it.receivedMaterialId === item.receivedMaterialId &&
            it.receivedItemId === item.receivedItemId
          ),
      );
    } else {
      nextItems = [...selectedItems, item];
    }

    setSelectedItems(nextItems);
    setValue("items", nextItems, { shouldValidate: true });
    setValue("assetId", nextItems[0]?.receivedMaterialId || "", {
      shouldValidate: true,
    });
  };

  const handleCourierSelect = (value: string | null) => {
    const val = value || "";
    setSelectedCourier(val);
    if (val === "Other") {
      const finalVal = customCourier.trim() || "Other";
      setValue("courierName", finalVal, { shouldValidate: true });
    } else {
      setCustomCourier("");
      setValue("courierName", val, { shouldValidate: true });
    }
  };

  const handleCustomCourierChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const val = e.target.value;
    setCustomCourier(val);
    setValue("courierName", val.trim() || "Other", { shouldValidate: true });
  };

  const onFormSubmit: SubmitHandler<SendToVendorFormValues> = async (
    values,
  ) => {
    if (isSubmitting) return;

    if (selectedItems.length === 0) {
      toast.error("Please select at least one product to dispatch.");
      return;
    }

    const rawPkg = values.noOfPackages ?? values.numberOfPackages;
    const parsedPackages =
      typeof rawPkg === "number"
        ? rawPkg
        : Number.parseInt(String(rawPkg), 10);

    if (
      rawPkg === undefined ||
      rawPkg === null ||
      (rawPkg as unknown) === "" ||
      Number.isNaN(parsedPackages) ||
      parsedPackages < 1
    ) {
      form.setError("numberOfPackages", {
        type: "manual",
        message: "No. of Packages is required and must be a positive whole number.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const finalCourier =
        selectedCourier === "Other"
          ? customCourier.trim() || "Other"
          : selectedCourier.trim();

      const success = await onSubmit({
        ...values,
        assetId: selectedItems[0]?.receivedMaterialId || values.assetId,
        items: selectedItems,
        courierName: finalCourier,
        numberOfPackages: parsedPackages,
        noOfPackages: parsedPackages,
      });

      if (success) {
        onClose();
      }
    } catch (error) {
      console.error("Form submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFromReceivedSelection =
    Boolean(initialDispatchItems && initialDispatchItems.length > 0) ||
    Boolean(initialAsset);

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => !val && !isSubmitting && onClose()}
    >
      <DialogContent
        showCloseButton={false}
        className="max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border bg-card shadow-2xl rounded-2xl w-full"
      >
        <form
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex flex-col h-full max-h-[90vh] overflow-hidden w-full"
        >
          {/* STICKY HEADER */}
          <div className="sticky top-0 z-20 shrink-0 border-b border-border bg-background px-5 py-3.5 sm:px-6 sm:py-4 shadow-2xs w-full">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Truck className="size-5 text-primary" />
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground truncate">
                  {mode === "create"
                    ? "Create Vendor Dispatch"
                    : "Edit Vendor Dispatch"}
                </DialogTitle>
              </div>

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
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 sm:px-6 sm:py-6 space-y-6 w-full max-w-full box-border">
            {/* Section 0: Selected Materials */}
            <div className="space-y-3 w-full min-w-0">
              <div className="border-b border-border/80 pb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                  <Package className="size-4 text-primary" />
                  Selected Materials ({selectedItems.length})
                </h3>
                <span className="text-xs text-muted-foreground font-medium">
                  {selectedItems.length} item
                  {selectedItems.length === 1 ? "" : "s"} included in dispatch
                </span>
              </div>

              {/* Table of selected materials */}
              {selectedItems.length > 0 ? (
                <div className="border border-border bg-card rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto max-w-full">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-muted/40 text-muted-foreground uppercase text-[11px] font-bold border-b border-border">
                        <tr>
                          <th className="px-3 py-2.5 font-semibold">
                            Track ID
                          </th>
                          <th className="px-3 py-2.5 font-semibold">
                            Customer
                          </th>
                          <th className="px-3 py-2.5 font-semibold">Product</th>
                          <th className="px-3 py-2.5 font-semibold">
                            Serial Number
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedItems.map((item, idx) => (
                          <tr
                            key={`${item.receivedMaterialId}_${item.receivedItemId || idx}`}
                            className="hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-3 py-2.5 font-mono font-bold text-primary whitespace-nowrap">
                              {item.trackId}
                            </td>
                            <td className="px-3 py-2.5 font-medium text-foreground truncate max-w-[150px]">
                              {item.customerName || "—"}
                            </td>
                            <td className="px-3 py-2.5 font-medium text-foreground truncate max-w-[160px]">
                              <div className="flex flex-col">
                                <span className="font-semibold text-foreground">
                                  {item.productName}
                                </span>
                                {(item.brandName || item.modelNumber) && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {[item.brandName, item.modelNumber]
                                      .filter(Boolean)
                                      .join(" ")}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-muted-foreground whitespace-nowrap">
                              {item.serialNumber || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1.5 w-full min-w-0">
                    <Label htmlFor="customer-name-field">
                      Select Customer to View Materials
                    </Label>
                    <Select
                      value={selectedCustomer}
                      onValueChange={handleCustomerSelect}
                    >
                      <SelectTrigger
                        id="customer-name-field"
                        className="h-10 w-full min-w-0 bg-background text-sm"
                      >
                        <SelectValue placeholder="Select Customer with Received Material..." />
                      </SelectTrigger>
                      <SelectContent>
                        {uniqueCustomers.length === 0 ? (
                          <SelectItem value="__none__" disabled>
                            No customers with available materials found
                          </SelectItem>
                        ) : (
                          uniqueCustomers.map((cust) => (
                            <SelectItem
                              key={cust.customerName}
                              value={cust.customerName}
                            >
                              {cust.customerName} ({cust.availableCount}{" "}
                              available)
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCustomer && (
                    <div className="space-y-2 pt-1">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Select Products to Dispatch from {selectedCustomer} (
                        {customerAvailableProducts.length} available)
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
                        {customerAvailableProducts.map((item) => {
                          const isChecked = selectedItems.some(
                            (it) =>
                              it.receivedMaterialId ===
                                item.receivedMaterialId &&
                              it.receivedItemId === item.receivedItemId,
                          );

                          const itemKey = `${item.receivedMaterialId}_${item.receivedItemId}`;

                          return (
                            <label
                              key={itemKey}
                              htmlFor={`vendor-item-${itemKey}`}
                              className={cn(
                                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all",
                                isChecked
                                  ? "border-primary bg-primary/5 shadow-2xs"
                                  : "border-border bg-card hover:bg-muted/50",
                              )}
                            >
                              <Checkbox
                                id={`vendor-item-${itemKey}`}
                                checked={isChecked}
                                onCheckedChange={() =>
                                  handleToggleProduct(item)
                                }
                                className="mt-0.5"
                              />
                              <div className="min-w-0 flex-1 text-xs">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-foreground truncate">
                                    {item.productName}
                                  </span>
                                  <span className="font-mono text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                                    {item.trackId}
                                  </span>
                                </div>
                                <p className="font-mono text-muted-foreground text-[11px] mt-0.5">
                                  SN: {item.serialNumber}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section 1: Vendor Details */}
            <div className="space-y-4 w-full min-w-0">
              <div className="border-b border-border/80 pb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Vendor Details
                </h3>
                <span className="text-xs text-muted-foreground font-medium">
                  Auto-populated from selected vendor
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0">
                {/* 1. Vendor Selection Dropdown */}
                <div className="space-y-1.5 md:col-span-2 w-full min-w-0">
                  <Label htmlFor="vendor-select">
                    Vendor <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedVendorId}
                    onValueChange={handleVendorChange}
                  >
                    <SelectTrigger
                      id="vendor-select"
                      className={cn(
                        "h-10 bg-background w-full min-w-0 text-sm",
                        errors.vendorName &&
                          "border-destructive ring-1 ring-destructive/30",
                      )}
                    >
                      <SelectValue
                        placeholder={
                          isLoadingVendors
                            ? "Loading vendors..."
                            : "Select Vendor..."
                        }
                      >
                        {(val: string | null) => {
                          if (!val || val === "__none__") return null;
                          const found = vendorsList.find((v) => v.id === val);
                          if (found) return found.vendorName;
                          const currentName = form.getValues("vendorName");
                          return currentName || null;
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {vendorsList.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          {isLoadingVendors
                            ? "Loading vendors..."
                            : "No vendors found. Please add vendors in the Vendors module."}
                        </SelectItem>
                      ) : (
                        vendorsList.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.vendorName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.vendorName && (
                    <p className="text-xs text-destructive">
                      {errors.vendorName.message}
                    </p>
                  )}
                </div>

                {/* 2. Contact Person (Auto-populated & Disabled) */}
                <div className="space-y-1.5 w-full min-w-0">
                  <Label htmlFor="contact-person">Contact Person</Label>
                  <Input
                    id="contact-person"
                    placeholder="Contact person auto-populated"
                    {...register("contactPerson")}
                    disabled
                    readOnly
                    className="h-9 bg-muted/60 font-medium text-foreground cursor-not-allowed w-full min-w-0"
                  />
                  {errors.contactPerson && (
                    <p className="text-xs text-destructive">
                      {errors.contactPerson.message}
                    </p>
                  )}
                </div>

                {/* 3. Phone Number (Auto-populated & Disabled) */}
                <div className="space-y-1.5 w-full min-w-0">
                  <Label htmlFor="phone-number">Phone Number</Label>
                  <Input
                    id="phone-number"
                    placeholder="Phone number auto-populated"
                    {...register("phoneNumber")}
                    disabled
                    readOnly
                    className="h-9 bg-muted/60 font-mono text-foreground cursor-not-allowed w-full min-w-0"
                  />
                  {errors.phoneNumber && (
                    <p className="text-xs text-destructive">
                      {errors.phoneNumber.message}
                    </p>
                  )}
                </div>

                {/* 4. Address (Auto-populated & Disabled) */}
                <div className="space-y-1.5 md:col-span-2 w-full min-w-0">
                  <Label htmlFor="vendor-address">Address</Label>
                  <Textarea
                    id="vendor-address"
                    rows={2}
                    placeholder="Vendor address auto-populated"
                    {...register("address")}
                    disabled
                    readOnly
                    className="bg-muted/60 text-foreground cursor-not-allowed resize-none min-h-[60px] w-full min-w-0"
                  />
                  {errors.address && (
                    <p className="text-xs text-destructive">
                      {errors.address.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Repair Details */}
            <div className="space-y-4 pt-2 w-full min-w-0">
              <div className="border-b border-border/80 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Repair Details
                </h3>
              </div>

              <div className="space-y-4 w-full min-w-0">
                {/* 5. Reason for Repair */}
                <div className="space-y-1.5 w-full min-w-0">
                  <Label htmlFor="reason-for-repair">
                    Reason for Repair{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reason-for-repair"
                    rows={2}
                    placeholder="Describe the issue, defect or repair requirements..."
                    {...register("reasonForRepair")}
                    className={cn(
                      "bg-background resize-y min-h-[60px] w-full min-w-0",
                      errors.reasonForRepair &&
                        "border-destructive ring-1 ring-destructive/30",
                    )}
                  />
                  {errors.reasonForRepair && (
                    <p className="text-xs text-destructive">
                      {errors.reasonForRepair.message}
                    </p>
                  )}
                </div>

                {/* 6. Remarks */}
                <div className="space-y-1.5 w-full min-w-0">
                  <Label htmlFor="repair-remarks">
                    Additional Notes / Remarks{" "}
                    <span className="text-muted-foreground text-xs">
                      (Optional)
                    </span>
                  </Label>
                  <Textarea
                    id="repair-remarks"
                    rows={2}
                    placeholder="Any special handling notes or technician instructions..."
                    {...register("remarks")}
                    className="bg-background resize-y min-h-[50px] w-full min-w-0"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Courier / Dispatch Details */}
            <div className="space-y-4 pt-2 w-full min-w-0">
              <div className="border-b border-border/80 pb-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Courier / Dispatch Details
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full min-w-0">
                {/* 7. Courier Name */}
                <div className="space-y-1.5 w-full min-w-0">
                  <Label htmlFor="courier-select">
                    Courier <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedCourier}
                    onValueChange={handleCourierSelect}
                  >
                    <SelectTrigger
                      id="courier-select"
                      className={cn(
                        "h-9 w-full min-w-0 max-w-full rounded-md border-border bg-background truncate",
                        errors.courierName &&
                          "border-destructive ring-1 ring-destructive/30",
                      )}
                    >
                      <SelectValue placeholder="Select courier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COURIER_OPTIONS.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.courierName && (
                    <p className="text-xs text-destructive">
                      {errors.courierName.message}
                    </p>
                  )}
                </div>

                {/* 7b. Custom Courier Name */}
                {selectedCourier === "Other" && (
                  <div className="space-y-1.5 w-full min-w-0">
                    <Label htmlFor="custom-courier-name">
                      Specify Courier Name{" "}
                      <span className="text-muted-foreground text-xs">
                        (Optional)
                      </span>
                    </Label>
                    <Input
                      id="custom-courier-name"
                      placeholder="Enter courier name..."
                      value={customCourier}
                      onChange={handleCustomCourierChange}
                      className="h-9 bg-background w-full min-w-0"
                    />
                  </div>
                )}

                {/* 8. Docket / AWB Number */}
                <div className="space-y-1.5 w-full min-w-0">
                  <Label htmlFor="docket-awb">
                    Docket Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="docket-awb"
                    placeholder="e.g. DTDC-12345678"
                    {...register("docketAwbNumber")}
                    className={cn(
                      "h-9 bg-background font-mono w-full min-w-0",
                      errors.docketAwbNumber &&
                        "border-destructive ring-1 ring-destructive/30",
                    )}
                  />
                  {errors.docketAwbNumber && (
                    <p className="text-xs text-destructive">
                      {errors.docketAwbNumber.message}
                    </p>
                  )}
                </div>

                {/* 9. Booking Date */}
                <div className="space-y-1.5 w-full min-w-0">
                  <Label htmlFor="booking-date">
                    Booking Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="booking-date"
                    type="date"
                    {...register("bookingDate")}
                    className={cn(
                      "h-9 bg-background w-full min-w-0",
                      errors.bookingDate &&
                        "border-destructive ring-1 ring-destructive/30",
                    )}
                  />
                  {errors.bookingDate && (
                    <p className="text-xs text-destructive">
                      {errors.bookingDate.message}
                    </p>
                  )}
                </div>

                {/* 10. No. of Packages */}
                <div className="space-y-1.5 w-full min-w-0">
                  <Label htmlFor="number-of-packages">
                    No. of Packages <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="number-of-packages"
                    name="noOfPackages"
                    type="text"
                    inputMode="numeric"
                    placeholder="Enter number of packages (e.g. 1)"
                    value={
                      numberOfPackagesValue === undefined ||
                      numberOfPackagesValue === null ||
                      (numberOfPackagesValue as unknown) === ""
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
                        if (val === "") {
                          setValue("numberOfPackages", "" as any, {
                            shouldValidate: true,
                          });
                          setValue("noOfPackages", "" as any, {
                            shouldValidate: true,
                          });
                        } else {
                          const num = Number.parseInt(val, 10);
                          setValue("numberOfPackages", num, {
                            shouldValidate: true,
                          });
                          setValue("noOfPackages", num, {
                            shouldValidate: true,
                          });
                        }
                      }
                    }}
                    className={cn(
                      "h-9 bg-background font-mono w-full min-w-0",
                      (errors.numberOfPackages || errors.noOfPackages) &&
                        "border-destructive ring-1 ring-destructive/30",
                    )}
                  />
                  {(errors.numberOfPackages || errors.noOfPackages) && (
                    <p className="text-xs text-destructive">
                      {errors.numberOfPackages?.message ||
                        errors.noOfPackages?.message}
                    </p>
                  )}
                </div>

                {/* 11. Dispatch Remarks */}
                <div className="space-y-1.5 md:col-span-2 w-full min-w-0">
                  <Label htmlFor="dispatch-remarks">
                    Dispatch Notes{" "}
                    <span className="text-muted-foreground text-xs">
                      (Optional)
                    </span>
                  </Label>
                  <Textarea
                    id="dispatch-remarks"
                    rows={2}
                    placeholder="Packing or shipping instructions..."
                    {...register("dispatchRemarks")}
                    className="bg-background resize-y min-h-[50px] w-full min-w-0"
                  />
                </div>
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
                disabled={isSubmitting || selectedItems.length === 0}
                className="h-9 px-4 text-xs sm:text-sm font-semibold gap-1.5 min-w-[120px] cursor-pointer shadow-xs"
              >
                {isSubmitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Truck className="size-3.5" />
                )}
                {mode === "create" ? "Create Dispatch" : "Save Changes"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
