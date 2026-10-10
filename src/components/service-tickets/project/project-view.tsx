"use client";

import { FileSpreadsheet, History, Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell/page-header";
import {
  ListToolbar,
  type StatusFilter,
} from "@/components/service-tickets/list-toolbar";
import { ProjectDetailsDialog } from "@/components/service-tickets/project/project-details-dialog";
import { ProjectFormDialog } from "@/components/service-tickets/project/project-form-dialog";
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
import type { ProjectRow } from "@/db/queries/projects";
import type { StatusCounts } from "@/db/queries/service-requests";
import { deleteProject, exportProjectsExcel } from "@/lib/actions/projects";
import type { UserRole } from "@/lib/constants";
import { downloadExcelBase64 } from "@/lib/excel-export";
import { parseRecordIdSearch } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProjectViewProps = {
  records: ProjectRow[];
  stats: StatusCounts;
  viewerRole: UserRole;
  technicians: { id: string; name: string }[];
  initialViewId?: string;
};

function ProjectView({
  records,
  stats,
  viewerRole,
  technicians,
  initialViewId,
}: ProjectViewProps) {
  const router = useRouter();
  const isAdmin = viewerRole === "ADMIN";

  const [recordsList, setRecordsList] = useState<ProjectRow[]>(records);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [logRequestOpen, setLogRequestOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ProjectRow>();
  const [viewRecord, setViewRecord] = useState<ProjectRow>();
  const [historyRecord, setHistoryRecord] = useState<ProjectRow>();

  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await exportProjectsExcel({
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
    setRecordsList(records);
  }, [records]);

  useEffect(() => {
    if (!initialViewId) return;
    const match = recordsList.find((row) => row.id === initialViewId);
    if (match) setViewRecord(match);
  }, [initialViewId, recordsList]);

  useEffect(() => {
    if (!viewRecord) return;
    const match = recordsList.find((row) => row.id === viewRecord.id);
    if (match && match !== viewRecord) {
      setViewRecord(match);
    }
  }, [recordsList, viewRecord]);

  const handleSaveSuccess = (savedRecord: ProjectRow, isEdit: boolean) => {
    setRecordsList((prev) => {
      if (isEdit) {
        return prev.map((r) => (r.id === savedRecord.id ? savedRecord : r));
      }
      return [savedRecord, ...prev.filter((r) => r.id !== savedRecord.id)];
    });
    setViewRecord((prev) => (prev?.id === savedRecord.id ? savedRecord : prev));
    setEditRecord(undefined);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const seq = parseRecordIdSearch(search);
    return recordsList.filter((row) => {
      if (status !== "ALL" && row.status !== status) return false;
      if (term) {
        const matchesText =
          row.companyName.toLowerCase().includes(term) ||
          row.customerName.toLowerCase().includes(term) ||
          row.estimationNo.toLowerCase().includes(term) ||
          row.recordId.toLowerCase().includes(term) ||
          (row.technicianName?.toLowerCase().includes(term) ?? false);
        if (!matchesText && !(seq !== null && row.seq === seq)) return false;
      }
      return true;
    });
  }, [recordsList, status, search]);

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
        title="Project Management"
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
                New Project
              </Button>
            )}
          </div>
        }
      />

      <div className="border-border bg-card/40 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground font-medium">
            Total Projects
          </span>
          <span className="text-foreground font-bold">{stats.ALL}</span>
        </div>
        <span className="text-muted-foreground">|</span>
        <div className="flex items-center gap-1">
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            Open
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
            Closed
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
        searchPlaceholder="Search by company, customer or estimation"
      />

      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="overflow-x-auto max-w-full">
          <Table className="min-w-[960px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">S.No</TableHead>
                <TableHead className="w-28">Project ID</TableHead>
                <TableHead className="w-32">Company Name</TableHead>
                <TableHead className="w-28">Customer Name</TableHead>
                <TableHead className="w-36">Email</TableHead>
                <TableHead className="w-28">Mobile No</TableHead>
                <TableHead className="w-36">Assigned Technician</TableHead>
                <TableHead className="w-24 text-center">Status</TableHead>
                <TableHead className="w-28">Location</TableHead>
                <TableHead className="w-20 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-muted-foreground py-10 text-center"
                  >
                    No projects match these filters.
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
                      {row.companyName}
                    </TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {row.mobileNo}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.technicianName ?? "Unassigned"}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge
                        className="justify-center"
                        status={row.status}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.location}
                    </TableCell>
                    <TableCell className="text-right">
                      <RowActions
                        onView={() => setViewRecord(row)}
                        onEdit={() => setEditRecord(row)}
                        onHistory={() => setHistoryRecord(row)}
                        deletion={
                          isAdmin
                            ? {
                                label: row.recordId,
                                onConfirm: () => deleteProject({ id: row.id }),
                                onDeleted: () => {
                                  setRecordsList((prev) =>
                                    prev.filter((r) => r.id !== row.id),
                                  );
                                  setViewRecord((prev) =>
                                    prev?.id === row.id ? undefined : prev,
                                  );
                                  router.refresh();
                                },
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
          projects
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
        <ProjectFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          viewerRole={viewerRole}
          technicians={technicians}
          onSuccess={handleSaveSuccess}
        />
      )}

      <ProjectFormDialog
        key={`${editRecord?.id ?? "edit"}-${editRecord?.updatedAt ? new Date(editRecord.updatedAt).getTime() : ""}`}
        open={Boolean(editRecord)}
        onOpenChange={(open) => !open && setEditRecord(undefined)}
        viewerRole={viewerRole}
        technicians={technicians}
        record={editRecord}
        onSuccess={handleSaveSuccess}
      />

      <ProjectDetailsDialog
        open={Boolean(viewRecord)}
        onOpenChange={(open) => !open && setViewRecord(undefined)}
        record={viewRecord}
      />

      <LogRequestDialog
        open={logRequestOpen}
        onOpenChange={setLogRequestOpen}
        workType="PROJECT"
        selectableTickets={(recordsList ?? [])
          .filter((r) => r && r.status !== "CLOSED")
          .map((r) => ({
            id: r.id,
            seq: r.seq,
            recordId: r.recordId,
            customerName: r.customerName,
            phone: r.mobileNo,
            email: r.email,
            category: r.companyName,
            address: r.location,
            status: r.status,
            assignedTechnicianId: r.assignedTechnicianId,
            assignedTechnicianIds: r.assignedTechnicianIds,
            technicianName: r.technicianName,
            technicianNames: r.technicianNames,
          }))}
        technicians={technicians}
        onSuccess={() => router.refresh()}
      />

      <WorkHistoryDialog
        key={historyRecord?.id ?? "history"}
        open={Boolean(historyRecord)}
        onOpenChange={(open) => !open && setHistoryRecord(undefined)}
        workType="PROJECT"
        record={
          historyRecord
            ? {
                id: historyRecord.id,
                recordId: historyRecord.recordId,
                customerName: historyRecord.customerName,
                phone: historyRecord.mobileNo,
                category: historyRecord.companyName,
                address: historyRecord.location,
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

export { ProjectView };
