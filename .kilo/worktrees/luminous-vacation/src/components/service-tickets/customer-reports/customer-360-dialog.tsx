"use client";

import {
  Activity,
  Building2,
  ClipboardList,
  FolderKanban,
  Mail,
  MapPin,
  Phone,
  User,
  Wrench,
} from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/service-tickets/status-badge";
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
import type { Customer360Data } from "@/db/queries/customer-reports";
import { SERVICE_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Customer360DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: Customer360Data | null;
  loading?: boolean;
};

export function Customer360Dialog({
  open,
  onOpenChange,
  data,
  loading = false,
}: Customer360DialogProps) {
  const [activeTab, setActiveTab] = useState<
    "timeline" | "services" | "installations" | "projects"
  >("timeline");

  if (!data && !loading) return null;

  const c = data?.customer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-5 border-b border-border bg-card/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20">
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
                    {c?.mobileNumber || "—"}
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
          </div>

          {/* Quick Metrics Bar */}
          {c && (
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/60 text-xs">
              <div className="bg-background/80 rounded-lg p-2.5 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Services</span>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                  {c.servicesCount}
                </span>
              </div>
              <div className="bg-background/80 rounded-lg p-2.5 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Installations</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {c.installationsCount}
                </span>
              </div>
              <div className="bg-background/80 rounded-lg p-2.5 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Projects</span>
                <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                  {c.projectsCount}
                </span>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-muted/30 px-5 gap-2 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={cn(
              "py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap",
              activeTab === "timeline"
                ? "border-primary text-primary bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Activity className="size-3.5" />
            Activity Timeline
            <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.2 text-[10px]">
              {data?.timeline.length || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("services")}
            className={cn(
              "py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap",
              activeTab === "services"
                ? "border-primary text-primary bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Wrench className="size-3.5" />
            Service Requests ({data?.services.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("installations")}
            className={cn(
              "py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap",
              activeTab === "installations"
                ? "border-primary text-primary bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <ClipboardList className="size-3.5" />
            Installations ({data?.installations.length || 0})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("projects")}
            className={cn(
              "py-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 whitespace-nowrap",
              activeTab === "projects"
                ? "border-primary text-primary bg-card"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <FolderKanban className="size-3.5" />
            Projects ({data?.projects.length || 0})
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="py-12 text-center text-muted-foreground text-sm animate-pulse">
              Loading Customer 360 profile...
            </div>
          )}

          {!loading && activeTab === "timeline" && (
            <div className="space-y-4">
              {data?.timeline.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  No activity history found.
                </div>
              ) : (
                <div className="relative border-l-2 border-border/80 ml-3 space-y-6 pl-5 py-2">
                  {data?.timeline.map((item) => {
                    const isService = item.module === "SERVICE";
                    const isInstallation = item.module === "INSTALLATION";
                    const isProject = item.module === "PROJECT";

                    return (
                      <div key={item.id} className="relative group">
                        {/* Timeline Icon Node */}
                        <div
                          className={cn(
                            "absolute -left-[29px] top-0 size-6 rounded-full flex items-center justify-center text-white text-[10px] shadow-sm",
                            isService && "bg-blue-600 ring-4 ring-background",
                            isInstallation &&
                              "bg-emerald-600 ring-4 ring-background",
                            isProject && "bg-purple-600 ring-4 ring-background",
                          )}
                        >
                          {isService && <Wrench className="size-3" />}
                          {isInstallation && (
                            <ClipboardList className="size-3" />
                          )}
                          {isProject && <FolderKanban className="size-3" />}
                        </div>

                        <div className="border border-border bg-card/70 rounded-xl p-3.5 shadow-xs hover:border-primary/40 transition-colors">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-[10px] font-bold px-2 py-0.5 rounded-md",
                                  isService &&
                                    "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                                  isInstallation &&
                                    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                                  isProject &&
                                    "bg-purple-500/10 text-purple-600 dark:text-purple-400",
                                )}
                              >
                                {item.recordId}
                              </span>
                              <span className="font-semibold text-xs text-foreground">
                                {item.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={item.status} />
                              <span className="text-[11px] text-muted-foreground">
                                {formatDateTime(item.date)}
                              </span>
                            </div>
                          </div>

                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                              {item.description}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground mt-3 pt-2 border-t border-border/50">
                            {item.technicianName && (
                              <span className="flex items-center gap-1">
                                <User className="size-3 text-muted-foreground" />
                                Assigned: {item.technicianName}
                              </span>
                            )}
                            {item.amount && (
                              <span className="font-semibold text-foreground">
                                Amount: {formatCurrency(item.amount)}
                              </span>
                            )}
                            {item.category && (
                              <span>
                                Category:{" "}
                                {SERVICE_CATEGORY_LABELS[
                                  item.category as keyof typeof SERVICE_CATEGORY_LABELS
                                ] || item.category}
                              </span>
                            )}
                            {item.address && (
                              <span className="flex items-center gap-1">
                                <MapPin className="size-3 text-muted-foreground" />
                                {item.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {!loading && activeTab === "services" && (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Service ID</TableHead>
                    <TableHead>Issue Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.services.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No service requests logged for this customer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.services.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono font-medium">
                          {s.recordId}
                        </TableCell>
                        <TableCell className="font-medium">
                          {s.issueTitle}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {SERVICE_CATEGORY_LABELS[s.category] || s.category}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={s.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {s.technicianName || "—"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {s.amount ? formatCurrency(s.amount) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(s.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && activeTab === "installations" && (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Installation ID</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Account User</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.installations.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No installations recorded for this customer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.installations.map((ins) => (
                      <TableRow key={ins.id}>
                        <TableCell className="font-mono font-medium">
                          {ins.recordId}
                        </TableCell>
                        <TableCell className="font-medium">
                          {ins.description}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ins.technicianDepartment || "Installation"}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={ins.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ins.technicianName || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono">
                          {ins.accountUsername || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(ins.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && activeTab === "projects" && (
            <div className="border border-border rounded-lg overflow-hidden">
              <Table className="text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Project ID</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Estimation No</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Technician</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.projects.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No projects found for this customer.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.projects.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono font-medium">
                          {p.recordId}
                        </TableCell>
                        <TableCell className="font-medium">
                          {p.companyName}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-mono">
                          {p.estimationNo || "—"}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={p.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.location || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.technicianName || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(p.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
