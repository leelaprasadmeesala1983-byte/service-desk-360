"use client";

import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
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
  placeholder = "Select Customer",
  disabled,
  hasError,
  className,
  id,
}: CustomerSelectFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isPending, startTransition] = useTransition();

  // Load customers when popover opens or search changes with race condition prevention
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
      } catch (err) {
        if (active) {
          console.error("Failed to search customers:", err);
        }
      }
    });

    return () => {
      active = false;
    };
  }, [open, search]);

  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers;
    const term = search.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.customerName.toLowerCase().includes(term) ||
        c.mobileNumber.toLowerCase().includes(term) ||
        (c.email && c.email.toLowerCase().includes(term)),
    );
  }, [customers, search]);

  const handleSelect = (customer: CustomerOption) => {
    // Single select: display only the customer's clean name and immediately close dropdown
    onChange(customer.customerName);
    onCustomerSelect?.(customer);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
    onClear?.();
  };

  return (
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
              aria-label="Clear customer selection"
              title="Clear customer"
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
        className="w-[var(--anchor-width)] min-w-[280px] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg gap-1"
      >
        {/* Search bar inside dropdown - matches Assign Technician */}
        <div className="relative px-1 pt-0.5 pb-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer..."
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

        <div className="h-px bg-border my-0.5" />

        {/* Single-select List of Customers - displays ONLY the customer name */}
        <div className="max-h-56 overflow-y-auto space-y-0.5 px-0.5">
          {isPending && customers.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              <span>Loading customers...</span>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-4 text-center text-xs text-muted-foreground">
              {search ? "No customers match your search" : "No customers found"}
            </div>
          ) : (
            filteredCustomers.map((c) => {
              const isSelected =
                (selectedCustomerId && c.id === selectedCustomerId) ||
                (!selectedCustomerId &&
                  value?.trim().toLowerCase() ===
                    c.customerName.trim().toLowerCase());

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors text-left outline-none",
                    isSelected
                      ? "bg-accent/70 text-accent-foreground font-semibold"
                      : "hover:bg-accent hover:text-accent-foreground text-foreground",
                  )}
                >
                  <span className="truncate">{c.customerName}</span>
                  {isSelected && (
                    <Check className="text-primary size-3.5 shrink-0 ml-2" />
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
