"use client";

import { Plus, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createVendor,
  deleteVendor,
  getVendors,
  updateVendor,
} from "@/lib/actions/vendors";
import type { VendorFormValues } from "@/lib/validations/vendors";
import type { VendorListResponse, VendorRow } from "@/types/vendors";

import { VendorDeleteDialog } from "./vendor-delete-dialog";
import { VendorFormDialog } from "./vendor-form-dialog";
import { VendorViewDialog } from "./vendor-view-dialog";
import { VendorsTable } from "./vendors-table";

type VendorsViewProps = {
  initialVendors: VendorListResponse;
};

export function VendorsView({ initialVendors }: VendorsViewProps) {
  const [vendorsData, setVendorsData] =
    useState<VendorListResponse>(initialVendors);
  const [loading, setLoading] = useState(false);

  // Search & Pagination
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editVendor, setEditVendor] = useState<VendorRow | null>(null);
  const [viewVendor, setViewVendor] = useState<VendorRow | null>(null);
  const [deleteVendorRecord, setDeleteVendorRecord] =
    useState<VendorRow | null>(null);

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
      const res = await getVendors({
        page,
        limit,
        search: debouncedSearch.trim() || undefined,
      });

      if (res.ok) {
        setVendorsData(res.data);
      } else {
        toast.error(res.error || "Failed to load vendors.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("An unexpected error occurred while fetching vendors.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchListData();
  }, [fetchListData]);

  const handleCreateSubmit = async (
    values: VendorFormValues,
  ): Promise<boolean> => {
    try {
      const res = await createVendor(values);
      if (!res.ok) {
        toast.error(res.error || "Failed to create vendor.");
        return false;
      }

      toast.success("Vendor created successfully!");
      setCreateOpen(false);
      await fetchListData();
      return true;
    } catch (error) {
      console.error("Create submit error:", error);
      toast.error("Failed to create vendor. Please try again.");
      return false;
    }
  };

  const handleEditSubmit = async (
    values: VendorFormValues,
  ): Promise<boolean> => {
    if (!editVendor) return false;
    try {
      const res = await updateVendor(editVendor.id, values);
      if (!res.ok) {
        toast.error(res.error || "Failed to update vendor.");
        return false;
      }

      toast.success("Vendor updated successfully!");
      setEditVendor(null);
      await fetchListData();
      return true;
    } catch (error) {
      console.error("Edit submit error:", error);
      toast.error("Failed to update vendor. Please try again.");
      return false;
    }
  };

  const handleDeleteConfirm = async (id: string): Promise<boolean> => {
    try {
      const res = await deleteVendor({ id });
      if (!res.ok) {
        toast.error(res.error || "Failed to delete vendor.");
        return false;
      }

      toast.success("Vendor deleted successfully!");
      setDeleteVendorRecord(null);

      if (vendorsData.data.length <= 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchListData();
      }
      return true;
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete vendor. Please try again.");
      return false;
    }
  };

  const totalVendorsCount =
    vendorsData.pagination?.total ??
    (Array.isArray(vendorsData.data) ? vendorsData.data.length : 0);

  return (
    <div className="space-y-4">
      {/* Page Header matching exact ServiceDesk 360 typography */}
      <PageHeader
        title="Vendors"
        count={totalVendorsCount}
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-80 shrink-0">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Vendor..."
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
              <span>Add Vendor</span>
            </Button>
          </div>
        }
      />

      {/* Table Section */}
      <VendorsTable
        vendors={vendorsData.data}
        loading={loading}
        page={vendorsData.pagination.page}
        limit={vendorsData.pagination.limit}
        total={vendorsData.pagination.total}
        totalPages={vendorsData.pagination.totalPages}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setLimit(newLimit);
          setPage(1);
        }}
        onView={(vendor) => setViewVendor(vendor)}
        onEdit={(vendor) => setEditVendor(vendor)}
        onDelete={(vendor) => setDeleteVendorRecord(vendor)}
        isSearch={Boolean(debouncedSearch)}
        onResetSearch={() => setSearch("")}
      />

      {/* Create Dialog */}
      <VendorFormDialog
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateSubmit}
      />

      {/* Edit Dialog */}
      <VendorFormDialog
        open={Boolean(editVendor)}
        mode="edit"
        initialData={editVendor}
        onClose={() => setEditVendor(null)}
        onSubmit={handleEditSubmit}
      />

      {/* View Dialog */}
      <VendorViewDialog
        open={Boolean(viewVendor)}
        vendor={viewVendor}
        onClose={() => setViewVendor(null)}
      />

      {/* Delete Dialog */}
      <VendorDeleteDialog
        open={Boolean(deleteVendorRecord)}
        vendor={deleteVendorRecord}
        onClose={() => setDeleteVendorRecord(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
