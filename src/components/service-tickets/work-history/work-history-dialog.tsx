"use client";

import {
  Calendar,
  Clock,
  History,
  Loader2,
  Pencil,
  User,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/service-tickets/status-badge";
import { EditWorkLogDialog } from "@/components/service-tickets/work-history/edit-work-log-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  SelectableRecord,
  ServiceRequestSummary,
  WorkHistoryItem,
} from "@/db/queries/work-history";
import { fetchWorkHistoryByRecord } from "@/lib/actions/work-history";
import type { RecordStatus, RecordType } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type WorkHistoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workType?: RecordType;
  record?: {
    id: string;
    recordId: string;
    customerName: string;
    phone: string;
    category?: string;
    address?: string;
    status: RecordStatus;
    description?: string;
    assignedTechnicianIds?: string[];
    technicianNames?: string[];
  };
  technicians?: { id: string; name: string }[];
  selectableTickets?: SelectableRecord[];
  onLogAdded?: () => void;
};

export function WorkHistoryDialog({
  open,
  onOpenChange,
  workType = "SERVICE",
  record,
  technicians = [],
  onLogAdded,
}: WorkHistoryDialogProps) {
  const [logs, setLogs] = useState<WorkHistoryItem[]>([]);
  const [parentDetails, setParentDetails] =
    useState<ServiceRequestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editLogEntry, setEditLogEntry] = useState<WorkHistoryItem | null>(
    null,
  );

  const loadLogs = useCallback(async () => {
    if (!record?.id) return;
    setLoading(true);
    setErrorMessage(null);
    const res = await fetchWorkHistoryByRecord({
      workType,
      referenceId: record.id,
    });
    if (res.ok && res.data) {
      setLogs(res.data.history ?? []);
      setParentDetails(
        res.data.serviceRequest || res.data.parentRecord || null,
      );
    } else {
      const err =
        !res.ok && res.error
          ? res.error
          : "Unable to load work history. Please try again.";
      setErrorMessage(err);
      toast.error(err);
    }
    setLoading(false);
  }, [record?.id, workType]);

  useEffect(() => {
    if (open && record?.id) {
      void loadLogs();
    }
  }, [open, record?.id, loadLogs]);

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const map = new Map<string, WorkHistoryItem[]>();
    for (const log of logs) {
      const d = log.workDate;
      const list = map.get(d) ?? [];
      list.push(log);
      map.set(d, list);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [logs]);

  // Count non-initial work logs
  const additionalWorkLogsCount = useMemo(() => {
    return logs.filter((l) => l.recordType === "WORK_LOG" && !l.isInitial)
      .length;
  }, [logs]);

  const activeRecord = parentDetails || record;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-3xl max-h-[92vh] overflow-y-auto p-3.5 sm:p-6 flex flex-col gap-4">
        <DialogHeader className="border-b border-border/80 pb-3">
          <div>
            <DialogTitle className="flex flex-wrap items-center gap-2 text-base sm:text-xl">
              <History className="size-5 text-primary shrink-0" />
              <span>Work History Timeline</span>
              {activeRecord && (
                <span className="font-mono text-xs sm:text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                  {activeRecord.recordId}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Work history timeline for {activeRecord?.recordId}
            </DialogDescription>
          </div>

          {/* Responsive Summary Section: 3 cols (Customer, Phone, Total Logs) */}
          {activeRecord && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 rounded-lg border border-border/80 bg-muted/30 p-2.5 text-xs">
              <div className="min-w-0">
                <span className="text-muted-foreground text-[11px] block">
                  Customer
                </span>
                <span className="font-semibold text-foreground truncate block">
                  {activeRecord.customerName}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground text-[11px] block">
                  Phone
                </span>
                <span className="font-medium text-foreground truncate block">
                  {activeRecord.phone}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-muted-foreground text-[11px] block">
                  Total Logs Recorded
                </span>
                <span className="font-bold text-primary block">
                  {logs.length} {logs.length === 1 ? "entry" : "entries"}
                </span>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Timeline View */}
        <div className="flex-1 min-h-[300px] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="size-6 animate-spin text-primary" />
              <span className="text-xs">Loading work history timeline...</span>
            </div>
          ) : errorMessage ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
              <div className="size-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                <History className="size-6 text-destructive" />
              </div>
              <h4 className="font-semibold text-destructive text-sm">
                Unable to load work history
              </h4>
              <p className="text-xs max-w-sm mt-1 text-muted-foreground">
                {errorMessage}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-xs"
                onClick={() => void loadLogs()}
              >
                Retry
              </Button>
            </div>
          ) : groupedLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-center">
              <div className="size-12 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                <History className="size-6 text-muted-foreground/60" />
              </div>
              <h4 className="font-semibold text-foreground text-sm">
                No work history recorded
              </h4>
              <p className="text-xs max-w-sm mt-1">
                No work logs recorded yet for this record.
              </p>
            </div>
          ) : (
            <div className="space-y-6 pt-2 pb-4">
              {groupedLogs.map(([dateStr, dayLogs]) => (
                <div key={dateStr} className="space-y-3">
                  {/* Day Date Header */}
                  <div className="sticky top-0 z-10 flex items-center gap-2 bg-background/95 py-1 backdrop-blur-xs">
                    <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      <Calendar className="size-3.5" />
                      <span>{formatDate(dateStr)}</span>
                    </div>
                    <div className="h-px flex-1 bg-border/70" />
                    <span className="text-[11px] text-muted-foreground">
                      {dayLogs.length}{" "}
                      {dayLogs.length === 1 ? "entry" : "entries"}
                    </span>
                  </div>

                  {/* Day Entries List */}
                  <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-primary/20 ml-2">
                    {dayLogs.map((log) => {
                      const isInitial =
                        log.recordType === "INITIAL_REQUEST" || log.isInitial;

                      if (isInitial) {
                        const initialTechs: {
                          id: string;
                          name: string;
                          department?: string | null;
                        }[] = log.technicians ?? [];

                        return (
                          <div
                            key={log.id}
                            className="relative rounded-xl border border-primary/40 bg-primary/[0.03] p-3.5 shadow-xs transition-shadow hover:shadow-sm"
                          >
                            {/* Timeline node dot */}
                            <div className="absolute -left-[19px] sm:-left-[27px] top-4 size-3 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20" />

                            {/* Card Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2.5 border-b border-border/40">
                              <Badge
                                variant="default"
                                className="text-[10px] uppercase font-bold tracking-wide bg-primary text-primary-foreground"
                              >
                                Initial Request
                              </Badge>
                              <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                                <Clock className="size-3.5 text-muted-foreground" />
                                {formatDateTime(log.workDateTime)}
                              </span>
                            </div>

                            {/* Assigned Technicians */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                                <Users className="size-3 text-muted-foreground" />
                                Technicians:
                              </span>
                              {initialTechs.length === 0 ? (
                                <Badge
                                  variant="outline"
                                  className="text-[11px] font-normal text-muted-foreground"
                                >
                                  Unassigned
                                </Badge>
                              ) : (
                                initialTechs.map((t) => (
                                  <Badge
                                    key={t.id}
                                    variant="secondary"
                                    className="text-[11px] font-normal gap-1"
                                  >
                                    <User className="size-2.5" />
                                    <span>{t.name}</span>
                                  </Badge>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      }

                      if (
                        log.recordType === "STATUS_CHANGE" &&
                        log.status === "CLOSED"
                      ) {
                        return (
                          <div
                            key={log.id}
                            className="relative rounded-xl border border-border/80 bg-muted/40 p-3.5 shadow-xs transition-shadow hover:shadow-sm"
                          >
                            {/* Timeline node dot */}
                            <div className="absolute -left-[19px] sm:-left-[27px] top-4 size-3 rounded-full border-2 border-background bg-slate-600 dark:bg-slate-400 ring-2 ring-slate-400/20" />

                            {/* Card Header */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 mb-2 border-b border-border/40">
                              <Badge
                                variant="secondary"
                                className="text-[10px] uppercase font-bold tracking-wide bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                              >
                                Closed
                              </Badge>
                              <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                                <Clock className="size-3.5 text-muted-foreground" />
                                {formatDateTime(log.workDateTime)}
                              </span>
                            </div>

                            {/* Status change text */}
                            <p className="text-xs text-muted-foreground font-medium">
                              Status changed to Closed
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={log.id}
                          className="relative rounded-xl border border-border bg-card p-3.5 shadow-xs transition-shadow hover:shadow-sm"
                        >
                          {/* Timeline node dot */}
                          <div className="absolute -left-[19px] sm:-left-[27px] top-4 size-3 rounded-full border-2 border-background bg-emerald-600" />

                          {/* Card Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2 mb-2.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="text-[10px] uppercase font-bold tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              >
                                Work Log
                              </Badge>
                              <span className="flex items-center gap-1 text-xs font-semibold text-foreground">
                                <Clock className="size-3.5 text-muted-foreground" />
                                {formatDateTime(log.workDateTime)}
                              </span>
                              <StatusBadge status={log.status} />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditLogEntry(log)}
                              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="size-3 mr-1" />
                              Edit
                            </Button>
                          </div>

                          {/* Technicians badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                              <Users className="size-3 text-muted-foreground" />
                              Technicians:
                            </span>
                            {log.technicians.length === 0 ? (
                              <Badge
                                variant="outline"
                                className="text-[11px] font-normal text-muted-foreground"
                              >
                                Unassigned
                              </Badge>
                            ) : (
                              log.technicians.map((t) => (
                                <Badge
                                  key={t.id}
                                  variant="secondary"
                                  className="text-[11px] font-normal gap-1"
                                >
                                  <User className="size-2.5" />
                                  <span>{t.name}</span>
                                </Badge>
                              ))
                            )}
                          </div>

                          {/* Work Description / Notes */}
                          {log.description && (
                            <p className="text-xs text-foreground whitespace-pre-line leading-relaxed break-words">
                              {log.description}
                            </p>
                          )}

                          {/* Logged by footer */}
                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1 text-[10px] text-muted-foreground/80 border-t border-border/40 pt-1.5">
                            <span>
                              Logged by:{" "}
                              <strong className="font-medium text-muted-foreground">
                                {log.createdByName ?? "System"}
                              </strong>
                            </span>
                            <span>
                              Recorded: {formatDateTime(log.createdAt)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* When only initial request exists, show "No additional work logs recorded yet." */}
              {additionalWorkLogsCount === 0 && (
                <div className="mt-4 rounded-xl border border-dashed border-border/80 bg-muted/20 p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    No additional work logs recorded yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/80 pt-2 sm:justify-between flex flex-col sm:flex-row gap-2">
          <span className="text-xs text-muted-foreground self-center">
            Total {logs.length} timeline{" "}
            {logs.length === 1 ? "record" : "records"}
          </span>
          <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
        </DialogFooter>
      </DialogContent>

      {editLogEntry && (
        <EditWorkLogDialog
          open={Boolean(editLogEntry)}
          onOpenChange={(open) => !open && setEditLogEntry(null)}
          entry={editLogEntry}
          technicians={technicians}
          parentStatus={activeRecord?.status}
          onUpdated={() => {
            void loadLogs();
            onLogAdded?.();
          }}
        />
      )}
    </Dialog>
  );
}
