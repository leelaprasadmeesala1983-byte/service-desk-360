"use client";

import { Boxes, Inbox, LayoutDashboard, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export type AssetTabKey = "dashboard" | "received" | "send-to-vendor";

type AssetsTabsProps = {
  activeTab: AssetTabKey;
  onTabChange: (tab: AssetTabKey) => void;
  receivedCount?: number;
  sendToVendorCount?: number;
  totalCount?: number;
};

export function AssetsTabs({
  activeTab,
  onTabChange,
  receivedCount,
  sendToVendorCount,
}: AssetsTabsProps) {
  const tabs = [
    {
      key: "dashboard" as AssetTabKey,
      label: "Dashboard",
      icon: LayoutDashboard,
      count: undefined,
    },
    {
      key: "received" as AssetTabKey,
      label: "Received Material",
      icon: Inbox,
      count: receivedCount,
    },
    {
      key: "send-to-vendor" as AssetTabKey,
      label: "Send to Vendor",
      icon: Truck,
      count: sendToVendorCount,
    },
  ];

  return (
    <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={cn(
                "group relative flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-150 cursor-pointer select-none",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-transform group-hover:scale-105",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
              <span>{tab.label}</span>
              {typeof tab.count === "number" && (
                <span
                  className={cn(
                    "ml-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-muted-foreground group-hover:bg-muted-foreground/10 group-hover:text-foreground",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
