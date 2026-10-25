"use client";

import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  FolderKanban,
  HardHat,
  Mail,
  MapPin,
  PackageCheck,
  PackageOpen,
  Phone,
  Printer,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/service-tickets/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  CustomerDetailedReportData,
  RecordDetailReport,
} from "@/db/queries/customer-reports";
import { SERVICE_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { printCustomer360 } from "@/lib/utils/print-customer-360";

type Customer360DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CustomerDetailedReportData | null;
  loading?: boolean;
};

export function Customer360Dialog({
  open,
  onOpenChange,
  data,
  loading = false,
}: Customer360DialogProps) {
  // Module Tab state: Service selected by default as required
  const [activeModule, setActiveModule] = useState<
    "services" | "installations" | "projects"
  >("services");

  // Record selection state when multiple records exist in the active module
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Records ticked in the selector for a combined print (2+ => one page)
  const [printIds, setPrintIds] = useState<string[]>([]);

  // Tab state for work history vs manpower summary
  const [historyTab, setHistoryTab] = useState<"all" | "history" | "manpower">(
    "all",
  );

  // Sync selected record when module changes or data loads
  useEffect(() => {
    setPrintIds([]);
    if (!data) {
      setSelectedRecordId(null);
      return;
    }
    const currentList =
      activeModule === "services"
        ? data.services
        : activeModule === "installations"
          ? data.installations
          : data.projects;

    if (currentList && currentList.length > 0) {
      setSelectedRecordId(currentList[0].id);
    } else {
      setSelectedRecordId(null);
    }
  }, [activeModule, data]);

  if (!data && !loading) return null;

  const c = data?.customer;

  const currentRecords: RecordDetailReport[] =
    activeModule === "services"
      ? data?.services || []
      : activeModule === "installations"
        ? data?.installations || []
        : data?.projects || [];

  const selectedRecord =
    currentRecords.find((r) => r.id === selectedRecordId) ||
    currentRecords[0] ||
    null;

  const togglePrintId = (id: string) =>
    setPrintIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const handlePrint = () => {
    if (!data || !selectedRecord) return;
    const chosen =
      printIds.length >= 2
        ? currentRecords.filter((r) => printIds.includes(r.id))
        : [selectedRecord];
    printCustomer360(
      data.customer,
      [{ module: activeModule, records: chosen }],
      chosen.length >= 2,
      () => toast.error("Allow pop-ups to print."),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* 1. Customer Details Header */}
        <DialogHeader className="p-5 border-b border-border bg-card/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 shrink-0">
                {c?.customerName?.charAt(0)?.toUpperCase() || "C"}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>{c?.customerName || "Customer 360"}</span>
                  {c?.companyName && (
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Building2 className="size-3" />
                      {c.companyName}
                    </span>
                  )}
                </DialogTitle>
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Phone className="size-3 text-primary" />
                    {c?.mobileNumber && c.mobileNumber !== "—"
                      ? c.mobileNumber
                      : "—"}
                  </span>
                  {c?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="size-3 text-primary" />
                      {c.email}
                    </span>
                  )}
                  {c?.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 text-primary" />
                      {c.address}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {c && selectedRecord && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="gap-1.5 sm:mr-8"
              >
                <Printer className="size-4" />
                Print
                {printIds.length >= 2 ? ` (${printIds.length} records)` : ""}
              </Button>
            )}
          </div>

          {/* Quick Module Counts Bar */}
          {c && (
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/60 text-xs">
              <button
                type="button"
                onClick={() => setActiveModule("services")}
                className={cn(
                  "rounded-lg p-2.5 border text-left transition-colors flex items-center justify-between",
                  activeModule === "services"
                    ? "bg-blue-500/10 border-blue-500/40"
                    : "bg-background/80 border-border hover:bg-muted/50",
                )}
              >
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <Wrench className="size-3.5 text-blue-600 dark:text-blue-400" />
                  Total Services
                </span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                  {c.servicesCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModule("installations")}
                className={cn(
                  "rounded-lg p-2.5 border text-left transition-colors flex items-center justify-between",
                  activeModule === "installations"
                    ? "bg-emerald-500/10 border-emerald-500/40"
                    : "bg-background/80 border-border hover:bg-muted/50",
                )}
              >
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <ClipboardList className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  Total Installations
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {c.installationsCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveModule("projects")}
                className={cn(
                  "rounded-lg p-2.5 border text-left transition-colors flex items-center justify-between",
                  activeModule === "projects"
                    ? "bg-purple-500/10 border-purple-500/40"
                    : "bg-background/80 border-border hover:bg-muted/50",
                )}
              >
                <span className="text-muted-foreground flex items-center gap-1.5 font-medium">
                  <FolderKanban className="size-3.5 text-purple-600 dark:text-purple-400" />
                  Total Projects
                </span>
                <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                  {c.projectsCount}
                </span>
              </button>
            </div>
          )}
        </DialogHeader>

        {/* 2. Three Module Tabs Navigation */}
        <div className="flex border-b border-border bg-muted/30 px-5 gap-2 overflow-x-auto text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveModule("services")}
            className={cn(
              "py-2.5 px-3.5 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
              activeModule === "services"
                ? "border-primary text-primary bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Wrench className="size-3.5" />
            Service ({data?.services.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveModule("installations")}
            className={cn(
              "py-2.5 px-3.5 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
              activeModule === "installations"
                ? "border-primary text-primary bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <ClipboardList className="size-3.5" />
            Installation ({data?.installations.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveModule("projects")}
            className={cn(
              "py-2.5 px-3.5 font-semibold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap",
              activeModule === "projects"
                ? "border-primary text-primary bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <FolderKanban className="size-3.5" />
            Project ({data?.projects.length || 0})
          </button>
        </div>

        {/* 3. Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading && (
            <div className="py-16 text-center text-muted-foreground text-sm animate-pulse">
              Loading Customer 360 detailed report...
            </div>
          )}

          {!loading && currentRecords.length === 0 && (
            <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl p-8">
              <PackageOpen className="size-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-foreground">
                No{" "}
                {activeModule === "services"
                  ? "service requests"
                  : activeModule === "installations"
                    ? "installations"
                    : "projects"}{" "}
                found for this customer.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                There are no active or completed records logged under this
                module.
              </p>
            </div>
          )}

          {!loading && currentRecords.length > 0 && selectedRecord && (
            <>
              {/* Multi-Record Selector if customer has multiple tickets */}
              {currentRecords.length > 1 && (
                <div className="bg-muted/40 border border-border rounded-lg p-2.5 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-muted-foreground mr-1">
                    Select Record ({currentRecords.length}):
                  </span>
                  {currentRecords.map((r) => (
                    <div
                      key={r.id}
                      className={cn(
                        "rounded-md font-mono text-xs transition-colors border flex items-center",
                        r.id === selectedRecord.id
                          ? "bg-primary text-primary-foreground border-primary shadow-xs font-bold"
                          : "bg-card text-foreground border-border hover:bg-muted",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={printIds.includes(r.id)}
                        onChange={() => togglePrintId(r.id)}
                        aria-label={`Include ${r.recordId} in combined print`}
                        className="ml-2 size-3.5 cursor-pointer accent-current"
                      />
                      <button
                        type="button"
                        onClick={() => setSelectedRecordId(r.id)}
                        className="px-2.5 py-1.5 flex items-center gap-1.5"
                      >
                        <span>{r.recordId}</span>
                        <span className="text-[10px] opacity-80">
                          ({r.status})
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Record Summary Card */}
              <div className="border border-border bg-card rounded-xl p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                      {selectedRecord.recordId}
                    </span>
                    <h3 className="font-semibold text-sm text-foreground">
                      {selectedRecord.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={selectedRecord.status} />
                    {selectedRecord.amount && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-foreground">
                        {formatCurrency(selectedRecord.amount)}
                      </span>
                    )}
                  </div>
                </div>

                {selectedRecord.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {selectedRecord.description}
                  </p>
                )}

                {/* Key Field Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                  <div className="border border-border/60 rounded-lg p-2.5 bg-muted/20">
                    <span className="text-[11px] text-muted-foreground block mb-0.5">
                      Work Location
                    </span>
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <MapPin className="size-3 text-primary shrink-0" />
                      <span className="truncate">
                        {selectedRecord.workLocation}
                      </span>
                    </span>
                  </div>

                  <div className="border border-border/60 rounded-lg p-2.5 bg-muted/20">
                    <span className="text-[11px] text-muted-foreground block mb-0.5">
                      Assigned Technicians
                    </span>
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Users className="size-3 text-primary shrink-0" />
                      <span className="truncate">
                        {selectedRecord.assignedTechniciansDisplay}
                      </span>
                    </span>
                  </div>

                  <div className="border border-border/60 rounded-lg p-2.5 bg-muted/20">
                    <span className="text-[11px] text-muted-foreground block mb-0.5">
                      Creation Date
                    </span>
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Calendar className="size-3 text-primary shrink-0" />
                      <span>{formatDate(selectedRecord.creationDate)}</span>
                    </span>
                  </div>

                  <div className="border border-border/60 rounded-lg p-2.5 bg-muted/20">
                    <span className="text-[11px] text-muted-foreground block mb-0.5">
                      Elapsed Duration
                    </span>
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <Clock className="size-3 text-primary shrink-0" />
                      <span>{selectedRecord.totalElapsedDuration}</span>
                    </span>
                  </div>
                </div>

                {/* Additional optional fields based on module schema */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pt-1">
                  {selectedRecord.category && (
                    <span>
                      Category:{" "}
                      <strong className="text-foreground">
                        {SERVICE_CATEGORY_LABELS[
                          selectedRecord.category as keyof typeof SERVICE_CATEGORY_LABELS
                        ] || selectedRecord.category}
                      </strong>
                    </span>
                  )}
                  {selectedRecord.accountUsername && (
                    <span>
                      Account:{" "}
                      <strong className="text-foreground font-mono">
                        {selectedRecord.accountUsername}
                      </strong>
                    </span>
                  )}
                  {selectedRecord.referenceNo && (
                    <span>
                      Reference No:{" "}
                      <strong className="text-foreground font-mono">
                        {selectedRecord.referenceNo}
                      </strong>
                    </span>
                  )}
                  {selectedRecord.estimationNo && (
                    <span>
                      Estimation No:{" "}
                      <strong className="text-foreground font-mono">
                        {selectedRecord.estimationNo}
                      </strong>
                    </span>
                  )}
                  {selectedRecord.latestProgress && (
                    <span>
                      Progress:{" "}
                      <strong className="text-foreground">
                        {selectedRecord.latestProgress}
                      </strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Sub-navigation tabs: All Details | Work History | Manpower Summary */}
              <div className="flex items-center gap-1.5 border-b border-border/80 pb-2 text-xs">
                <button
                  type="button"
                  onClick={() => setHistoryTab("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition-all text-xs",
                    historyTab === "all"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  All Details
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab("history")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition-all text-xs flex items-center gap-1.5",
                    historyTab === "history"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <Calendar className="size-3.5" />
                  Day-by-Day Work History (
                  {selectedRecord.dayByDayWorkHistory.length})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab("manpower")}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-medium transition-all text-xs flex items-center gap-1.5",
                    historyTab === "manpower"
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                  )}
                >
                  <HardHat className="size-3.5" />
                  Manpower Summary (
                  {selectedRecord.manpowerSummary.uniqueTechnicians})
                </button>
              </div>

              {/* 4. DAY-BY-DAY WORK HISTORY */}
              {(historyTab === "all" || historyTab === "history") && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Calendar className="size-3.5 text-primary" />
                      Day-by-Day Work History (
                      {selectedRecord.dayByDayWorkHistory.length})
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      Chronological work entries
                    </span>
                  </div>

                  <div className="border border-border rounded-xl overflow-hidden bg-card">
                    <div className="overflow-x-auto">
                      <Table className="text-xs">
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="w-36 font-bold">
                              Date
                            </TableHead>
                            <TableHead className="font-bold">
                              Description
                            </TableHead>
                            <TableHead className="w-56 font-bold">
                              Technician
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRecord.dayByDayWorkHistory.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                className="text-center py-8 text-muted-foreground"
                              >
                                No work logs have been submitted for this record
                                yet.
                              </TableCell>
                            </TableRow>
                          ) : (
                            selectedRecord.dayByDayWorkHistory.map((day) => (
                              <TableRow
                                key={day.id}
                                className="hover:bg-muted/30"
                              >
                                <TableCell className="font-mono whitespace-nowrap text-foreground font-medium align-top">
                                  {formatDate(day.date)}
                                </TableCell>
                                <TableCell className="text-foreground break-words leading-relaxed">
                                  {day.description || day.workCompleted}
                                </TableCell>
                                <TableCell className="align-top">
                                  {day.technicianNames &&
                                  day.technicianNames.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {day.technicianNames.map((name, idx) => (
                                        <Badge
                                          key={idx}
                                          variant="secondary"
                                          className="font-normal text-xs px-2 py-0.5 bg-muted/80 text-foreground border border-border/60"
                                        >
                                          {name}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground font-mono">
                                      —
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              {/* 5. MANPOWER SUMMARY */}
              {(historyTab === "all" || historyTab === "manpower") && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <HardHat className="size-3.5 text-primary" />
                      Manpower Summary
                    </h4>
                    <span className="text-[11px] text-muted-foreground">
                      Aggregated technician workload & metrics
                    </span>
                  </div>

                  {/* 4 Summary Metric Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {/* Card 1: Total Working Days */}
                    <div className="rounded-xl border border-border bg-card p-3 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Total Working Days
                        </span>
                        <div className="size-6 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                          <Calendar className="size-3.5" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-lg sm:text-xl font-bold text-foreground font-mono">
                          {selectedRecord.manpowerSummary.totalWorkingDays}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Distinct work dates
                        </p>
                      </div>
                    </div>

                    {/* Card 2: Total Man-Days */}
                    <div className="rounded-xl border border-border bg-card p-3 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Total Man-Days
                        </span>
                        <div className="size-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <Users className="size-3.5" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          {selectedRecord.manpowerSummary.totalManDays}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Technician-day total
                        </p>
                      </div>
                    </div>

                    {/* Card 3: Total Technician Assignments */}
                    <div className="rounded-xl border border-border bg-card p-3 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Total Assignments
                        </span>
                        <div className="size-6 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                          <ClipboardList className="size-3.5" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400 font-mono">
                          {
                            selectedRecord.manpowerSummary
                              .totalTechnicianAssignments
                          }
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Work entry assignments
                        </p>
                      </div>
                    </div>

                    {/* Card 4: Unique Technicians */}
                    <div className="rounded-xl border border-border bg-card p-3 shadow-2xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          Unique Technicians
                        </span>
                        <div className="size-6 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                          <HardHat className="size-3.5" />
                        </div>
                      </div>
                      <div className="mt-2">
                        <div className="text-lg sm:text-xl font-bold text-primary font-mono">
                          {selectedRecord.manpowerSummary.uniqueTechnicians}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Distinct technicians
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Technician-Wise Summary Table */}
                  <div className="border border-border rounded-xl overflow-hidden bg-card">
                    <div className="overflow-x-auto">
                      <Table className="text-xs">
                        <TableHeader className="bg-muted/40">
                          <TableRow>
                            <TableHead className="font-bold">
                              Technician Name
                            </TableHead>
                            <TableHead className="font-bold text-right w-32">
                              Working Days
                            </TableHead>
                            <TableHead className="font-bold text-right w-28">
                              Man-Days
                            </TableHead>
                            <TableHead className="font-bold text-right w-28">
                              Assignments
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRecord.manpowerSummary.technicians.length ===
                          0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={4}
                                className="text-center py-6 text-muted-foreground"
                              >
                                No technician work records logged for this
                                period.
                              </TableCell>
                            </TableRow>
                          ) : (
                            selectedRecord.manpowerSummary.technicians.map(
                              (tech) => (
                                <TableRow
                                  key={tech.technicianId}
                                  className="hover:bg-muted/30"
                                >
                                  <TableCell className="font-medium text-foreground">
                                    <div className="flex items-center gap-2">
                                      <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {tech.technicianName
                                          .charAt(0)
                                          .toUpperCase()}
                                      </div>
                                      <span>{tech.technicianName}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-foreground font-semibold">
                                    {tech.workingDays}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                    {tech.manDays}
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                      {tech.assignments}
                                    </span>
                                  </TableCell>
                                </TableRow>
                              ),
                            )
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}

              {/* 6. CLOSURE SUMMARY */}
              {historyTab === "all" && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    {selectedRecord.closureSummary.isClosed ? (
                      <>
                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        Closure Summary
                      </>
                    ) : (
                      <>
                        <Clock className="size-3.5 text-blue-600 dark:text-blue-400" />
                        Status & Lifecycle Summary
                      </>
                    )}
                  </h4>

                  {selectedRecord.closureSummary.isClosed ? (
                    <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl p-4 text-xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-500/20 pb-2.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-bold text-emerald-900 dark:text-emerald-200">
                            Ticket Successfully Closed
                          </span>
                        </div>
                        <span className="text-emerald-700 dark:text-emerald-300 font-mono text-[11px]">
                          Closed on:{" "}
                          {formatDate(
                            selectedRecord.closureSummary.actualClosureDate,
                          )}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[11px] text-muted-foreground block">
                            Actual Work Start Date
                          </span>
                          <span className="font-semibold text-foreground">
                            {selectedRecord.closureSummary.actualWorkStartDate
                              ? formatDate(
                                  selectedRecord.closureSummary
                                    .actualWorkStartDate,
                                )
                              : "—"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] text-muted-foreground block">
                            Actual Closure Date
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatDate(
                              selectedRecord.closureSummary.actualClosureDate,
                            )}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] text-muted-foreground block">
                            Calendar Duration
                          </span>
                          <span className="font-semibold text-foreground">
                            {selectedRecord.closureSummary
                              .totalCalendarDuration || "—"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] text-muted-foreground block">
                            Total Days Worked
                          </span>
                          <span className="font-semibold text-foreground">
                            {selectedRecord.closureSummary.totalDaysWorked} days
                          </span>
                        </div>
                      </div>

                      {selectedRecord.closureSummary.finalCompletionNotes && (
                        <div className="pt-2 border-t border-emerald-500/20">
                          <span className="text-[11px] text-muted-foreground block mb-0.5">
                            Final Completion Notes:
                          </span>
                          <p className="text-foreground italic">
                            "
                            {selectedRecord.closureSummary.finalCompletionNotes}
                            "
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="border border-blue-500/20 bg-blue-500/5 rounded-xl p-4 text-xs space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-500/20 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Clock className="size-4 text-blue-600 dark:text-blue-400" />
                          <span className="font-bold text-blue-900 dark:text-blue-200">
                            Ticket In Progress / Open
                          </span>
                        </div>
                        <StatusBadge status={selectedRecord.status} />
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-[11px] text-muted-foreground block">
                            Actual Work Start Date
                          </span>
                          <span className="font-semibold text-foreground">
                            {selectedRecord.closureSummary.actualWorkStartDate
                              ? formatDate(
                                  selectedRecord.closureSummary
                                    .actualWorkStartDate,
                                )
                              : "No work logged yet"}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] text-muted-foreground block">
                            Current Status
                          </span>
                          <span className="font-semibold text-foreground">
                            {selectedRecord.status}
                          </span>
                        </div>

                        <div>
                          <span className="text-[11px] text-muted-foreground block">
                            Elapsed Duration
                          </span>
                          <span className="font-semibold text-foreground">
                            {selectedRecord.closureSummary.elapsedDuration}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
