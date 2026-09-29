"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import {
  type Control,
  type FieldPath,
  type FieldValues,
  useController,
} from "react-hook-form";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

/** Label + control + inline error, matching the profile panel's field layout. */
function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {hint && !error && (
        <p className="text-muted-foreground text-xs">{hint}</p>
      )}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}

type Option = { value: string; label: string };

type ControlledSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  className?: string;
  error?: string;
};

/** A react-hook-form-bound Select built on the base-ui primitive. */
function ControlledSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder = "Select…",
  required,
  disabled,
  hint,
  className,
  error,
}: ControlledSelectProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));

  return (
    <Field
      label={label}
      required={required}
      error={error ?? fieldState.error?.message}
      hint={hint}
      className={className}
    >
      <Select
        items={items}
        value={(field.value as string | null) ?? null}
        onValueChange={(value) => field.onChange(value)}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            "h-9 w-full rounded-md border-border bg-transparent",
            fieldState.error && "border-destructive",
          )}
          onBlur={field.onBlur}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

type ControlledMultiSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  className?: string;
  error?: string;
};

/** A multi-select component bound to react-hook-form supporting multiple values with chips and checkboxes. */
function ControlledMultiSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder = "Select Technician",
  required,
  disabled,
  hint,
  className,
  error,
}: ControlledMultiSelectProps<T>) {
  const { field, fieldState } = useController({ control, name });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const rawValues: unknown = field.value;
  const selectedValues: string[] = Array.isArray(rawValues)
    ? (rawValues as string[])
    : typeof rawValues === "string" && rawValues.trim()
      ? [rawValues.trim()]
      : [];

  const optionMap = useMemo(
    () => new Map(options.map((o) => [o.value, o.label])),
    [options],
  );

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const visibleSelectedValues = useMemo(
    () => selectedValues.filter((val) => optionMap.has(val)),
    [selectedValues, optionMap],
  );

  const toggleOption = (val: string) => {
    const isSelected = selectedValues.includes(val);
    const nextValues = isSelected
      ? selectedValues.filter((v) => v !== val)
      : [...selectedValues, val];
    field.onChange(nextValues);
  };

  const removeItem = (val: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const nextValues = selectedValues.filter((v) => v !== val);
    field.onChange(nextValues);
  };

  return (
    <Field
      label={label}
      required={required}
      error={error ?? fieldState.error?.message}
      hint={hint}
      className={className}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={<div />}
          nativeButton={false}
          disabled={disabled}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={label}
          className={cn(
            "border-border bg-transparent hover:bg-muted/10 focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-10 w-full cursor-pointer items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-left text-sm transition-colors focus-visible:ring-1 outline-none",
            (error || fieldState.error) && "border-destructive",
            disabled && "cursor-not-allowed opacity-50 pointer-events-none",
          )}
        >
          <div className="flex max-h-24 flex-1 flex-wrap items-center gap-1.5 overflow-y-auto py-0.5">
            {visibleSelectedValues.length === 0 ? (
              <span className="text-muted-foreground select-none">
                {placeholder}
              </span>
            ) : (
              visibleSelectedValues.map((val) => {
                const labelText = optionMap.get(val) || val;
                return (
                  <Badge
                    key={val}
                    variant="secondary"
                    className="gap-1 rounded-md px-1.5 py-0.5 text-xs font-normal"
                  >
                    <span className="max-w-[140px] truncate">{labelText}</span>
                    <button
                      type="button"
                      onClick={(e) => removeItem(val, e)}
                      className="hover:bg-muted-foreground/20 rounded-full p-0.5 transition-colors cursor-pointer"
                      aria-label={`Remove ${labelText}`}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                );
              })
            )}
          </div>
          <ChevronDown
            className={cn(
              "text-muted-foreground size-4 shrink-0 transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </PopoverTrigger>

        <PopoverContent
          align="start"
          side="bottom"
          sideOffset={4}
          className="w-[var(--anchor-width)] min-w-[280px] max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg gap-1"
        >
          <div className="relative px-1 pt-0.5 pb-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search technician..."
              className="h-8 rounded-md pl-8 pr-7 text-xs"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearch("");
                }}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-0.5 transition-colors cursor-pointer"
                aria-label="Clear technician search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="h-px bg-border my-0.5" />

          <div className="max-h-56 overflow-y-auto space-y-0.5 px-0.5">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-xs text-muted-foreground">
                No technicians found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isChecked = selectedValues.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors text-left outline-none",
                      isChecked
                        ? "bg-accent/70 text-accent-foreground font-semibold"
                        : "hover:bg-accent hover:text-accent-foreground text-foreground",
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "flex size-4 shrink-0 items-center justify-center rounded-sm border transition-colors",
                          isChecked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background",
                        )}
                      >
                        {isChecked && <Check className="size-3 stroke-[2.5]" />}
                      </div>
                      <span className="truncate">{option.label}</span>
                    </div>
                    {isChecked && (
                      <Check className="text-primary size-3.5 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </Field>
  );
}

export type { Option };
export { Field, ControlledSelect, ControlledMultiSelect };
