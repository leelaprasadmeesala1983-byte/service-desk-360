"use client";

import {
  BarChart3,
  Calendar,
  CalendarCheck2,
  ClipboardList,
  Download,
  Eye,
  FileSpreadsheet,
  FolderKanban,
  Loader2,
  RefreshCw,
  Search,
  Users,
  Wrench,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  TechnicianMonthlySummaryItem,
  TechnicianMonthlySummaryReport,
} from "@/db/queries/technician-reports";
import {
  fetchMonthlyTechnicianSummary,
  fetchTechnicianDetailedReport,
} from "@/lib/actions/technician-reports";
import {
  exportMonthlyTechnicianSummaryPdf,
  exportTechnicianDetailedPdf,
} from "@/lib/export-technician-report-pdf";
import type { CurrentUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { TechnicianDetailsDialog } from "./technician-details-dialog";

const MONTH_OPTIONS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

interface TechnicianReportsViewProps {
  initialReport: TechnicianMonthlySummaryReport;
  user: CurrentUser;
  techniciansList: { id: string; name: string; department: string | null }[];
}

export function TechnicianReportsView({
  initialReport,
  user,
  techniciansList,
}: TechnicianReportsViewProps) {
  const [report, setReport] =
    useState<TechnicianMonthlySummaryReport>(initialReport);
  const [month, setMonth] = useState<string>(String(initialReport.month));
  const [year, setYear] = useState<string>(String(initialReport.year));
  const [technicianFilter, setTechnicianFilter] = useState<string>(
    user.role === "TECHNICIAN" ? user.id : "ALL",
  );
  const [workTypeFilter, setWorkTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  // Individual Technician detail dialog state
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [selectedTechName, setSelectedTechName] = useState<string>("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [exportingTechId, setExportingTechId] = useState<string | null>(null);

  const currentYearNumber = new Date().getFullYear();
  const yearOptions = [
    currentYearNumber + 1,
    currentYearNumber,
    currentYearNumber - 1,
    currentYearNumber - 2,
    currentYearNumber - 3,
  ].map((y) => ({ value: String(y), label: String(y) }));

  const loadReport = (
    targetMonth: string = month,
    targetYear: string = year,
    targetTech: string = technicianFilter,
    targetWorkType: string = workTypeFilter,
  ) => {
    startTransition(async () => {
      const res = await fetchMonthlyTechnicianSummary({
        month: Number(targetMonth),
        year: Number(targetYear),
        technicianId: targetTech,
        workType: targetWorkType,
      });

      if (res.ok && res.data) {
        setReport(res.data);
      } else {
        toast.error("Failed to load technician report.");
      }
    });
  };

  const handleMonthChange = (newMonth: string | null) => {
    if (!newMonth) return;
    setMonth(newMonth);
    loadReport(newMonth, year, technicianFilter, workTypeFilter);
  };

  const handleYearChange = (newYear: string | null) => {
    if (!newYear) return;
    setYear(newYear);
    loadReport(month, newYear, technicianFilter, workTypeFilter);
  };

  const handleTechChange = (newTech: string | null) => {
    if (!newTech) return;
    setTechnicianFilter(newTech);
    loadReport(month, year, newTech, workTypeFilter);
  };

  const handleWorkTypeChange = (newType: string | null) => {
    if (!newType) return;
    setWorkTypeFilter(newType);
    loadReport(month, year, technicianFilter, newType);
  };

  const handleResetFilters = () => {
    const defaultMonth = String(new Date().getMonth() + 1);
    const defaultYear = String(new Date().getFullYear());
    const defaultTech = user.role === "TECHNICIAN" ? user.id : "ALL";
    const defaultType = "ALL";

    setMonth(defaultMonth);
    setYear(defaultYear);
    setTechnicianFilter(defaultTech);
    setWorkTypeFilter(defaultType);
    setSearchQuery("");

    loadReport(defaultMonth, defaultYear, defaultTech, defaultType);
  };

  const filteredTechnicians = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return report.technicians;
    return report.technicians.filter(
      (t) =>
        t.technicianName.toLowerCase().includes(q) ||
        (t.department && t.department.toLowerCase().includes(q)) ||
        t.email.toLowerCase().includes(q),
    );
  }, [report.technicians, searchQuery]);

  const handleOpenDetails = (tech: TechnicianMonthlySummaryItem) => {
    setSelectedTechId(tech.technicianId);
    setSelectedTechName(tech.technicianName);
    setDetailsOpen(true);
  };

  const handleExportIndividualPdf = async (
    tech: TechnicianMonthlySummaryItem,
  ) => {
    try {
      setExportingTechId(tech.technicianId);
      const res = await fetchTechnicianDetailedReport({
        technicianId: tech.technicianId,
        month: Number(month),
        year: Number(year),
      });

      if (res.ok && res.data) {
        exportTechnicianDetailedPdf(res.data);
        toast.success(`Exported report for ${tech.technicianName}`);
      } else {
        toast.error("Failed to generate PDF.");
      }
    } catch {
      toast.error("Failed to generate PDF.");
    } finally {
      setExportingTechId(null);
    }
  };

  const handleExportSummaryPdf = () => {
    if (report) {
      exportMonthlyTechnicianSummaryPdf(report);
      toast.success("Exported monthly technician summary PDF");
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Page Header */}
      <PageHeader
        title="Technician Work & Productivity Reports"
        action={
          <Button
            onClick={handleExportSummaryPdf}
            variant="outline"
            className="gap-2 font-semibold shadow-sm"
            disabled={isPending || report.technicians.length === 0}
          >
            <Download className="size-4" />
            Export Monthly Summary PDF
          </Button>
        }
      />

      {/* Filter Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Month:
            </span>
            <Select value={month} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Year:
            </span>
            <Select value={year} onValueChange={handleYearChange}>
              <SelectTrigger className="w-[100px] h-9 text-xs">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Technician Selector (Admin can select any; Technician is locked) */}
          {user.role === "ADMIN" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Technician:
              </span>
              <Select value={technicianFilter} onValueChange={handleTechChange}>
                <SelectTrigger className="w-[170px] h-9 text-xs">
                  <SelectValue placeholder="All Technicians" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Technicians</SelectItem>
                  {techniciansList.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.name}{" "}
                      {tech.department ? `(${tech.department})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Work Type Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
              Work Type:
            </span>
            <Select value={workTypeFilter} onValueChange={handleWorkTypeChange}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="All Work Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Work Types</SelectItem>
                <SelectItem value="PROJECT">Projects</SelectItem>
                <SelectItem value="INSTALLATION">Installations</SelectItem>
                <SelectItem value="SERVICE">Services</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetFilters}
            className="h-9 text-xs font-medium text-muted-foreground hover:text-foreground ml-auto"
            title="Reset to default"
          >
            <RefreshCw
              className={cn("size-3.5 mr-1.5", isPending && "animate-spin")}
            />
            Reset
          </Button>
        </div>

        {/* Search Input for Technicians Table */}
        <div className="relative max-w-sm pt-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search technician by name or department..."
            className="h-8.5 rounded-md pl-8.5 text-xs bg-muted/20"
          />
        </div>
      </div>

      {/* Summary KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Technicians</span>
            <Users className="size-4 text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {report.stats.totalTechnicians}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5">
            {report.stats.activeTechnicians} Active
          </span>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium text-primary">
              Total Worked Days
            </span>
            <CalendarCheck2 className="size-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-primary">
            {report.stats.totalWorkedDays}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5">
            Unique calendar dates
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Project Work Days</span>
            <FolderKanban className="size-4 text-blue-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {report.stats.projectWorkDays}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5">
            Unique dates on projects
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Installation Days</span>
            <ClipboardList className="size-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {report.stats.installationWorkDays}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5">
            Unique dates on installations
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Service Days</span>
            <Wrench className="size-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {report.stats.serviceWorkDays}
          </div>
          <span className="text-[11px] text-muted-foreground mt-0.5">
            Unique dates on service requests
          </span>
        </div>
      </div>

      {/* Main Monthly Summary Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="w-12 text-center">S.No</TableHead>
                <TableHead className="w-64">Technician</TableHead>
                <TableHead className="w-40">Department</TableHead>
                <TableHead className="w-32 text-center">Project Days</TableHead>
                <TableHead className="w-32 text-center">
                  Installation Days
                </TableHead>
                <TableHead className="w-32 text-center">Service Days</TableHead>
                <TableHead className="w-36 text-center font-bold">
                  Total Worked Days
                </TableHead>
                <TableHead className="w-28 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Loader2 className="size-6 animate-spin text-primary" />
                      <span className="text-xs">
                        Updating technician report data...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredTechnicians.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="py-12 text-center text-xs text-muted-foreground"
                  >
                    No technician records match your filter criteria for this
                    period.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTechnicians.map((tech, index) => {
                  const isExportingThis = exportingTechId === tech.technicianId;

                  return (
                    <TableRow
                      key={tech.technicianId}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <TableCell className="text-center text-muted-foreground text-xs">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground text-xs">
                          {tech.technicianName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {tech.email}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {tech.department || "—"}
                      </TableCell>
                      <TableCell className="text-center text-xs font-medium text-foreground">
                        {tech.projectDays > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-semibold">
                            {tech.projectDays} d
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs font-medium text-foreground">
                        {tech.installationDays > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-semibold">
                            {tech.installationDays} d
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs font-medium text-foreground">
                        {tech.serviceDays > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-semibold">
                            {tech.serviceDays} d
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {tech.totalWorkedDays}{" "}
                          {tech.totalWorkedDays === 1 ? "day" : "days"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleOpenDetails(tech)}
                            title="View Technician Detailed Report"
                            className="size-8"
                          >
                            <Eye className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleExportIndividualPdf(tech)}
                            title="Export Detailed PDF"
                            className="size-8 text-primary hover:text-primary"
                            disabled={isExportingThis}
                          >
                            {isExportingThis ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Download className="size-3.5" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Technician Detailed Report Dialog */}
      <TechnicianDetailsDialog
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        technicianId={selectedTechId}
        technicianName={selectedTechName}
        month={Number(month)}
        year={Number(year)}
      />
    </div>
  );
}
