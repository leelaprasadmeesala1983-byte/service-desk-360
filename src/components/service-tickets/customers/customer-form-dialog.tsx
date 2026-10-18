"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Field } from "@/components/service-tickets/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Textarea } from "@/components/ui/textarea";
import type { CustomerRow } from "@/db/queries/customers";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";
import {
  type AddCustomerValues,
  addCustomerSchema,
  editCustomerSchema,
} from "@/lib/validations/customer";

type CustomerFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerRow;
  initialSearch?: string;
  onSuccess?: (customer: CustomerRow) => void;
};

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  initialSearch,
  onSuccess,
}: CustomerFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(customer);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  const schema = isEdit ? editCustomerSchema : addCustomerSchema;

  const form = useForm<AddCustomerValues & { id?: string }>({
    // biome-ignore lint/suspicious/noExplicitAny: resolver handles both schemas
    resolver: zodResolver(schema as any),
    mode: "onChange",
    defaultValues: customer
      ? {
          id: customer.id,
          customerName: customer.customerName,
          mobileNumber: customer.mobileNumber,
          email: customer.email ?? "",
          address: customer.address,
        }
      : {
          customerName: "",
          mobileNumber: "",
          email: "",
          address: "",
        },
  });

  useEffect(() => {
    if (open) {
      setFormError(null);
      if (customer) {
        form.reset({
          id: customer.id,
          customerName: customer.customerName,
          mobileNumber: customer.mobileNumber,
          email: customer.email ?? "",
          address: customer.address,
        });
      } else {
        const rawSearch = initialSearch?.trim() || "";
        const digitsOnly = rawSearch.replace(/\D/g, "");
        const isNumeric = digitsOnly.length >= 7 || /^\d+$/.test(rawSearch);
        form.reset({
          customerName: isNumeric ? "" : rawSearch,
          mobileNumber: isNumeric ? digitsOnly.slice(0, 10) : "",
          email: "",
          address: "",
        });
      }
    }
  }, [open, customer, initialSearch, form]);

  const handleOpenChange = (
    newOpen: boolean,
    eventDetails?: { reason?: string },
  ) => {
    if (isPending && !newOpen) return;
    if (!newOpen && eventDetails?.reason === "focusOut") {
      return;
    }
    onOpenChange(newOpen);
    if (!newOpen) {
      setFormError(null);
      form.reset();
    }
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setFormError(null);

    void form.handleSubmit(
      (data) => {
        setFormError(null);

        startTransition(async () => {
          try {
            const result = isEdit
              ? await updateCustomer({
                  id: customer!.id,
                  customerName: data.customerName,
                  mobileNumber: data.mobileNumber,
                  email: data.email,
                  address: data.address,
                })
              : await createCustomer(data);

            if (!result.ok) {
              setFormError(
                result.error || "Please correct the highlighted fields.",
              );
              if (result.fieldErrors) {
                for (const [key, messages] of Object.entries(
                  result.fieldErrors,
                )) {
                  if (messages?.[0]) {
                    // biome-ignore lint/suspicious/noExplicitAny: dynamic key
                    form.setError(key as any, {
                      type: "server",
                      message: messages[0],
                    });
                  }
                }
              }
              return;
            }

            toast.success(
              isEdit
                ? "Customer updated successfully"
                : "Customer created successfully",
            );
            handleOpenChange(false);
            if (result.data) {
              onSuccess?.(result.data);
            }
            router.refresh();
          } catch (error) {
            console.error("Customer submit failed:", error);
            setFormError("Something went wrong while saving the customer.");
          }
        });
      },
      () => {
        // Validation errors updated reactively in form.formState.errors
      },
    )(event);
  };

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 z-[60]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Customer" : "Add New Customer"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the customer's contact and address details."
              : "Enter customer information. Name, mobile number, and address are mandatory. Email is optional."}
          </DialogDescription>
        </DialogHeader>

        {formError && (
          <div className="bg-destructive/10 text-destructive border-destructive/20 rounded-md border p-3 text-xs font-medium">
            {formError}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <Field
            label="Customer Name"
            required
            error={errors.customerName?.message}
          >
            <Input
              id="customer-form-name"
              placeholder="e.g. John Doe / Tech Corp"
              className="h-10 rounded-md"
              {...form.register("customerName")}
            />
          </Field>

          <Field
            label="Mobile Number"
            required
            error={errors.mobileNumber?.message}
            hint="10-digit mobile number"
          >
            <PhoneInput
              id="customer-form-mobile"
              placeholder="9876543210"
              className="h-10 rounded-md"
              {...form.register("mobileNumber")}
            />
          </Field>

          <Field label="Email Address" error={errors.email?.message}>
            <Input
              id="customer-form-email"
              type="email"
              placeholder="customer@example.com (optional)"
              className="h-10 rounded-md"
              {...form.register("email")}
            />
          </Field>

          <Field label="Address" required error={errors.address?.message}>
            <Textarea
              id="customer-form-address"
              rows={3}
              placeholder="Complete street address, city, and pincode"
              className="resize-none rounded-md"
              {...form.register("address")}
            />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              id="btn-customer-cancel"
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button id="btn-customer-submit" type="submit" disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Customer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
