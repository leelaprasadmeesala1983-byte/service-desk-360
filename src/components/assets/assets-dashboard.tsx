"use client";

import {
  ArrowRight,
  BarChart3,
  Building2,
  History,
  Inbox,
  Package,
  Truck,
  UserCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatCard } from "@/components/service-tickets/stat-card";
import { formatDate, formatRelativeTime } from "@/lib/format";
import { AssetsApiService } from "@/lib/services/assets-api";
import { cn } from "@/lib/utils";
import type { AssetDashboardSummary } from "@/types/asset-dashboard";
import type { AssetStats } from "@/types/assets";

import { AssetFormDialog } from "./asset-form-dialog";

const MODULE_NAV_LINKS = [
  {
    label: "Received Material",
    href: "/asset-management/received-material",
    icon: Inbox,
  },
  {
    label: "Send to Vendor",
    href: "/asset-management/send-to-vendor",
    icon: Truck,
  },
  {
    label: "Repair Status",
    href: "/asset-management/repair-status",
    icon: Wrench,
  },
  {
    label: "Vendor Received",
    href: "/asset-management/vendor-received",
    icon: Package,
  },
  {
    label: "Customer Return",
    href: "/asset-management/customer-return",
    icon: UserCheck,
  },
  {
    label: "Vendors",
    href: "/asset-management/vendors",
    icon: Building2,
  },
  {
    label: "Reports",
    href: "/asset-management/reports",
    icon: BarChart3,
  },
] as const;

type AssetsDashboardProps = {
  stats?: AssetStats;
  sendToVendorCount?: number;
  onCreateAsset?: () => void;
};

