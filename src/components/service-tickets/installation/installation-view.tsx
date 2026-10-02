"use client";

import { FileSpreadsheet, History, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell/page-header";
import { InstallationDetailsDialog } from "@/components/service-tickets/installation/installation-details-dialog";
import { InstallationFormDialog } from "@/components/service-tickets/installation/installation-form-dialog";
import {
  ListToolbar,
  type StatusFilter,
} from "@/components/service-tickets/list-toolbar";
import { RowActions } from "@/components/service-tickets/row-actions";
import { StatusBadge } from "@/components/service-tickets/status-badge";
import { LogRequestDialog } from "@/components/service-tickets/work-history/log-request-dialog";
import { WorkHistoryDialog } from "@/components/service-tickets/work-history/work-history-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InstallationRow } from "@/db/queries/installations";
import type { StatusCounts } from "@/db/queries/service-requests";
import {
  deleteInstallation,
  exportInstallationsExcel,
} from "@/lib/actions/installations";
import type { UserRole } from "@/lib/constants";
import { downloadExcelBase64 } from "@/lib/excel-export";
import { exportInstallationToPdf } from "@/lib/export-installation-pdf";
import { formatDate, parseRecordIdSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

type InstallationViewProps = {
  records: InstallationRow[];
  stats: StatusCounts;
  viewerRole: UserRole;
  technicians: { id: string; name: string }[];
  initialViewId?: string;
};

function InstallationView({
  records,
  stats,
  viewerRole,
  technicians,
  initialViewId,
}: InstallationViewProps) {
  const router = useRouter();
  const isAdmin = viewerRole === "ADMIN";

  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [logRequestOpen, setLogRequestOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<InstallationRow>();
  const [viewRecord, setViewRecord] = useState<InstallationRow>();
  const [historyRecord, setHistoryRecord] = useState<InstallationRow>();

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await exportInstallationsExcel({
        status,
        search: search.trim() || undefined,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to export Excel.");
        return;
      }

      downloadExcelBase64(res.data.data, res.data.filename);
      toast.success("Excel exported successfully.");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (!initialViewId) return;
    const match = records.find((row) => row.id === initialViewId);
    if (match) setViewRecord(match);
  }, [initialViewId, records]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const seq = parseRecordIdSearch(search);
    return records.filter((row) => {
      if (status !== "ALL" && row.status !== status) return false;
      if (term) {
        const matchesText =
          row.customerName.toLowerCase().includes(term) ||
          (row.email?.toLowerCase().includes(term) ?? false) ||
          row.contactNumber.toLowerCase().includes(term) ||
          row.recordId.toLowerCase().includes(term) ||
          (row.referenceNo?.toLowerCase().includes(term) ?? false) ||
          (row.technicianNames?.some((n) => n.toLowerCase().includes(term)) ??
            false) ||
          (row.technicianName?.toLowerCase().includes(term) ?? false);
        if (!matchesText && !(seq !== null && row.seq === seq)) return false;
      }
      return true;
    });
  }, [records, status, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pageCount);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const visible = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const tabs = [
    { value: "ALL" as const, label: "All", count: stats.ALL },
    { value: "OPEN" as const, label: "Open", count: stats.OPEN },
    {
      value: "IN_PROGRESS" as const,
      label: "In Progress",
      count: stats.IN_PROGRESS,
    },
    { value: "CLOSED" as const, label: "Closed", count: stats.CLOSED },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <PageHeader
        title="Installation Management"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={isExporting}
              className="gap-1.5"
            >
              {isExporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-4" />
              )}
              Export Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => setLogRequestOpen(true)}
              className="gap-1.5"
            >
              <History className="size-4" />
              Log Request
            </Button>
            {isAdmin && (
              <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus className="size-4" />
                New Installation
              </Button>
            )}
          </div>
        }
      />

      <div className="border-border bg-card/40 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground font-medium">
            Total Installations
          </span>
          <span className="text-foreground font-bold">{stats.ALL}</span>
        </div>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-1">
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            Open Requests
          </span>
          <span className="text-blue-600 dark:text-blue-400 font-bold">
            {stats.OPEN}
          </span>
        </div>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-1">
          <span className="text-amber-600 dark:text-amber-400 font-medium">
            In Progress
          </span>
          <span className="text-amber-600 dark:text-amber-400 font-bold">
            {stats.IN_PROGRESS}
          </span>
        </div>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-1">
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            Completed
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {stats.CLOSED}
          </span>
        </div>
      </div>

      <ListToolbar
        tabs={tabs}
        active={status}
        onActiveChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        searchPlaceholder="Search by customer or Installation ID"
      />

      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="overflow-x-auto max-w-full">
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead>
                <TableHead className="w-28">Installation ID</TableHead>
                <TableHead className="w-40">Customer Name</TableHead>
                <TableHead className="w-32">Contact Number</TableHead>
                <TableHead className="w-36">Email</TableHead>
                <TableHead className="w-44">Assigned Technician</TableHead>
                <TableHead className="w-28 text-center">Status</TableHead>
                <TableHead className="w-28">Created</TableHead>
                <TableHead className="w-28">Updated</TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-muted-foreground py-10 text-center"
                  >
                    No installations match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((row, index) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-muted-foreground">
                      {(safePage - 1) * perPage + index + 1}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.recordId}
                    </TableCell>
                    <TableCell className="font-medium">
                      {row.customerName}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {row.contactNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.technicianNames && row.technicianNames.length > 0
                        ? row.technicianNames.join(", ")
                        : (row.technicianName ?? "—")}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge
                        className="justify-center"
                        status={row.status}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.updatedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        onView={() => setViewRecord(row)}
                        onEdit={() => setEditRecord(row)}
                        onHistory={() => setHistoryRecord(row)}
                        onExport={() => exportInstallationToPdf(row)}
                        deletion={
                          isAdmin
                            ? {
                                label: row.recordId,
                                onConfirm: () =>
                                  deleteInstallation({ id: row.id }),
                                onDeleted: () => router.refresh(),
                              }
                            : undefined
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground text-xs">
          Showing {filtered.length === 0 ? 0 : (safePage - 1) * perPage + 1}–
          {Math.min(safePage * perPage, filtered.length)} of {filtered.length}{" "}
          installations
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-muted-foreground flex items-center gap-2 text-xs">
            Per page:
            <select
              value={perPage}
              onChange={(event) => {
                setPerPage(Number(event.target.value));
                setPage(1);
              }}
              className="border-border rounded-md px-2 py-1"
            >
              {[10, 20, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="border-border rounded-md px-2 py-1 text-xs disabled:opacity-50"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              ‹
            </button>
            {Array.from(
              { length: Math.min(3, pageCount) },
              (_, i) => i + 1,
            ).map((index) => (
              <button
                key={index}
                type="button"
                className={cn(
                  "border-border rounded-md px-2 py-1 text-xs",
                  index === safePage
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground",
                )}
                onClick={() => setPage(index)}
              >
                {index}
              </button>
            ))}
            <button
              type="button"
              className="border-border rounded-md px-2 py-1 text-xs disabled:opacity-50"
              disabled={safePage >= pageCount}
              onClick={() =>
                setPage((current) => Math.min(pageCount, current + 1))
              }
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {isAdmin && (
        <InstallationFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          viewerRole={viewerRole}
          technicians={technicians}
        />
      )}

      <InstallationFormDialog
        key={editRecord?.id ?? "edit"}
        open={Boolean(editRecord)}
        onOpenChange={(open) => !open && setEditRecord(undefined)}
        viewerRole={viewerRole}
        technicians={technicians}
        record={editRecord}
      />

      <InstallationDetailsDialog
        open={Boolean(viewRecord)}
        onOpenChange={(open) => !open && setViewRecord(undefined)}
        record={viewRecord}
      />

      <LogRequestDialog
        open={logRequestOpen}
        onOpenChange={setLogRequestOpen}
        workType="INSTALLATION"
        selectableTickets={records.map((r) => ({
          id: r.id,
          seq: r.seq,
          recordId: r.recordId,
          customerName: r.customerName,
          phone: r.contactNumber,
          email: r.email,
          category: "Installation",
          address: r.address,
          status: r.status,
          assignedTechnicianIds: r.assignedTechnicianIds,
          technicianNames: r.technicianNames,
        }))}
        technicians={technicians}
        onSuccess={() => router.refresh()}
      />

      <WorkHistoryDialog
        key={historyRecord?.id ?? "history"}
        open={Boolean(historyRecord)}
        onOpenChange={(open) => !open && setHistoryRecord(undefined)}
        workType="INSTALLATION"
        record={
          historyRecord
            ? {
                id: historyRecord.id,
                recordId: historyRecord.recordId,
                customerName: historyRecord.customerName,
                phone: historyRecord.contactNumber,
                category: "Installation",
                address: historyRecord.address,
                status: historyRecord.status,
                assignedTechnicianIds: historyRecord.assignedTechnicianIds,
                technicianNames: historyRecord.technicianNames,
              }
            : undefined
        }
        technicians={technicians}
        onLogAdded={() => router.refresh()}
      />
    </div>
  );
}

export { InstallationView };
