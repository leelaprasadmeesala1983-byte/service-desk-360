"use client";

import { CheckCircle2, Plus, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAsset,
  deleteAsset,
  getAssets,
  updateAsset,
} from "@/lib/actions/assets";
import { createSendToVendor } from "@/lib/actions/send-to-vendor";
import { AssetsApiService } from "@/lib/services/assets-api";
import { cn } from "@/lib/utils";
import type { AssetFormValues } from "@/lib/validations/assets";
import type { CustomerDispatchFormValues } from "@/lib/validations/customer-dispatch";
import type {
  ReceiveFromVendorFormValues,
  SendToVendorFormValues,
} from "@/lib/validations/send-to-vendor";
import type { AssetListResponse, AssetRow, AssetStats } from "@/types/assets";
import type {
  SendToVendorListResponse,
  SendToVendorStats,
} from "@/types/send-to-vendor";

import { AssetDeleteDialog } from "./asset-delete-dialog";
import { AssetFormDialog } from "./asset-form-dialog";
import { AssetViewDialog } from "./asset-view-dialog";
import { AssetsDashboard } from "./assets-dashboard";
import { AssetsTable } from "./assets-table";
import { AssetsTabs, type AssetTabKey } from "./assets-tabs";
import { CustomerDispatchDialog } from "./customer-dispatch-dialog";
import { ReceiveFromVendorDialog } from "./receive-from-vendor-dialog";
import { SendToVendorFormDialog } from "./send-to-vendor-form-dialog";
import { SendToVendorView } from "./send-to-vendor-view";

type AssetsViewProps = {
  initialAssets: AssetListResponse;
  initialSendToVendor?: SendToVendorListResponse;
  initialStats?: AssetStats;
  initialSendToVendorStats?: SendToVendorStats;
  initialTabParam?: string;
};

const STATUS_FILTER_TABS = [
  { label: "All", value: "ALL" },
  { label: "Received", value: "Received" },
  { label: "Under Repair", value: "Under Repair" },
  { label: "Received from Vendor", value: "Received From Vendor" },
  { label: "Ready for Dispatch", value: "Ready For Customer Dispatch" },
  { label: "Dispatched", value: "Dispatched To Customer" },
  { label: "Delivered", value: "Delivered" },
  { label: "Closed", value: "Closed" },
];

function getTabFromParam(tabParam?: string | null): AssetTabKey {
  if (tabParam === "dashboard") return "dashboard";
  if (tabParam === "send-to-vendor") return "send-to-vendor";
  return "received";
}

