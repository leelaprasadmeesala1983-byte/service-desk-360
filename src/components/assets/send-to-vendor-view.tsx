"use client";

import { Printer, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteSendToVendor,
  getSendToVendorList,
  updateSendToVendor,
  updateVendorDispatchRepairStatus,
} from "@/lib/actions/send-to-vendor";
import { printVendorDispatches } from "@/lib/utils/print-vendor-dispatch";
import type { SendToVendorFormValues } from "@/lib/validations/send-to-vendor";
import type {
  SendToVendorListResponse,
  SendToVendorRow,
} from "@/types/send-to-vendor";

import { SendToVendorDeleteDialog } from "./send-to-vendor-delete-dialog";
import { SendToVendorFormDialog } from "./send-to-vendor-form-dialog";
import { SendToVendorTable } from "./send-to-vendor-table";
import { SendToVendorViewDialog } from "./send-to-vendor-view-dialog";
import { VendorReceivedStatusDialog } from "./vendor-received-status-dialog";

type SendToVendorViewProps = {
  initialData?: SendToVendorListResponse;
  onCountChange?: (count: number) => void;
};

export function SendToVendorView({
  initialData,
  onCountChange,
}: SendToVendorViewProps) {
  const [listData, setListData] = useState<SendToVendorListResponse>(
    initialData || {
      data: [],
      pagination: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    },
  );
  const [loading, setLoading] = useState(false);

  // Search & Pagination state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Stable ref for onCountChange
  const onCountChangeRef = useRef(onCountChange);
  useEffect(() => {
    onCountChangeRef.current = onCountChange;
  }, [onCountChange]);

  // Dialog states
  const [editRecord, setEditRecord] = useState<SendToVendorRow | null>(null);
  const [viewRecord, setViewRecord] = useState<SendToVendorRow | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<SendToVendorRow | null>(
    null,
  );
  const [statusRecord, setStatusRecord] = useState<SendToVendorRow | null>(
    null,
  );

  // Print selection (select mode is toggled by the Print button)
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Map<string, SendToVendorRow>>(
    new Map(),
  );

  const toggleSelect = useCallback((record: SendToVendorRow) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(record.id)) next.delete(record.id);
      else next.set(record.id, record);
      return next;
    });
  }, []);

  const cancelSelect = () => {
    setSelectMode(false);
    setSelected(new Map());
  };

  const handlePrintClick = () => {
    if (!selectMode) {
      setSelectMode(true);
      return;
    }
    if (selected.size === 0) {
      toast.warning("Select at least one record to print.");
      return;
    }
    printVendorDispatches(Array.from(selected.values()), () => {
      toast.error(
        "Please allow pop-ups for ServiceDesk 360 to print the dispatch document.",
      );
    });
  };

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Reset to page 1 on search change
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch dispatched list data
  const fetchListData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSendToVendorList({
        page,
        limit: perPage,
        search: debouncedSearch.trim() || undefined,
        workflowStage: "SENT_TO_VENDOR",
      });

      if (res.ok) {
        setListData(res.data);
        onCountChangeRef.current?.(res.data.pagination.total);
      } else {
        toast.error(res.error || "Failed to load Send to Vendor records.");
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("An unexpected error occurred while fetching records.");
    } finally {
      setLoading(false);
    }
  }, [page, perPage, debouncedSearch]);

  useEffect(() => {
    fetchListData();
  }, [fetchListData]);

  // Status Update Action
  const handleStatusSubmit = async (newStatus: string): Promise<boolean> => {
    if (!statusRecord) return false;
    try {
      const res = await updateVendorDispatchRepairStatus(
        statusRecord.id,
        newStatus,
        "REPAIR_STATUS",
      );
      if (!res.ok) {
        toast.error(res.error || "Failed to update status.");
        return false;
      }

      toast.success("Status updated! Record moved to Repair Status.");
      setStatusRecord(null);
      await fetchListData();
      return true;
    } catch (err: unknown) {
      console.error("Status update error:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to update status";
      toast.error(msg);
      return false;
    }
  };

  // Edit Action
  const handleEditSubmit = async (
    values: SendToVendorFormValues,
  ): Promise<boolean> => {
    if (!editRecord) return false;
    try {
      const res = await updateSendToVendor(editRecord.id, values);
      if (!res.ok) {
        toast.error(res.error || "Failed to update Send to Vendor record.");
        return false;
      }

      toast.success("Send to Vendor record updated successfully!");
      setEditRecord(null);
      await fetchListData();
      return true;
    } catch (error) {
      console.error("Edit submit error:", error);
      toast.error("Failed to update record. Please try again.");
      return false;
    }
  };

  // Delete Action
  const handleDeleteConfirm = async (id: string): Promise<boolean> => {
    try {
      const res = await deleteSendToVendor({ id });
      if (!res.ok) {
        toast.error(res.error || "Failed to delete record.");
        return false;
      }

      toast.success("Send to Vendor record deleted successfully!");
      setDeleteRecord(null);

      if (listData.data.length <= 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        await fetchListData();
      }
      return true;
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete record. Please try again.");
      return false;
    }
  };

  const totalCount =
    listData.pagination?.total ??
    (Array.isArray(listData.data) ? listData.data.length : 0);

  return (
    <div className="flex w-full flex-col gap-5 pb-8">
      {/* Page Header & Search Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Send to Vendor" count={totalCount} />

        <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center">
        {/* Search Input */}
        <div className="relative w-full sm:w-80 shrink-0">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Track ID, Customer, Serial..."
            className="h-9 rounded-md pl-8.5 pr-8.5 bg-card text-xs border-border shadow-2xs w-full"
          />

          {search.length > 0 && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-0.5 transition-colors focus:outline-none cursor-pointer"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={handlePrintClick}
          className="h-9 gap-2 text-xs cursor-pointer shrink-0"
        >
          <Printer className="size-3.5" />
          {selectMode ? `Print (${selected.size})` : "Print"}
        </Button>
        {selectMode && (
          <Button
            type="button"
            variant="ghost"
            onClick={cancelSelect}
            className="h-9 text-xs cursor-pointer shrink-0"
          >
            Cancel
          </Button>
        )}
        </div>
      </div>

      {/* Dispatched Records Table */}
      <SendToVendorTable
        records={listData.data}
        loading={loading}
        page={listData.pagination.page}
        limit={perPage}
        total={listData.pagination.total}
        totalPages={listData.pagination.totalPages}
        onPageChange={(newPage) => setPage(newPage)}
        onLimitChange={(newLimit) => {
          setPerPage(newLimit);
          setPage(1);
        }}
        onView={(item) => setViewRecord(item)}
        onEdit={(item) => setEditRecord(item)}
        onDelete={(item) => setDeleteRecord(item)}
        selectable={selectMode}
        selectedIds={new Set(selected.keys())}
        onToggleSelect={toggleSelect}
        onUpdateStatus={(item) => setStatusRecord(item)}
        isSearch={Boolean(debouncedSearch)}
        onResetSearch={() => setSearch("")}
      />

      {/* Status Update Dialog */}
      <VendorReceivedStatusDialog
        open={Boolean(statusRecord)}
        item={statusRecord}
        onClose={() => setStatusRecord(null)}
        onSubmit={handleStatusSubmit}
      />

      {/* Edit Dialog */}
      <SendToVendorFormDialog
        open={Boolean(editRecord)}
        mode="edit"
        initialData={editRecord}
        onClose={() => setEditRecord(null)}
        onSubmit={handleEditSubmit}
      />

      {/* View Dialog */}
      <SendToVendorViewDialog
        open={Boolean(viewRecord)}
        item={viewRecord}
        onClose={() => setViewRecord(null)}
      />

      {/* Delete Dialog */}
      <SendToVendorDeleteDialog
        open={Boolean(deleteRecord)}
        item={deleteRecord}
        onClose={() => setDeleteRecord(null)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
