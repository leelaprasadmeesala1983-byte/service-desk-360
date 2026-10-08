"use client";

import { Plus, Search, X } from "lucide-react";
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
import type { AssetFormValues } from "@/lib/validations/assets";
import type { SendToVendorFormValues } from "@/lib/validations/send-to-vendor";
import type { AssetListResponse, ReceivedItemRow } from "@/types/assets";

import { AssetDeleteDialog } from "./asset-delete-dialog";
import { AssetFormDialog } from "./asset-form-dialog";
import {
  isItemAvailable,
  ReceivedMaterialTable,
} from "./received-material-table";
import { ReceivedMaterialViewDialog } from "./received-material-view-dialog";
import { SendToVendorFormDialog } from "./send-to-vendor-form-dialog";

type ReceivedMaterialViewProps = {
  initialAssets: AssetListResponse;
};

export function ReceivedMaterialView({
  initialAssets,
}: ReceivedMaterialViewProps) {
  const [assetsData, setAssetsData] =
    useState<AssetListResponse>(initialAssets);
  const [loading, setLoading] = useState(false);

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Selection & Dispatch Flow
  const [selectedItems, setSelectedItems] = useState<ReceivedItemRow[]>([]);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchItems, setDispatchItems] = useState<ReceivedItemRow[]>([]);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ReceivedItemRow | null>(null);
  const [viewItem, setViewItem] = useState<ReceivedItemRow | null>(null);
  const [deleteItem, setDeleteItem] = useState<ReceivedItemRow | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchListData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAssets({
        page: 1,
        limit: 1000,
        search: debouncedSearch.trim() || undefined,
        status: "ALL",
      });

      if (res.ok) {
        setAssetsData(res.data);
      } else {
        toast.error(res.error || "Failed to load received materials.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("An unexpected error occurred while fetching materials.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchListData();
  }, [fetchListData]);

  const handleTriggerDispatch = (items: ReceivedItemRow[]) => {
    if (items.length === 0) {
      toast.warning("Please select at least one material to dispatch.");
      return;
    }
    setDispatchItems(items);
    setDispatchOpen(true);
  };

  const handleDispatchSubmit = async (
    values: SendToVendorFormValues,
  ): Promise<boolean> => {
    try {
      const res = await createSendToVendor(values);
      if (!res.ok) {
        toast.error(res.error || "Failed to create vendor dispatch.");
        return false;
      }

      toast.success("Vendor dispatch created successfully!");
      setDispatchOpen(false);
      setDispatchItems([]);
      setSelectedItems([]);
      await fetchListData();
      return true;
    } catch (error) {
      console.error("Dispatch submit error:", error);
      toast.error("Failed to create vendor dispatch. Please try again.");
      return false;
    }
  };

  const handleCreateSubmit = async (
    values: AssetFormValues,
  ): Promise<boolean> => {
    try {
      const res = await createAsset(values);
      if (!res.ok) {
        toast.error(res.error || "Failed to receive material.");
        return false;
      }

      toast.success("Material received and registered successfully!");
      setCreateOpen(false);
      await fetchListData();
      return true;
    } catch (error) {
      console.error("Create submit error:", error);
      toast.error("Failed to receive material. Please try again.");
      return false;
    }
  };

  const handleEditSubmit = async (
    values: AssetFormValues,
  ): Promise<boolean> => {
    if (!editItem) return false;
    try {
      const res = await updateAsset(
        editItem.assetId,
        values,
        editItem.productId,
      );
      if (!res.ok) {
        toast.error(res.error || "Failed to update material.");
        return false;
      }

      toast.success("Material updated successfully!");
      setEditItem(null);
      await fetchListData();
      return true;
    } catch (error) {
      console.error("Edit submit error:", error);
      toast.error("Failed to update material. Please try again.");
      return false;
    }
  };

  const handleDeleteConfirm = async (
    assetId: string,
    productId?: string,
  ): Promise<boolean> => {
    try {
      const res = await deleteAsset({ id: assetId, productId });
      if (!res.ok) {
        toast.error(res.error || "Failed to delete material.");
        return false;
      }

      toast.success("Material record deleted successfully!");
      setDeleteItem(null);
      setSelectedItems((prev) =>
        prev.filter(
          (i) =>
            !(
              i.assetId === assetId &&
              (!productId || i.productId === productId)
            ),
        ),
      );

      await fetchListData();
      return true;
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete material. Please try again.");
      return false;
    }
  };

  const editInitialData = editItem
    ? {
        id: editItem.assetId,
        seq: editItem.assetSeq,
        name: editItem.rawAsset.name,
        customerName: editItem.customerName,
        customerNumber: editItem.customerNumber,
        location: editItem.location,
        status: editItem.assetStatus,
        repairStatus: editItem.rawAsset.repairStatus,
        productsCount: 1,
        createdAt: editItem.createdAt,
        updatedAt: editItem.rawAsset.updatedAt,
        products: [
          {
            id: editItem.productId,
            productType: editItem.productType,
            otherProductType: editItem.otherProductType || "",
            brandName: editItem.brandName || "",
            modelNumber: editItem.modelNumber || "",
            serialNumber:
              editItem.serialNumber !== "—" ? editItem.serialNumber : "",
            quantity: Number(editItem.quantity) || 1,
            accessories: editItem.accessories || "",
            description: editItem.description || "",
            remarks: editItem.remarks || "",
            status: editItem.itemStatus,
            dispatchId: editItem.dispatchId,
          },
        ],
      }
    : null;

  const totalItemsCount = (assetsData.data || []).reduce((acc, a) => {
    if (!Array.isArray(a.products) || a.products.length === 0) {
      return acc + (isItemAvailable({ itemStatus: a.status }) ? 1 : 0);
    }
    return (
      acc +
      a.products.filter((p) =>
        isItemAvailable({
          itemStatus: p.status || a.status,
          dispatchId: p.dispatchId,
        }),
      ).length
    );
  }, 0);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <PageHeader
        title="Received Material"
        count={totalItemsCount}
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-80 shrink-0">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Material..."
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
              <span>Receive Material</span>
            </Button>
          </div>
        }
      />

      {/* Table Section */}
      <ReceivedMaterialTable
        assets={assetsData.data}
        loading={loading}
        page={page}
        limit={limit}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        onView={(item) => setViewItem(item)}
        onEdit={(item) => setEditItem(item)}
        onDelete={(item) => setDeleteItem(item)}
        selectedItems={selectedItems}
        onSelectionChange={setSelectedItems}
        onCreateDispatch={handleTriggerDispatch}
        isSearch={Boolean(debouncedSearch)}
        searchQuery={debouncedSearch}
        onResetSearch={() => setSearch("")}
      />

      {/* Create Dialog */}
      <AssetFormDialog
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateSubmit}
      />

      {/* Edit Dialog */}
      <AssetFormDialog
        open={Boolean(editItem)}
        mode="edit"
        initialData={editInitialData}
        onClose={() => setEditItem(null)}
        onSubmit={handleEditSubmit}
      />

      {/* View Dialog */}
      <ReceivedMaterialViewDialog
        open={Boolean(viewItem)}
        item={viewItem}
        onClose={() => setViewItem(null)}
      />

      {/* Delete Dialog */}
      <AssetDeleteDialog
        open={Boolean(deleteItem)}
        item={deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Create Vendor Dispatch Modal */}
      <SendToVendorFormDialog
        open={dispatchOpen}
        mode="create"
        initialDispatchItems={dispatchItems}
        availableAssets={assetsData.data}
        onClose={() => {
          setDispatchOpen(false);
          setDispatchItems([]);
        }}
        onSubmit={handleDispatchSubmit}
      />
    </div>
  );
}
