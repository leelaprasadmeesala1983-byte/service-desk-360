"use client";

import {
  Calendar,
  CalendarCheck2,
  ClipboardList,
  Download,
  FolderKanban,
  Loader2,
  Wrench,
} from "lucide-react";
import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/service-tickets/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TechnicianDetailedReport } from "@/db/queries/technician-reports";
import { fetchTechnicianDetailedReport } from "@/lib/actions/technician-reports";
import type { RecordStatus } from "@/lib/constants";
import { exportTechnicianDetailedPdf } from "@/lib/export-technician-report-pdf";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

interface TechnicianDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  technicianId: string | null;
  technicianName?: string;
  month: number;
  year: number;
}

export function TechnicianDetailsDialog({
  open,
  onOpenChange,
  technicianId,
  technicianName,
  month,
  year,
}: TechnicianDetailsDialogProps) {
  const [report, setReport] = useState<TechnicianDetailedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "projects" | "installations" | "services"
  >("projects");

  useEffect(() => {
    if (!open || !technicianId) return;

    let isMounted = true;
    async function loadReport() {
      setLoading(true);
      const res = await fetchTechnicianDetailedReport({
        technicianId: technicianId!,
        month,
        year,
      });

      if (isMounted) {
        if (res.ok && res.data) {
          setReport(res.data);
          // Set active tab to the first one that has data
          if (res.data.projects.length > 0) setActiveTab("projects");
          else if (res.data.installations.length > 0)
            setActiveTab("installations");
          else if (res.data.services.length > 0) setActiveTab("services");
          else setActiveTab("projects");
        } else {
          setReport(null);
        }
        setLoading(false);
      }
    }

    void loadReport();
    return () => {
      isMounted = false;
    };
  }, [open, technicianId, month, year]);

  const monthLabel = MONTH_NAMES[month - 1] || `Month ${month}`;

  const handleExportPdf = () => {
    if (report) {
      exportTechnicianDetailedPdf(report);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <span>
                  {report?.technician.name ||
                    technicianName ||
                    "Technician Work Report"}
                </span>
                {report?.technician.department && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {report.technician.department}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Productivity & Work Days Breakdown for{" "}
                <span className="font-semibold text-foreground">
                  {monthLabel} {year}
                </span>
              </DialogDescription>
            </div>

            {report && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                className="shrink-0 gap-1.5 h-8 text-xs font-semibold"
              >
                <Download className="size-3.5" />
                Export PDF
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="text-xs">
              Loading technician productivity details...
            </span>
          </div>
        ) : !report ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No work records found for this technician in {monthLabel} {year}.
          </div>
        ) : (
          <div className="space-y-5 pt-2">
            {/* Summary Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] font-medium">Total Worked</span>
                  <CalendarCheck2 className="size-4 text-primary" />
                </div>
                <div className="mt-2 text-2xl font-bold text-primary">
                  {report.summary.totalWorkedDays}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    days
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  Unique calendar dates
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] font-medium">Project Work</span>
                  <FolderKanban className="size-4 text-blue-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground">
                  {report.summary.projectDays}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    days
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {report.projects.length} project tasks
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] font-medium">
                    Installation Work
                  </span>
                  <ClipboardList className="size-4 text-emerald-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground">
                  {report.summary.installationDays}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    days
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {report.installations.length} installations
                </span>
              </div>

              <div className="rounded-xl border border-border bg-card p-3.5 flex flex-col justify-between">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="text-[11px] font-medium">
                    Service Requests
                  </span>
                  <Wrench className="size-4 text-amber-500" />
                </div>
                <div className="mt-2 text-2xl font-bold text-foreground">
                  {report.summary.serviceDays}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    days
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  {report.services.length} service tickets
                </span>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="flex border-b border-border">
              <button
                type="button"
                onClick={() => setActiveTab("projects")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px",
                  activeTab === "projects"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <FolderKanban className="size-3.5" />
                <span>Projects ({report.projects.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("installations")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px",
                  activeTab === "installations"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <ClipboardList className="size-3.5" />
                <span>Installations ({report.installations.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("services")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors -mb-px",
                  activeTab === "services"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Wrench className="size-3.5" />
                <span>Services ({report.services.length})</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {activeTab === "projects" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 font-medium text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-2.5">ID</th>
                        <th className="px-4 py-2.5">Company / Title</th>
                        <th className="px-4 py-2.5">Customer</th>
                        <th className="px-4 py-2.5">Work Date Span</th>
                        <th className="px-4 py-2.5 text-center">Worked Days</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.projects.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-muted-foreground"
                          >
                            No project work recorded for {monthLabel} {year}.
                          </td>
                        </tr>
                      ) : (
                        report.projects.map((prj) => (
                          <tr
                            key={prj.referenceId}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-2.5 font-mono font-semibold text-primary">
                              {prj.recordId}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-foreground max-w-[200px] truncate">
                              {prj.title}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {prj.customerName}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                              {prj.firstWorkDate === prj.lastWorkDate
                                ? prj.firstWorkDate
                                : `${prj.firstWorkDate} → ${prj.lastWorkDate}`}
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold text-foreground">
                              {prj.workedDays}{" "}
                              {prj.workedDays === 1 ? "day" : "days"}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <StatusBadge
                                status={prj.status as RecordStatus}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "installations" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 font-medium text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-2.5">ID</th>
                        <th className="px-4 py-2.5">Description</th>
                        <th className="px-4 py-2.5">Customer</th>
                        <th className="px-4 py-2.5">Work Date Span</th>
                        <th className="px-4 py-2.5 text-center">Worked Days</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.installations.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-muted-foreground"
                          >
                            No installation work recorded for {monthLabel}{" "}
                            {year}.
                          </td>
                        </tr>
                      ) : (
                        report.installations.map((ins) => (
                          <tr
                            key={ins.referenceId}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-2.5 font-mono font-semibold text-primary">
                              {ins.recordId}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-foreground max-w-[200px] truncate">
                              {ins.title}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {ins.customerName}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                              {ins.firstWorkDate === ins.lastWorkDate
                                ? ins.firstWorkDate
                                : `${ins.firstWorkDate} → ${ins.lastWorkDate}`}
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold text-foreground">
                              {ins.workedDays}{" "}
                              {ins.workedDays === 1 ? "day" : "days"}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <StatusBadge
                                status={ins.status as RecordStatus}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "services" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/40 font-medium text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-4 py-2.5">ID</th>
                        <th className="px-4 py-2.5">Issue Title</th>
                        <th className="px-4 py-2.5">Customer</th>
                        <th className="px-4 py-2.5">Work Date Span</th>
                        <th className="px-4 py-2.5 text-center">Worked Days</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {report.services.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-muted-foreground"
                          >
                            No service work recorded for {monthLabel} {year}.
                          </td>
                        </tr>
                      ) : (
                        report.services.map((srv) => (
                          <tr
                            key={srv.referenceId}
                            className="hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-2.5 font-mono font-semibold text-primary">
                              {srv.recordId}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-foreground max-w-[200px] truncate">
                              {srv.title}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground">
                              {srv.customerName}
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                              {srv.firstWorkDate === srv.lastWorkDate
                                ? srv.firstWorkDate
                                : `${srv.firstWorkDate} → ${srv.lastWorkDate}`}
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold text-foreground">
                              {srv.workedDays}{" "}
                              {srv.workedDays === 1 ? "day" : "days"}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <StatusBadge
                                status={srv.status as RecordStatus}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
