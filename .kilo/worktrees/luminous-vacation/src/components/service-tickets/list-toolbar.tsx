"use client";

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { RecordStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

type StatusFilter = RecordStatus | "ALL";

type Tab = { value: StatusFilter; label: string; count: number };

type ListToolbarProps = {
  tabs: Tab[];
  active: StatusFilter;
  onActiveChange: (value: StatusFilter) => void;
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
};

function ListToolbar({
  tabs,
  active,
  onActiveChange,
  search,
  onSearchChange,
  searchPlaceholder,
}: ListToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onActiveChange(tab.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active === tab.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 text-[10px] font-semibold",
                active === tab.value ? "bg-primary-foreground/20" : "bg-muted",
              )}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="relative w-full lg:max-w-xs">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 rounded-md pl-8 pr-8"
        />
        {search.length > 0 && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-0.5 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            aria-label="Clear search"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

export type { StatusFilter, Tab };
export { ListToolbar };
