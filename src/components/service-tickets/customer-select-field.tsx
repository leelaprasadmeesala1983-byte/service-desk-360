"use client";

import { Check, ChevronDown, Loader2, Search, UserPlus, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  id?: string;
  value: string;
  selectedCustomerId?: string | null;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  hasError?: boolean;
  size?: "default" | "sm";
  autoSelectIfSingle?: boolean;
  parentOpen?: boolean;
  onChange: (value: string) => void;
  onCustomerSelect?: (customer: CustomerOption) => void;
  onAddNewCustomer?: (initialSearch?: string) => void;
  onNoCustomers?: () => void;
  onClear?: () => void;
};

export function CustomerSelectField({
  value,
  onChange,
  onCustomerSelect,
  onClear,
  selectedCustomerId,
  size = "default",
  placeholder = "Enter or select mobile number",
  disabled,
  hasError,
  className,
  id,
  autoSelectIfSingle = true,
  parentOpen = true,
  onAddNewCustomer,
  onNoCustomers,
}: CustomerSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Load customer records when parent opens/mounts for single-record auto-population
  // or zero-record inline switch.
  useEffect(() => {
    if (parentOpen === false) return;

    let active = true;
    startTransition(async () => {
      try {
        setError(null);
        const result = await searchCustomersDropdown("");
        if (!active) return;

        if (result.ok) {
          setCustomers(result.data);
          // If no customer has been selected yet, apply automatic selection rules
          if (!value && !selectedCustomerId && autoSelectIfSingle) {
            if (result.data.length === 1) {
              const single = result.data[0];
              onChange(single.mobileNumber);
              onCustomerSelect?.(single);
            } else if (result.data.length === 0) {
              onNoCustomers?.();
            }
          }
        } else {
          setError(result.error || "Failed to load customers.");
        }
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof (err as { digest?: unknown }).digest === "string" &&
          ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
            (err as { digest: string }).digest.includes("NEXT_REDIRECT"))
        ) {
          throw err;
        }
        if (active) {
          console.error("Failed to load customers:", err);
          setError("Failed to load customers. Please try again.");
        }
      }
    });

    return () => {
      active = false;
    };
  }, [
    parentOpen,
    autoSelectIfSingle,
    onChange,
    onCustomerSelect,
    onNoCustomers,
    selectedCustomerId,
    value,
  ]);

  // When popover search query changes, perform search
  useEffect(() => {
    if (!open) {
      setSearch("");
      return;
    }

    let active = true;
    startTransition(async () => {
      try {
        const result = await searchCustomersDropdown(search);
        if (active && result.ok) {
          setCustomers(result.data);
        }
      } catch (err: unknown) {
        if (
          err &&
          typeof err === "object" &&
          "digest" in err &&
          typeof (err as { digest?: unknown }).digest === "string" &&
          ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
            (err as { digest: string }).digest.includes("NEXT_REDIRECT"))
        ) {
          throw err;
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
    onChange(customer.mobileNumber);
    onCustomerSelect?.(customer);
    setOpen(false);
  };

  const handleOpenAddCustomer = (e?: React.MouseEvent | React.PointerEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    const currentSearch = search.trim();
    setOpen(false);
    onAddNewCustomer?.(currentSearch);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
    onClear?.();
  };

  const handleDirectInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    onChange(digits);

    if (digits.length === 10) {
      const matched = customers.find((c) => c.mobileNumber.trim() === digits);
      if (matched) {
        onCustomerSelect?.(matched);
      }
    }
  };

  const handleArrowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setOpen((prev) => !prev);
    }
  };

  const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (!open && !disabled) {
      setOpen(true);
    }
  };

  const handleInputFocus = () => {
    if (!open && !disabled) {
      setOpen(true);
    }
  };

  const handleContainerClick = () => {
    if (!open && !disabled) {
      setOpen(true);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<div />}
        nativeButton={false}
        disabled={disabled}
        onClick={handleContainerClick}
        className={cn(
          "relative flex items-center w-full cursor-pointer",
          className,
        )}
      >
        <Input
          id={id}
          type="tel"
          maxLength={10}
          value={value}
          onClick={handleInputClick}
          onFocus={handleInputFocus}
          onChange={handleDirectInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pr-16 text-foreground font-normal rounded-md cursor-pointer",
            size === "sm" ? "h-9 text-xs" : "h-10 text-sm",
            hasError && "border-destructive",
          )}
        />
        <div className="absolute right-1 flex items-center gap-0.5">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded-full cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear mobile number"
              title="Clear mobile number"
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={handleArrowClick}
            className="p-1 hover:bg-muted rounded-md cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle customer list"
            title="Select from existing customers"
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          </button>
        </div>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        className="w-[var(--anchor-width)] min-w-[280px] sm:min-w-[320px] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg gap-1 z-50"
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

        {/* Single-select List of Customers */}
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
  );
}