export function AssetsView({
  initialAssets,
  initialSendToVendor,
  initialStats,
  initialSendToVendorStats,
  initialTabParam,
}: AssetsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<AssetTabKey>(() =>
    getTabFromParam(searchParams?.get("tab") || initialTabParam),
  );

  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Sync tab state when URL searchParams changes
  useEffect(() => {
    const currentTab = searchParams?.get("tab");
    setActiveTab(getTabFromParam(currentTab));
  }, [searchParams]);

  const handleTabChange = (newTab: AssetTabKey, targetStatus?: string) => {
    setActiveTab(newTab);
    if (targetStatus) {
      setStatusFilter(targetStatus);
    }
    const params = new URLSearchParams(searchParams?.toString() || "");
    if (newTab === "received") {
      params.set("tab", "received");
    } else if (newTab === "send-to-vendor") {
      params.set("tab", "send-to-vendor");
    } else {
      params.delete("tab");
    }
    const query = params.toString();
    router.push(query ? `/asset-management?${query}` : "/asset-management");
  };

  // State for Received Material list
  const [assetsData, setAssetsData] =
    useState<AssetListResponse>(initialAssets);
  const [loading, setLoading] = useState(false);

  // Stats
  const [stats, setStats] = useState<AssetStats>(
    initialStats || {
      total: initialAssets.pagination.total,
      received: initialAssets.pagination.total,
      underRepair: 0,
      receivedFromVendor: 0,
      customerReturned: 0,
      activeRepairMaterials: 0,
      readyForCustomerDispatch: 0,
      dispatchedToCustomer: 0,
      delivered: 0,
      closed: 0,
    },
  );

  const [sendToVendorTotal, setSendToVendorTotal] = useState<number>(
    initialSendToVendorStats?.total ||
      initialSendToVendor?.pagination.total ||
      0,
  );

  // Search & Pagination State for Assets (Received / All Assets)
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Dialog states for Assets
  const [createOpen, setCreateOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AssetRow | null>(null);
  const [viewRecord, setViewRecord] = useState<AssetRow | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<AssetRow | null>(null);

  // Lifecycle Modals
  const [sendToVendorRecord, setSendToVendorRecord] = useState<AssetRow | null>(
    null,
  );
  const [receiveFromVendorRecord, setReceiveFromVendorRecord] =
    useState<AssetRow | null>(null);
  const [customerDispatchRecord, setCustomerDispatchRecord] =
    useState<AssetRow | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on new search
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch assets list data
  const fetchListData = useCallback(async () => {
    if (activeTab === "send-to-vendor" || activeTab === "dashboard") return;

    setLoading(true);
    try {
      let resolvedStatus = statusFilter;
      if (activeTab === "received" && statusFilter === "ALL") {
        resolvedStatus = "ALL";
      }

      const res = await getAssets({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
        status: resolvedStatus,
      });

      if (res.ok) {
        setAssetsData(res.data);
      } else {
        toast.error(res.error || "Failed to load materials.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("An unexpected error occurred while fetching materials.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, statusFilter, page, limit, debouncedSearch]);

  useEffect(() => {
    fetchListData();
  }, [fetchListData]);

  // Refresh stats
  const refreshStats = useCallback(async () => {
    try {
      const s = await AssetsApiService.getStats();
      setStats(s);
    } catch (e) {
      console.error("Failed to refresh stats:", e);
    }
  }, []);

  // Create Material Action
  const handleCreateSubmit = async (
    values: AssetFormValues,
  ): Promise<boolean> => {
    try {
      const res = await createAsset(values);
      if (!res.ok) {
        toast.error(res.error || "Failed to create material.");
        return false;
      }

      toast.success("Material created successfully!");
      setCreateOpen(false);
      await fetchListData();
      await refreshStats();
      return true;
    } catch (error) {
      console.error("Create submit error:", error);
      toast.error("Failed to create material. Please try again.");
      return false;
    }
  };

  // Edit Material Action
  const handleEditSubmit = async (
    values: AssetFormValues,
  ): Promise<boolean> => {
    if (!editRecord) return false;
    try {
      const res = await updateAsset(editRecord.id, values);
      if (!res.ok) {
        toast.error(res.error || "Failed to update material.");
        return false;
      }

      toast.success("Material updated successfully!");
      setEditRecord(null);
      await fetchListData();
      return true;
    } catch (error) {
      console.error("Edit submit error:", error);
      toast.error("Failed to update material. Please try again.");
      return false;
    }
  };

  // Delete Material Action
  const handleDeleteConfirm = async (id: string): Promise<boolean> => {
    try {
      const res = await deleteAsset({ id });
      if (!res.ok) {
        toast.error(res.error || "Failed to delete material.");
        return false;
      }

      toast.success("Material deleted successfully!");
      setDeleteRecord(null);

      if (assetsData.data.length <= 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchListData();
      }
      await refreshStats();
      return true;
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete material. Please try again.");
      return false;
    }
  };

  // Lifecycle Action 1: Send To Vendor Submit
  const handleSendToVendorSubmit = async (
    values: SendToVendorFormValues,
  ): Promise<boolean> => {
    try {
      const res = await createSendToVendor(values);
      if (!res.ok) {
        toast.error(res.error || "Failed to send material to vendor.");
        return false;
      }

      toast.success("Material sent to vendor successfully!");
      setSendToVendorRecord(null);
      await fetchListData();
      await refreshStats();
      return true;
    } catch (error) {
      console.error("Send to vendor error:", error);
      toast.error("Failed to dispatch to vendor.");
      return false;
    }
  };

  // Lifecycle Action 2: Receive From Vendor Submit
  const handleReceiveFromVendorSubmit = async (
    values: ReceiveFromVendorFormValues,
  ): Promise<boolean> => {
    if (!receiveFromVendorRecord) return false;
    try {
      await AssetsApiService.receiveFromVendor(
        receiveFromVendorRecord.id,
        values,
      );
      toast.success(
        "Material received from vendor successfully! Status updated to Ready for Dispatch.",
      );
      setReceiveFromVendorRecord(null);
      await fetchListData();
      await refreshStats();
      return true;
    } catch (error: unknown) {
      console.error("Receive from vendor error:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to record vendor return.";
      toast.error(msg);
      return false;
    }
  };

  // Lifecycle Action 3: Dispatch To Customer Submit
  const handleCustomerDispatchSubmit = async (
    values: CustomerDispatchFormValues,
  ): Promise<boolean> => {
    if (!customerDispatchRecord) return false;
    try {
      await AssetsApiService.dispatchToCustomer(
        customerDispatchRecord.id,
        values,
      );
      toast.success("Material dispatched to customer successfully!");
      setCustomerDispatchRecord(null);
      await fetchListData();
      await refreshStats();
      return true;
    } catch (error: unknown) {
      console.error("Customer dispatch error:", error);
      const msg =
        error instanceof Error
          ? error.message
          : "Failed to dispatch to customer.";
      toast.error(msg);
      return false;
    }
  };

  // Lifecycle Action 4: Confirm Delivery
  const handleConfirmDelivery = async (asset: AssetRow) => {
    try {
      await AssetsApiService.confirmDelivery(asset.id, { assetId: asset.id });
      toast.success("Material delivery confirmed successfully!");
      await fetchListData();
      await refreshStats();
    } catch (error: unknown) {
      console.error("Confirm delivery error:", error);
      const msg =
        error instanceof Error ? error.message : "Failed to confirm delivery.";
      toast.error(msg);
    }
  };

  // Lifecycle Action 5: Close Lifecycle
  const handleCloseLifecycle = async (asset: AssetRow) => {
    try {
      await AssetsApiService.closeAsset(asset.id);
      toast.success("Material lifecycle closed successfully!");
      await fetchListData();
      await refreshStats();
    } catch (error: unknown) {
      console.error("Close lifecycle error:", error);
      const msg =
        error instanceof Error ? error.message : "Failed to close lifecycle.";
      toast.error(msg);
    }
  };

  const handleSendToVendorCountChange = (count: number) => {
    setSendToVendorTotal(count);
  };

  return (
    <div className="flex w-full flex-col min-h-screen">
      {/* Top Horizontal Tabs Navigation */}
      <AssetsTabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        receivedCount={stats.received}
        sendToVendorCount={sendToVendorTotal}
        totalCount={stats.total}
      />

      {/* Main Tab Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8">
        {/* Tab 1: Dashboard */}
        {activeTab === "dashboard" && (
          <AssetsDashboard
            stats={stats}
            sendToVendorCount={sendToVendorTotal}
            onCreateAsset={() => setCreateOpen(true)}
          />
        )}

        {/* Tab 2: Send to Vendor */}
        {activeTab === "send-to-vendor" && (
          <SendToVendorView
            initialData={initialSendToVendor}
            onCountChange={handleSendToVendorCountChange}
          />
        )}

        {/* Tab 3: Received Material */}
        {activeTab === "received" && (
          <div className="space-y-4">
            {/* Page Header matching Send to Vendor */}
            <PageHeader
              title="Received Material"
              action={
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative w-full sm:w-80 shrink-0">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search material, customer, serial, ID..."
                      className="h-9.5 rounded-lg pl-9 pr-9 bg-card text-sm border-border shadow-2xs"
                    />
                    {search.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer"
                        aria-label="Clear search"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  <Button
                    onClick={() => setCreateOpen(true)}
                    className="h-9.5 gap-2 shadow-xs cursor-pointer shrink-0"
                  >
                    <Plus className="size-4" />
                    <span>Create Asset</span>
                  </Button>
                </div>
              }
            />

            {/* Lifecycle Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {STATUS_FILTER_TABS.map((tab) => {
                const isActive = statusFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.value);
                      setPage(1);
                    }}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted/40",
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Table Section */}
            <AssetsTable
              assets={assetsData.data}
              loading={loading}
              page={assetsData.pagination.page}
              limit={assetsData.pagination.limit}
              total={assetsData.pagination.total}
              totalPages={assetsData.pagination.totalPages}
              onPageChange={(newPage) => setPage(newPage)}
              onLimitChange={(newLimit) => {
                setLimit(newLimit);
                setPage(1);
              }}
              onView={(asset) => setViewRecord(asset)}
              onEdit={(asset) => setEditRecord(asset)}
              onDelete={(asset) => setDeleteRecord(asset)}
              onSendToVendor={(asset) => setSendToVendorRecord(asset)}
              onReceiveFromVendor={(asset) => setReceiveFromVendorRecord(asset)}
              onDispatchToCustomer={(asset) => setCustomerDispatchRecord(asset)}
              onConfirmDelivery={handleConfirmDelivery}
              isSearch={Boolean(debouncedSearch)}
              onResetSearch={() => setSearch("")}
            />
          </div>
        )}
      </div>

      {/* Modals & Dialogs */}

      {/* Create Material Dialog */}
      <AssetFormDialog
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateSubmit}
      />

      {/* Edit Material Dialog */}
      <AssetFormDialog
        open={Boolean(editRecord)}
        mode="edit"
        initialData={editRecord}
        onClose={() => setEditRecord(null)}
        onSubmit={handleEditSubmit}
      />

      {/* Send to Vendor Dialog */}
      <SendToVendorFormDialog
        open={Boolean(sendToVendorRecord)}
        mode="create"
        initialAsset={sendToVendorRecord}
        availableAssets={assetsData.data}
        onClose={() => setSendToVendorRecord(null)}
        onSubmit={handleSendToVendorSubmit}
      />

      {/* Receive from Vendor Dialog */}
      <ReceiveFromVendorDialog
        open={Boolean(receiveFromVendorRecord)}
        asset={receiveFromVendorRecord}
        onClose={() => setReceiveFromVendorRecord(null)}
        onSubmit={handleReceiveFromVendorSubmit}
      />

      {/* Customer Dispatch Dialog */}
      <CustomerDispatchDialog
        open={Boolean(customerDispatchRecord)}
        asset={customerDispatchRecord}
        onClose={() => setCustomerDispatchRecord(null)}
        onSubmit={handleCustomerDispatchSubmit}
      />

      {/* View Material Details Dialog */}
      <AssetViewDialog
        open={Boolean(viewRecord)}
        asset={viewRecord}
        onClose={() => setViewRecord(null)}
        onSendToVendor={(asset) => setSendToVendorRecord(asset)}
        onReceiveFromVendor={(asset) => setReceiveFromVendorRecord(asset)}
        onDispatchToCustomer={(asset) => setCustomerDispatchRecord(asset)}
        onConfirmDelivery={handleConfirmDelivery}
        onCloseLifecycle={handleCloseLifecycle}
      />

      {/* Delete Dialog */}
      <AssetDeleteDialog
        open={Boolean(deleteRecord)}
        asset={deleteRecord}
        onClose={() => setDeleteRecord(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
