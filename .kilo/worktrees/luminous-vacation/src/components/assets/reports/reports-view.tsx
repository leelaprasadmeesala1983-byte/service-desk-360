"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { CustomerReportView } from "./customer-report-view";
import { ItemReportView } from "./item-report-view";
import { type ReportTabKey, ReportTabs } from "./report-tabs";
import { VendorReportView } from "./vendor-report-view";

type ReportsViewProps = {
  initialTab?: ReportTabKey;
};

export function ReportsView({ initialTab = "customer" }: ReportsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabParam = searchParams.get("tab") as ReportTabKey | null;
  const validTab: ReportTabKey =
    tabParam === "customer" || tabParam === "vendor" || tabParam === "item"
      ? tabParam
      : initialTab;

  const [activeTab, setActiveTab] = useState<ReportTabKey>(validTab);

  const handleTabChange = (newTab: ReportTabKey) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* 1. Report Tabs Navigation */}
      <ReportTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* 2. Active Tab Content with State Preservation */}
      <div className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
        <div className={activeTab === "customer" ? "block" : "hidden"}>
          <CustomerReportView />
        </div>

        <div className={activeTab === "vendor" ? "block" : "hidden"}>
          <VendorReportView />
        </div>

        <div className={activeTab === "item" ? "block" : "hidden"}>
          <ItemReportView />
        </div>
      </div>
    </div>
  );
}
