"use client";

import { UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type CustomerModeSwitcherProps = {
  isNewCustomer: boolean;
  onModeChange: (mode: "existing" | "new") => void;
  className?: string;
};

/**
 * Compact, modern segmented mode switcher for toggling between
 * Existing Customer selection and New Customer entry in ticket creation forms.
 */
export function CustomerModeSwitcher({
  isNewCustomer,
  onModeChange,
  className,
}: CustomerModeSwitcherProps) {
  return (
    <div className={cn("sm:col-span-2 flex flex-col gap-1.5", className)}>
      <div
        role="group"
        aria-label="Customer Selection Mode"
        className="inline-flex w-fit items-center p-1 rounded-lg bg-slate-100/90 dark:bg-slate-900/50 border border-border/80 gap-1"
      >
        <button
          id="mode-switch-new-customer"
          type="button"
          aria-pressed={isNewCustomer}
          onClick={() => onModeChange("new")}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs transition-all cursor-pointer select-none",
            isNewCustomer
              ? "bg-blue-50 text-blue-700 border border-blue-200/90 font-semibold shadow-2xs dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
              : "bg-transparent text-muted-foreground border border-transparent hover:text-foreground hover:bg-card/70 font-medium",
          )}
        >
          <UserPlus className="size-3.5 shrink-0" />
          <span>New Customer</span>
        </button>

        <button
          id="mode-switch-existing-customer"
          type="button"
          aria-pressed={!isNewCustomer}
          onClick={() => onModeChange("existing")}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs transition-all cursor-pointer select-none",
            !isNewCustomer
              ? "bg-blue-50 text-blue-700 border border-blue-200/90 font-semibold shadow-2xs dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
              : "bg-transparent text-muted-foreground border border-transparent hover:text-foreground hover:bg-card/70 font-medium",
          )}
        >
          <Users className="size-3.5 shrink-0" />
          <span>Existing Customer</span>
        </button>
      </div>

      <p className="text-[11.5px] text-muted-foreground pl-0.5">
        {isNewCustomer
          ? "Enter customer details below"
          : "Search and select a customer"}
      </p>
    </div>
  );
}
