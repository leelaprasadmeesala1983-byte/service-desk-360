"use client";

import { Building2, Package, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type ReportTabKey = "customer" | "vendor" | "item";

type ReportTabsProps = {
  activeTab: ReportTabKey;
  onTabChange: (tab: ReportTabKey) => void;
};

export function ReportTabs({ activeTab, onTabChange }: ReportTabsProps) {
  const tabs = [
    {
      key: "customer" as ReportTabKey,
      label: "Customer Report",
      icon: Users,
    },
    {
      key: "vendor" as ReportTabKey,
      label: "Vendor Report",
      icon: Building2,
    },
    {
      key: "item" as ReportTabKey,
      label: "Item Report",
      icon: Package,
    },
  ];

  return (
    <div className="flex border-b border-border bg-card/50 overflow-x-auto no-scrollbar">
      <div className="flex min-w-full sm:min-w-0 px-2 sm:px-4 gap-1 sm:gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "flex items-center gap-2 py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap outline-none",
                isActive
                  ? "border-primary text-primary bg-primary/5 rounded-t-lg"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-t-lg",
              )}
            >
              <Icon
                className={cn(
                  "size-4",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
