"use client";

import { Check, ChevronDown, Loader2, Search, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { CustomerFormDialog } from "@/components/service-tickets/customers/customer-form-dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CustomerRow } from "@/db/queries/customers";
import { searchCustomersDropdown } from "@/lib/actions/customers";
import { cn } from "@/lib/utils";

export type CustomerOption = {
  id: string;
  customerName: string;
  mobileNumber: string;
  email: string | null;
  address: string;
};

type CustomerSelectFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onCustomerSelect?: (customer: CustomerOption) => void;
  onClear?: () => void;
  selectedCustomerId?: string | null;
  size?: "default" | "sm";
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  className?: string;
  id?: string;
};

export function CustomerSelectField({
  value,
  onChange,
  onCustomerSelect,
  onClear,
  selectedCustomerId,
  size = "default",
  placeholder = "Select Mobile Number",
  disabled,
  hasError,
  className,
  id,
}: CustomerSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);

  // Load customers when popover opens or search changes with race condition prevention
  useEffect(() => {
    if (!open) {
      setSearch("");
      setError(null);
      return;
    }

    let active = true;
    startTransition(async () => {
      try {
        setError(null);
        const result = await searchCustomersDropdown(search);
        if (active) {
          if (result.ok) {
            setCustomers(result.data);
          } else {
            setError(result.error || "Failed to load customers.");
          }
        }
      } catch (err) {
        if (active) {
          console.error("Failed to search customers:", err);
          setError("Failed to load customers. Please try again.");
        }
      }
    });

    return () => {
      active = false;
    };
  }, [open, search]);

  const filteredCustomers = useMemo(() => {
    // Exclude records with missing or empty mobile numbers
    const valid = customers.filter(
      (c) =>
        typeof c.mobileNumber === "string" && c.mobileNumber.trim().length > 0,
    );

    // Filter dynamically by search term matching mobile number or customer name
    const term = search.trim().toLowerCase();
    const matched = term
      ? valid.filter(
          (c) =>
            c.mobileNumber.toLowerCase().includes(term) ||
            (c.customerName && c.customerName.toLowerCase().includes(term)),
        )
      : valid;

    // Handle duplicate mobile numbers appropriately by deduplicating
    const seen = new Set<string>();
    const deduplicated: CustomerOption[] = [];
    for (const c of matched) {
      const num = c.mobileNumber.trim();
      if (!seen.has(num)) {
        seen.add(num);
        deduplicated.push(c);
      }
    }

    return deduplicated;
  }, [customers, search]);

  const handleSelect = (customer: CustomerOption) => {
    // Single select: display mobile number and immediately close dropdown
    onChange(customer.mobileNumber);
    onCustomerSelect?.(customer);
    setOpen(false);
  };

  const handleOpenAddCustomer = (e?: React.MouseEvent | React.PointerEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setOpen(false);
    setTimeout(() => {
      setIsAddCustomerOpen(true);
    }, 50);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
    onClear?.();
  };

  const handleCustomerCreated = (newCustomer: CustomerRow) => {
    const customerOption: CustomerOption = {
      id: newCustomer.id,
      customerName: newCustomer.customerName,
      mobileNumber: newCustomer.mobileNumber,
      email: newCustomer.email ?? null,
      address: newCustomer.address,
    };

    setCustomers((prev) => {
      const remaining = prev.filter(
        (c) =>
          c.id !== customerOption.id &&
          c.mobileNumber.trim() !== customerOption.mobileNumber.trim(),
      );
      return [customerOption, ...remaining];
    });

    onChange(customerOption.mobileNumber);
    onCustomerSelect?.(customerOption);
    setIsAddCustomerOpen(false);
    setSearch("");
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<div />}
          nativeButton={false}
          disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={placeholder}
          id={id}
          className={cn(
            "border-border bg-transparent hover:bg-muted/10 focus-visible:border-ring focus-visible:ring-ring/50 flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border text-left transition-colors focus-visible:ring-1 outline-none select-none",
            size === "sm"
              ? "min-h-9 h-9 text-xs px-2.5 py-1"
              : "min-h-10 text-sm px-3 py-1.5",
            hasError && "border-destructive",
            disabled && "cursor-not-allowed opacity-50 pointer-events-none",
            className,
          )}
        >
          <div className="flex flex-1 items-center min-w-0">
            {value ? (
              <span className="truncate text-foreground font-normal">
                {value}
              </span>
            ) : (
              <span className="text-muted-foreground select-none">
                {placeholder}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors cursor-pointer"
                aria-label="Clear mobile number selection"
                title="Clear mobile number"
              >
                <X className="size-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
            <ChevronDown
              className={cn(
                "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </div>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={4}
          className="w-[var(--anchor-width)] min-w-[280px] sm:min-w-[320px] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg gap-1"
        >
          {/* Search bar inside dropdown */}
          <div className="relative px-1 pt-0.5 pb-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer name or mobile..."
              className="h-8 rounded-md pl-8 pr-7 text-xs"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              autoFocus
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch("");
                }}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-0.5 transition-colors cursor-pointer"
                aria-label="Clear customer search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Add New Customer Option */}
          <div className="px-1 py-0.5">
            <button
              id="btn-add-new-customer"
              type="button"
              onClick={handleOpenAddCustomer}
              className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-primary/40 bg-primary/5 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 transition-colors"
            >
              <UserPlus className="size-3.5" />
              <span>Add New Customer</span>
            </button>
          </div>

          <div className="h-px bg-border my-0.5" />

          {/* Single-select List of Customers - displays Customer Name & Mobile */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 px-0.5">
            {error ? (
              <div className="py-4 text-center text-xs text-destructive">
                {error}
              </div>
            ) : isPending && customers.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Loading customers...</span>
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground space-y-2">
                <div>
                  No customers found
                  {search.trim() ? ` matching "${search.trim()}"` : ""}
                </div>
                <button
                  id="btn-create-searched-customer"
                  type="button"
                  onClick={handleOpenAddCustomer}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <UserPlus className="size-3" />
                  <span>Create "{search.trim() || "New Customer"}"</span>
                </button>
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected =
                  (selectedCustomerId && c.id === selectedCustomerId) ||
                  (!selectedCustomerId &&
                    value?.trim() === c.mobileNumber.trim());

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelect(c)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors text-left outline-none gap-2",
                      isSelected
                        ? "bg-accent/70 text-accent-foreground font-semibold"
                        : "hover:bg-accent hover:text-accent-foreground text-foreground",
                    )}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate font-medium text-foreground">
                        {c.customerName || "Customer"}
                      </span>
                      <span className="truncate text-muted-foreground text-[11px] font-normal">
                        {c.mobileNumber}
                      </span>
                    </div>
                    {isSelected && (
                      <Check className="text-primary size-3.5 shrink-0 ml-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      <CustomerFormDialog
        open={isAddCustomerOpen}
        onOpenChange={setIsAddCustomerOpen}
        initialSearch={search}
        onSuccess={handleCustomerCreated}
      />
    </>
  );
}