export function AssetsDashboard({
  stats,
  sendToVendorCount = 0,
  onCreateAsset: _onCreateAsset,
}: AssetsDashboardProps) {
  const router = useRouter();
  const [dashboardData, setDashboardData] =
    useState<AssetDashboardSummary | null>(null);
  const [_isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    AssetsApiService.getDashboardData()
      .then((data) => {
        if (mounted) setDashboardData(data);
      })
      .catch((err) => console.error("Error loading asset dashboard:", err))
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const kpis = dashboardData?.kpis || {
    totalMaterials: stats?.total || 0,
    receivedMaterials: stats?.received || 0,
    underRepair: stats?.underRepair || 0,
    sentToVendor: sendToVendorCount || stats?.sentToVendor || 0,
    receivedFromVendor: stats?.receivedFromVendor || 0,
    customerReturned: stats?.customerReturned || 0,
    activeRepairMaterials:
      stats?.activeRepairMaterials || stats?.underRepair || 0,
    readyForCustomerDispatch: stats?.readyForCustomerDispatch || 0,
    dispatchedToCustomer: stats?.dispatchedToCustomer || 0,
    delivered: stats?.delivered || 0,
    closed: stats?.closed || 0,
  };

  const moduleCounts = dashboardData?.moduleCounts || {
    receivedMaterial: kpis.receivedMaterials || kpis.totalMaterials,
    sendToVendor: kpis.sentToVendor,
    repairStatus: kpis.underRepair,
    vendorReceived: kpis.receivedFromVendor,
    customerReturn: kpis.customerReturned,
    vendors: 0,
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Header & Horizontal Module Navigation (NO COUNTS HERE) */}
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-2xs space-y-3">
        <h2 className="text-lg font-bold text-foreground">
          Asset Management Overview
        </h2>

        {/* Module Navigation Links — Clean links without counts */}
        <nav
          aria-label="Asset Management Modules"
          className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 border-t border-border/60"
        >
          {MODULE_NAV_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-foreground/85 hover:text-primary hover:bg-primary/10 border border-border/80 hover:border-primary/30 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <Icon className="size-3.5 text-primary shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 2. Dynamic Count Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {/* Received Material */}
        <button
          type="button"
          onClick={() => router.push("/asset-management/received-material")}
          className="text-left cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <StatCard
            label="Received Material"
            value={moduleCounts.receivedMaterial}
            icon={Inbox}
            tone="info"
            hint="Customer receipts"
          />
        </button>

        {/* Send to Vendor */}
        <button
          type="button"
          onClick={() => router.push("/asset-management/send-to-vendor")}
          className="text-left cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <StatCard
            label="Send to Vendor"
            value={moduleCounts.sendToVendor}
            icon={Truck}
            tone="progress"
            hint="Vendor dispatches"
          />
        </button>

        {/* Repair Status */}
        <button
          type="button"
          onClick={() => router.push("/asset-management/repair-status")}
          className="text-left cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <StatCard
            label="Repair Status"
            value={moduleCounts.repairStatus}
            icon={Wrench}
            tone="progress"
            hint="Under vendor repair"
          />
        </button>

        {/* Vendor Received */}
        <button
          type="button"
          onClick={() => router.push("/asset-management/vendor-received")}
          className="text-left cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <StatCard
            label="Vendor Received"
            value={moduleCounts.vendorReceived}
            icon={Package}
            tone="purple"
            hint="Received from vendor"
          />
        </button>

        {/* Customer Return */}
        <button
          type="button"
          onClick={() => router.push("/asset-management/customer-return")}
          className="text-left cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <StatCard
            label="Customer Return"
            value={moduleCounts.customerReturn}
            icon={UserCheck}
            tone="closed"
            hint="Customer returns"
          />
        </button>

        {/* Vendors */}
        <button
          type="button"
          onClick={() => router.push("/asset-management/vendors")}
          className="text-left cursor-pointer transition-transform hover:-translate-y-0.5"
        >
          <StatCard
            label="Vendors"
            value={moduleCounts.vendors}
            icon={Building2}
            tone="default"
            hint="Registered vendors"
          />
        </button>
      </div>

      {/* Mid Section: Vendor Breakdown & Repair Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Send to Vendor */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building2 className="size-4 text-primary" />
              Send to Vendor
            </h3>
            <span className="text-xs text-muted-foreground">
              Active repairs
            </span>
          </div>

          {(() => {
            const activeVendors = (
              dashboardData?.materialsByVendor || []
            ).filter((v) => v.totalCount > 0);

            if (activeVendors.length > 0) {
              return (
                <div className="space-y-2.5">
                  {activeVendors.map((v) => (
                    <div
                      key={v.vendorName}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-background/50 hover:bg-muted/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-foreground truncate">
                          {v.vendorName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {v.totalCount}{" "}
                          {v.totalCount === 1
                            ? "total dispatch"
                            : "total dispatches"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200">
                          {v.underRepairCount} Under Repair
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            return (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No materials currently sent to vendors.
              </p>
            );
          })()}
        </div>

        {/* Repair Status Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Wrench className="size-4 text-primary" />
              Repair Status Breakdown
            </h3>
            <span className="text-xs text-muted-foreground">
              Material repair states
            </span>
          </div>

          {(() => {
            const activeStatuses = (
              dashboardData?.repairStatusSummary || []
            ).filter((r) => r.count > 0);

            if (activeStatuses.length > 0) {
              return (
                <div className="grid grid-cols-2 gap-2.5">
                  {activeStatuses.map((r) => (
                    <div
                      key={r.status}
                      className="p-3 rounded-lg border border-border/70 bg-background/50 flex flex-col justify-between space-y-1"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: r.color }}
                        />
                        <span className="text-xs font-semibold text-muted-foreground truncate">
                          {r.label}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-foreground">
                        {r.count}
                      </div>
                    </div>
                  ))}
                </div>
              );
            }

            return (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No materials currently under repair.
              </p>
            );
          })()}
        </div>
      </div>

      {/* Bottom Grid: Ready For Customer Return & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Ready for Customer Return Actionable Queue */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <UserCheck className="size-4 text-primary" />
                Ready for Customer Return
              </h3>
              {dashboardData?.readyForCustomerDispatch &&
                dashboardData.readyForCustomerDispatch.length > 0 && (
                  <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
                    {dashboardData.readyForCustomerDispatch.length}
                  </span>
                )}
            </div>
            <button
              type="button"
              onClick={() => router.push("/asset-management/customer-return")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              View Queue <ArrowRight className="size-3" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Materials repaired by vendors and ready to hand back to clients
          </p>

          {dashboardData?.readyForCustomerDispatch &&
          dashboardData.readyForCustomerDispatch.length > 0 ? (
            <div className="space-y-2.5">
              {dashboardData.readyForCustomerDispatch.map((item) => {
                const statusTitle = item.isReceived
                  ? "CUSTOMER RECEIVED"
                  : "CUSTOMER RETURN READY";

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 rounded-lg border border-border/70 bg-background/50 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          {item.trackId}
                        </span>
                        <span className="text-xs font-bold text-foreground truncate">
                          {item.assetName}
                        </span>
                        <span className="text-muted-foreground">•</span>
                        <span
                          className={cn(
                            "text-xs font-bold tracking-wide",
                            item.isReceived
                              ? "text-blue-600 dark:text-blue-400"
                              : "text-emerald-600 dark:text-emerald-400",
                          )}
                        >
                          {statusTitle}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {item.productName} • {item.vendorName} •{" "}
                        {formatDate(item.vendorReceivedDate)}
                      </p>
                    </div>

                    <div className="text-xs shrink-0 text-left sm:text-right">
                      <span className="text-muted-foreground font-medium block">
                        {formatRelativeTime(item.vendorReceivedDate)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic py-6 text-center">
              No materials currently waiting for customer return.
            </p>
          )}
        </div>

        {/* Recent Material Activity Stream */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <History className="size-4 text-primary" />
                Recent Material Activity
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Latest updates and actions on materials
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/asset-management/reports")}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              View All <ArrowRight className="size-3" />
            </button>
          </div>

          {dashboardData?.recentActivity &&
          dashboardData.recentActivity.length > 0 ? (
            <div className="space-y-2.5">
              {dashboardData.recentActivity.map((act) => (
                <div
                  key={act.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 p-3 rounded-lg border border-border/70 bg-background/50 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {act.trackId}
                      </span>
                      <span className="text-xs font-bold text-foreground truncate">
                        {act.assetName}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-xs font-bold text-primary tracking-wide">
                        {act.actionLabel}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">
                      {act.description}
                    </p>
                  </div>

                  <div className="text-xs shrink-0 text-left sm:text-right">
                    <span className="text-muted-foreground font-medium block">
                      {formatRelativeTime(act.performedAt)}
                    </span>
                    <span className="text-xs font-semibold text-foreground/80 block mt-0.5">
                      {act.performedByName}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic py-6 text-center">
              No recent material activity.
            </p>
          )}
        </div>
      </div>

      {/* Direct Create Asset Dialog for Dashboard */}
      <AssetFormDialog
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={async (values) => {
          try {
            const { createAsset } = await import("@/lib/actions/assets");
            const res = await createAsset(values);
            if (res.ok) {
              setCreateOpen(false);
              const data = await AssetsApiService.getDashboardData();
              setDashboardData(data);
              return true;
            }
            return false;
          } catch {
            return false;
          }
        }}
      />
    </div>
  );
}
