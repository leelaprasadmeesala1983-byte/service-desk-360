"use client";

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  FolderKanban,
  Loader2,
  RefreshCw,
  Search,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/app-shell/page-header";
import { Customer360Dialog } from "@/components/service-tickets/customer-reports/customer-360-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  Customer360Data,
  CustomerReportResult,
  CustomerRow,
  CustomerSummaryStats,
} from "@/db/queries/customer-reports";
import {
  exportCustomerReportsExcel,
  fetchCustomer360,
  fetchCustomerReports,
} from "@/lib/actions/customer-reports";
import { downloadExcelBase64 } from "@/lib/excel-export";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type CustomerReportsViewProps = {
  initialData: CustomerReportResult;
};

export function CustomerReportsView({ initialData }: CustomerReportsViewProps) {
  const [isPending, startTransition] = useTransition();

  const [stats, setStats] = useState<CustomerSummaryStats>(initialData.stats);
  const [customers, setCustomers] = useState<CustomerRow[]>(
    initialData.customers,
  );
  const [totalRecords, setTotalRecords] = useState(initialData.totalRecords);
  const [page, setPage] = useState(initialData.page);
  const [perPage, setPerPage] = useState(initialData.perPage);
  const [totalPages, setTotalPages] = useState(initialData.totalPages);

  // Filter States
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "ALL" | "SERVICES" | "INSTALLATIONS" | "PROJECTS"
  >("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "OPEN" | "IN_PROGRESS" | "CLOSED"
  >("ALL");

  const [isExporting, setIsExporting] = useState(false);

  // Customer 360 modal state
  const [selectedCustomer360, setSelectedCustomer360] =
    useState<Customer360Data | null>(null);
  const [customer360Open, setCustomer360Open] = useState(false);
  const [customer360Loading, setCustomer360Loading] = useState(false);

  const isInitialMount = useRef(true);

  // Debounce search changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Load data on filter or pagination change
  const loadData = (
    newPage = page,
    newPerPage = perPage,
    newSearch = debouncedSearch,
    newType = typeFilter,
    newStatus = statusFilter,
  ) => {
    startTransition(async () => {
      const res = await fetchCustomerReports({
        page: newPage,
        perPage: newPerPage,
        search: newSearch.trim() || undefined,
        type: newType !== "ALL" ? newType : undefined,
        status: newStatus !== "ALL" ? newStatus : undefined,
      });

      if (res.ok && res.data) {
        setStats(res.data.stats);
        setCustomers(res.data.customers);
        setTotalRecords(res.data.totalRecords);
        setPage(res.data.page);
        setPerPage(res.data.perPage);
        setTotalPages(res.data.totalPages);
      } else {
        toast.error("Failed to load customer reports.");
      }
    });
  };

  // Trigger search fetch when debounced search term changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setPage(1);
    loadData(1, perPage, debouncedSearch, typeFilter, statusFilter);
  }, [debouncedSearch]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
  };

  const handleTypeChange = (
    val: "ALL" | "SERVICES" | "INSTALLATIONS" | "PROJECTS",
  ) => {
    setTypeFilter(val);
    setPage(1);
    loadData(1, perPage, debouncedSearch, val, statusFilter);
  };

  const handleStatusChange = (
    val: "ALL" | "OPEN" | "IN_PROGRESS" | "CLOSED",
  ) => {
    setStatusFilter(val);
    setPage(1);
    loadData(1, perPage, debouncedSearch, typeFilter, val);
  };

  const handleResetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
    setPage(1);
    loadData(1, perPage, "", "ALL", "ALL");
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    loadData(newPage, perPage, search, typeFilter, statusFilter);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setPerPage(newPerPage);
    setPage(1);
    loadData(1, newPerPage, search, typeFilter, statusFilter);
  };

  // Open Customer 360
  const handleViewCustomer360 = async (customer: CustomerRow) => {
    setCustomer360Open(true);
    setCustomer360Loading(true);
    setSelectedCustomer360(null);

    try {
      const res = await fetchCustomer360(customer.id);
      if (res.ok && res.data) {
        setSelectedCustomer360(res.data);
      } else {
        toast.error("Failed to load Customer 360 details.");
        setCustomer360Open(false);
      }
    } catch {
      toast.error("An error occurred while loading customer details.");
      setCustomer360Open(false);
    } finally {
      setCustomer360Loading(false);
    }
  };

  // Export to Excel
  const handleExportExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const res = await exportCustomerReportsExcel({
        search: search.trim() || undefined,
        type: typeFilter !== "ALL" ? typeFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
      });

      if (!res.ok) {
        toast.error(res.error || "Failed to export Excel.");
        return;
      }

      downloadExcelBase64(res.data.data, res.data.filename);
      toast.success("Customer reports exported successfully.");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters =
    Boolean(search) || typeFilter !== "ALL" || statusFilter !== "ALL";

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* 1. Page Header */}
      <PageHeader
        title="Customer Reports & Analytics"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={isExporting || totalRecords === 0}
              className="gap-1.5"
            >
              {isExporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="size-4" />
              )}
              Export Excel
            </Button>
          </div>
        }
      />

      {/* 2. Dashboard Summary Cards (4 Metrics) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Customers */}
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Total Customers
            </span>
            <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center">
              <Users className="size-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {stats.totalCustomers}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Unique customer base
            </p>
          </div>
        </div>

        {/* Card 2: Total Services */}
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Total Services
            </span>
            <div className="size-7 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Wrench className="size-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalServices}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Service requests logged
            </p>
          </div>
        </div>

        {/* Card 3: Total Installations */}
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Total Installations
            </span>
            <div className="size-7 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ClipboardList className="size-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {stats.totalInstallations}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Installations recorded
            </p>
          </div>
        </div>

        {/* Card 4: Total Projects */}
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Total Projects
            </span>
            <div className="size-7 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FolderKanban className="size-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.totalProjects}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Projects executed
            </p>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by customer, phone, email..."
              className="h-9 rounded-md pl-8 pr-8 text-xs"
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => handleSearchChange("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-0.5"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Module Type & Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Type Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Module:
              </span>
              <select
                value={typeFilter}
                onChange={(e) =>
                  handleTypeChange(
                    e.target.value as
                      | "ALL"
                      | "SERVICES"
                      | "INSTALLATIONS"
                      | "PROJECTS",
                  )
                }
                className="border border-border bg-background rounded-md px-2.5 py-1.5 text-xs h-9"
              >
                <option value="ALL">All Modules</option>
                <option value="SERVICES">Services Only</option>
                <option value="INSTALLATIONS">Installations Only</option>
                <option value="PROJECTS">Projects Only</option>
              </select>
            </div>

            {/* Status Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                Status:
              </span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  handleStatusChange(
                    e.target.value as "ALL" | "OPEN" | "IN_PROGRESS" | "CLOSED",
                  )
                }
                className="border border-border bg-background rounded-md px-2.5 py-1.5 text-xs h-9"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5"
              >
                <RefreshCw className="size-3.5" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Customer-wise Report Table */}
      <div className="border border-border bg-card overflow-hidden rounded-xl">
        <div className="overflow-x-auto max-w-full">
          <Table className="min-w-[960px] text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">S.No</TableHead>
                <TableHead className="w-48">Customer Name</TableHead>
                <TableHead className="w-36">Mobile Number</TableHead>
                <TableHead className="w-48">Email</TableHead>
                <TableHead className="w-24 text-center">Services</TableHead>
                <TableHead className="w-24 text-center">
                  Installations
                </TableHead>
                <TableHead className="w-24 text-center">Projects</TableHead>
                <TableHead className="w-28 text-center font-bold">
                  Total Requests
                </TableHead>
                <TableHead className="w-36">Last Activity Date</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-muted-foreground py-12 text-center"
                  >
                    <Loader2 className="size-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading customer records...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-muted-foreground py-10 text-center"
                  >
                    No customer records match your filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((c, index) => (
                  <TableRow key={c.id} className="hover:bg-muted/40">
                    <TableCell className="text-muted-foreground text-center">
                      {(page - 1) * perPage + index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <span className="text-foreground font-semibold">
                          {c.customerName}
                        </span>
                        {c.companyName && (
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Building2 className="size-3" />
                            {c.companyName}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground whitespace-nowrap">
                      {c.mobileNumber}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.email || "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full font-semibold text-[11px]",
                          c.servicesCount > 0
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            : "text-muted-foreground",
                        )}
                      >
                        {c.servicesCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full font-semibold text-[11px]",
                          c.installationsCount > 0
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "text-muted-foreground",
                        )}
                      >
                        {c.installationsCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full font-semibold text-[11px]",
                          c.projectsCount > 0
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            : "text-muted-foreground",
                        )}
                      >
                        {c.projectsCount}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="px-2.5 py-1 rounded-md font-bold text-xs bg-primary/10 text-primary border border-primary/20">
                        {c.totalRequests}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {formatDate(c.lastActivityDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewCustomer360(c)}
                        className="h-7 px-2.5 text-xs gap-1 font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                      >
                        <Eye className="size-3.5" />
                        View 360
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 5. Pagination Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="text-muted-foreground">
          Showing {totalRecords === 0 ? 0 : (page - 1) * perPage + 1}–
          {Math.min(page * perPage, totalRecords)} of {totalRecords} customers
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-muted-foreground flex items-center gap-2">
            Per page:
            <select
              value={perPage}
              onChange={(e) => handlePerPageChange(Number(e.target.value))}
              className="border border-border rounded-md px-2 py-1"
            >
              {[10, 20, 50, 100].map((val) => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={page <= 1 || isPending}
              onClick={() => handlePageChange(Math.max(1, page - 1))}
            >
              <ChevronLeft className="size-3.5" />
            </Button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && page > 3) {
                pageNum = page - 2 + i;
                if (pageNum > totalPages) {
                  pageNum = totalPages - 4 + i;
                }
              }
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => handlePageChange(pageNum)}
                  className={cn(
                    "border border-border rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    pageNum === page
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground hover:bg-muted",
                  )}
                >
                  {pageNum}
                </button>
              );
            })}

            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              disabled={page >= totalPages || isPending}
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 6. Customer 360 Dialog */}
      <Customer360Dialog
        open={customer360Open}
        onOpenChange={setCustomer360Open}
        data={selectedCustomer360}
        loading={customer360Loading}
      />
    </div>
  );
}
