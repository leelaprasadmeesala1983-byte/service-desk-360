"use client";

import {
  Calendar,
  Check,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Loader2,
  Pencil,
  User,
  Users,
  X,
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
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import type {
  SelectableRecord,
  ServiceRequestSummary,
  WorkHistoryItem,
} from "@/db/queries/work-history";
import { updateInstallationDetails } from "@/lib/actions/installations";
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
    email?: string | null;
    category?: string;
    address?: string;
    status: RecordStatus;
    description?: string;
    assignedTechnicianIds?: string[];
    technicianNames?: string[];
    accountUsername?: string | null;
    accountPassword?: string | null;
    hasAccountPassword?: boolean;
    accountMobile?: string | null;
    referenceNo?: string | null;
    paymentMode?: "ONLINE" | "CASH" | string | null;
    paymentStatus?: "PAID" | "PENDING" | string | null;
    amount?: string | null;
  };
  technicians?: { id: string; name: string }[];
  selectableTickets?: SelectableRecord[];
  onLogAdded?: () => void;
  onDetailsSaved?: (savedRecord?: any) => void;
};

export function WorkHistoryDialog({
  open,
  onOpenChange,
  workType = "SERVICE",
  record,
  technicians = [],
  onLogAdded,
  onDetailsSaved,
}: WorkHistoryDialogProps) {
  const [logs, setLogs] = useState<WorkHistoryItem[]>([]);
  const [parentDetails, setParentDetails] =
    useState<ServiceRequestSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showViewPassword, setShowViewPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editLogEntry, setEditLogEntry] = useState<WorkHistoryItem | null>(
    null,
  );
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    accountUsername: "",
    accountPassword: "",
    accountMobile: "",
    referenceNo: "",
    paymentMode: "",
    paymentStatus: "PAID",
    amount: "",
  });

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
      setShowViewPassword(false);
      setShowEditPassword(false);
      setIsEditingDetails(false);
      setSavingDetails(false);
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
  const hasPassword = Boolean(
    activeRecord?.hasAccountPassword ||
      (typeof activeRecord?.accountPassword === "string" &&
        activeRecord.accountPassword.trim().length > 0),
  );

  const handleStartEditDetails = () => {
    if (!activeRecord) return;
    setDetailsForm({
      accountUsername: activeRecord.accountUsername ?? "",
      accountPassword: activeRecord.accountPassword ?? "",
      accountMobile: activeRecord.accountMobile ?? "",
      referenceNo: activeRecord.referenceNo ?? "",
      paymentMode: activeRecord.paymentMode ?? "",
      paymentStatus: activeRecord.paymentStatus ?? "PAID",
      amount: activeRecord.amount ?? "",
    });
    setShowEditPassword(false);
    setIsEditingDetails(true);
  };

  const handleCancelEditDetails = () => {
    setIsEditingDetails(false);
  };

  const handleSaveDetails = async () => {
    if (!activeRecord?.id) return;

    if (
      detailsForm.accountMobile &&
      detailsForm.accountMobile.trim().length > 0
    ) {
      const mobile = detailsForm.accountMobile.trim();
      if (!/^[0-9]{10}$/.test(mobile)) {
        toast.error("Please enter a valid 10-digit mobile number");
        return;
      }
    }

    if (detailsForm.paymentMode === "CASH") {
      if (
        !detailsForm.amount ||
        Number.isNaN(Number(detailsForm.amount)) ||
        Number(detailsForm.amount) <= 0
      ) {
        toast.error("Please enter a valid cash amount");
        return;
      }
    }

    setSavingDetails(true);
    try {
      const payload = {
        id: activeRecord.id,
        accountUsername: detailsForm.accountUsername.trim() || null,
        accountPassword: detailsForm.accountPassword.trim() || undefined,
        accountMobile: detailsForm.accountMobile.trim() || null,
        referenceNo: detailsForm.referenceNo.trim() || null,
        paymentMode: detailsForm.paymentMode || null,
        paymentStatus:
          detailsForm.paymentMode === "ONLINE"
            ? detailsForm.paymentStatus || "PAID"
            : detailsForm.paymentMode === "CASH"
              ? "PAID"
              : null,
        amount:
          detailsForm.paymentMode === "CASH"
            ? detailsForm.amount
            : null,
      };

      let res: { ok: boolean; data?: any; error?: string };
      try {
        const apiRes = await fetch(
          `/api/work-history/${activeRecord.id}/installation-details`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const data = await apiRes.json();
        if (apiRes.ok && data.success) {
          res = { ok: true, data: data.data };
        } else {
          res = { ok: false, error: data.error || "Failed to update installation details" };
        }
      } catch {
        res = await updateInstallationDetails(payload);
      }

      if (res.ok) {
        toast.success("Installation details updated successfully");
        setIsEditingDetails(false);
        try {
          await loadLogs();
          if (res.data) {
            onDetailsSaved?.(res.data);
          }
          onLogAdded?.();
        } catch (refreshError) {
          console.error("Error refreshing logs after save:", refreshError);
        }
      } else {
        toast.error(res.error || "Failed to update installation details");
      }
    } catch (err) {
      console.error("Save details error:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while saving details";
      toast.error(msg);
    } finally {
      setSavingDetails(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] sm:max-h-[92vh] overflow-y-auto overflow-x-hidden p-3 sm:p-6 flex flex-col gap-3.5 sm:gap-4">
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
            <div className="mt-3 grid grid-cols-1 min-[480px]:grid-cols-3 gap-2 sm:gap-2.5 rounded-lg border border-border/80 bg-muted/30 p-2 sm:p-2.5 text-xs">
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

          {/* Account Details & Customer Payment Details for Installations */}
          {workType === "INSTALLATION" && activeRecord && (
            <div className="mt-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <KeyRound className="size-3.5 text-primary shrink-0" />
                  <span>Installation Details</span>
                </div>
                {isEditingDetails ? (
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={savingDetails}
                      onClick={handleCancelEditDetails}
                      className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3 mr-1" />
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingDetails}
                      onClick={() => void handleSaveDetails()}
                      className="h-7 px-3 text-xs gap-1"
                    >
                      {savingDetails ? (
                        <>
                          <Loader2 className="size-3 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Check className="size-3" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleStartEditDetails}
                    className="h-7 px-2.5 text-xs gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Pencil className="size-3" />
                    <span>Edit Details</span>
                  </Button>
                )}
              </div>

              <div className="space-y-3 text-xs">
                {/* Account & Credentials Card - Full Width */}
                <div className="rounded-lg border border-border/80 bg-card/60 p-3 sm:p-4 space-y-3">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs pb-1.5 border-b border-border/50">
                    <KeyRound className="size-3.5 text-primary shrink-0" />
                    <span>Account &amp; Credentials</span>
                  </div>
                  {isEditingDetails ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-muted-foreground text-[11px] block font-medium">
                          Username
                        </label>
                        <Input
                          value={detailsForm.accountUsername}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({
                              ...prev,
                              accountUsername: e.target.value,
                            }))
                          }
                          placeholder="Enter username"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-muted-foreground text-[11px] block font-medium">
                            Password
                          </label>
                          {hasPassword && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Existing password is set
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <Input
                            type={showEditPassword ? "text" : "password"}
                            value={detailsForm.accountPassword}
                            onChange={(e) =>
                              setDetailsForm((prev) => ({
                                ...prev,
                                accountPassword: e.target.value,
                              }))
                            }
                            placeholder={hasPassword ? "Leave blank to keep existing" : "Enter password"}
                            className="h-8 text-xs pr-8 font-mono"
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowEditPassword((prev) => !prev)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                            title={
                              showEditPassword ? "Hide password" : "Show password"
                            }
                            aria-label={
                              showEditPassword ? "Hide password" : "Show password"
                            }
                          >
                            {showEditPassword ? (
                              <EyeOff className="size-3.5" />
                            ) : (
                              <Eye className="size-3.5" />
                            )}
                          </button>
                        </div>
                        {hasPassword ? (
                          <span className="text-[10px] text-muted-foreground block">
                            Leave blank to keep the existing password.
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground block">
                            Enter an initial password for this account.
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground text-[11px] block font-medium">
                          Mobile Number
                        </label>
                        <PhoneInput
                          value={detailsForm.accountMobile}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({
                              ...prev,
                              accountMobile: e.target.value,
                            }))
                          }
                          placeholder="Enter 10-digit mobile number"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground text-[11px] block font-medium">
                          S.No / Reference ID
                        </label>
                        <Input
                          value={detailsForm.referenceNo}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({
                              ...prev,
                              referenceNo: e.target.value,
                            }))
                          }
                          placeholder="Enter reference ID"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[11px] block">
                          Username
                        </span>
                        <span className="font-medium text-foreground break-all block mt-0.5">
                          {activeRecord.accountUsername || "—"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[11px] block">
                          Password
                        </span>
                        {hasPassword ? (
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="font-mono text-foreground tracking-wider">
                              {showViewPassword && activeRecord.accountPassword
                                ? activeRecord.accountPassword
                                : "••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowViewPassword((prev) => !prev)}
                              className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors inline-flex items-center"
                              title={
                                showViewPassword ? "Hide password" : "Show password"
                              }
                              aria-label={
                                showViewPassword ? "Hide password" : "Show password"
                              }
                            >
                              {showViewPassword ? (
                                <EyeOff className="size-3.5" />
                              ) : (
                                <Eye className="size-3.5" />
                              )}
                            </button>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                              (Password configured)
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground block mt-0.5">
                            Not configured
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[11px] block">
                          Mobile Number
                        </span>
                        <span className="font-medium text-foreground break-words block mt-0.5">
                          {activeRecord.accountMobile || "—"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[11px] block">
                          S.No / Reference ID
                        </span>
                        <span className="font-medium text-foreground break-words block mt-0.5">
                          {activeRecord.referenceNo || "—"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Payment Details Card - Full Width directly below */}
                <div className="rounded-lg border border-border/80 bg-card/60 p-3 sm:p-4 space-y-3">
                  <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs pb-1.5 border-b border-border/50">
                    <CreditCard className="size-3.5 text-primary shrink-0" />
                    <span>Customer Payment Details</span>
                  </div>
                  {isEditingDetails ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-muted-foreground text-[11px] block font-medium">
                          Payment Mode
                        </label>
                        <select
                          value={detailsForm.paymentMode}
                          onChange={(e) =>
                            setDetailsForm((prev) => ({
                              ...prev,
                              paymentMode: e.target.value,
                            }))
                          }
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          <option value="">None / Not Selected</option>
                          <option value="ONLINE">Online</option>
                          <option value="CASH">Cash</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted-foreground text-[11px] block font-medium">
                          Payment Status
                        </label>
                        <select
                          value={detailsForm.paymentStatus}
                          disabled={
                            detailsForm.paymentMode === "CASH" ||
                            !detailsForm.paymentMode
                          }
                          onChange={(e) =>
                            setDetailsForm((prev) => ({
                              ...prev,
                              paymentStatus: e.target.value,
                            }))
                          }
                          className="h-8 w-full rounded-md border border-input bg-background px-2.5 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                        >
                          <option value="PAID">Paid</option>
                          <option value="PENDING">Pending</option>
                        </select>
                      </div>
                      {detailsForm.paymentMode === "CASH" && (
                        <div className="space-y-1 col-span-1 sm:col-span-2">
                          <label className="text-muted-foreground text-[11px] block font-medium">
                            Cash Amount (₹)
                          </label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={detailsForm.amount}
                            onChange={(e) =>
                              setDetailsForm((prev) => ({
                                ...prev,
                                amount: e.target.value,
                              }))
                            }
                            placeholder="Enter cash amount"
                            className="h-8 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[11px] block">
                          Payment Mode
                        </span>
                        <span className="font-medium text-foreground block mt-0.5">
                          {activeRecord.paymentMode === "ONLINE"
                            ? "Online"
                            : activeRecord.paymentMode === "CASH"
                              ? "Cash"
                              : activeRecord.paymentMode || "—"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-muted-foreground text-[11px] block">
                          Payment Status
                        </span>
                        <span className="font-medium text-foreground block mt-0.5">
                          {activeRecord.paymentMode === "ONLINE"
                            ? activeRecord.paymentStatus === "PAID"
                              ? "Paid"
                              : activeRecord.paymentStatus === "PENDING"
                                ? "Pending"
                                : activeRecord.paymentStatus || "—"
                            : activeRecord.paymentMode === "CASH"
                              ? "Paid"
                              : "—"}
                        </span>
                      </div>
                      {activeRecord.paymentMode === "CASH" && (
                        <div className="min-w-0 col-span-1 sm:col-span-2">
                          <span className="text-muted-foreground text-[11px] block">
                            Cash Amount
                          </span>
                          <span className="font-semibold text-foreground block mt-0.5">
                            {activeRecord.amount
                              ? `₹${Number(activeRecord.amount).toLocaleString("en-IN")}`
                              : "—"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                  <div className="space-y-3 pl-2.5 sm:pl-4 border-l-2 border-primary/20 ml-2">
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
                            className="relative rounded-xl border border-primary/40 bg-primary/[0.03] p-3 sm:p-3.5 shadow-xs transition-shadow hover:shadow-sm"
                          >
                            {/* Timeline node dot */}
                            <div className="absolute -left-[17px] sm:-left-[23px] top-4 size-2.5 sm:size-3 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20" />

                            {/* Card Header */}
                            <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 mb-2 border-b border-border/40">
                              <Badge
                                variant="default"
                                className="text-[10px] uppercase font-bold tracking-wide bg-primary text-primary-foreground"
                              >
                                Initial Request
                              </Badge>
                              <span className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-foreground whitespace-nowrap">
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
                                  className="text-[10px] sm:text-[11px] font-normal text-muted-foreground"
                                >
                                  Unassigned
                                </Badge>
                              ) : (
                                initialTechs.map((t) => (
                                  <Badge
                                    key={t.id}
                                    variant="secondary"
                                    className="text-[10px] sm:text-[11px] font-normal gap-1 py-0 px-1.5"
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
                            className="relative rounded-xl border border-border/80 bg-muted/40 p-3 sm:p-3.5 shadow-xs transition-shadow hover:shadow-sm"
                          >
                            {/* Timeline node dot */}
                            <div className="absolute -left-[17px] sm:-left-[23px] top-4 size-2.5 sm:size-3 rounded-full border-2 border-background bg-slate-600 dark:bg-slate-400 ring-2 ring-slate-400/20" />

                            {/* Card Header */}
                            <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 mb-2 border-b border-border/40">
                              <Badge
                                variant="secondary"
                                className="text-[10px] uppercase font-bold tracking-wide bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                              >
                                Closed
                              </Badge>
                              <span className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-foreground whitespace-nowrap">
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
                          className="relative rounded-xl border border-border bg-card p-3 sm:p-3.5 shadow-xs transition-shadow hover:shadow-sm"
                        >
                          {/* Timeline node dot */}
                          <div className="absolute -left-[17px] sm:-left-[23px] top-4 size-2.5 sm:size-3 rounded-full border-2 border-background bg-emerald-600" />

                          {/* Card Header */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/50 pb-2 mb-2">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                              <Badge
                                variant="secondary"
                                className="text-[10px] uppercase font-bold tracking-wide bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                              >
                                Work Log
                              </Badge>
                              <span className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-foreground whitespace-nowrap">
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
                              className="h-6 px-1.5 sm:h-7 sm:px-2 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="size-3 mr-1" />
                              Edit
                            </Button>
                          </div>

                          {/* Technicians badges */}
                          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mb-2">
                            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                              <Users className="size-3 text-muted-foreground" />
                              Technicians:
                            </span>
                            {log.technicians.length === 0 ? (
                              <Badge
                                variant="outline"
                                className="text-[10px] sm:text-[11px] font-normal text-muted-foreground"
                              >
                                Unassigned
                              </Badge>
                            ) : (
                              log.technicians.map((t) => (
                                <Badge
                                  key={t.id}
                                  variant="secondary"
                                  className="text-[10px] sm:text-[11px] font-normal gap-1 py-0 px-1.5"
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
                          <div className="mt-2.5 flex flex-col min-[380px]:flex-row min-[380px]:items-center justify-between gap-1 text-[10px] text-muted-foreground/80 border-t border-border/40 pt-1.5">
                            <span>
                              Logged by:{" "}
                              <strong className="font-medium text-muted-foreground">
                                {log.createdByName ?? "System"}
                              </strong>
                            </span>
                            <span className="whitespace-nowrap">
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

        <DialogFooter className="border-t border-border/80 pt-2.5 flex flex-row items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            Total {logs.length} timeline{" "}
            {logs.length === 1 ? "record" : "records"}
          </span>
          <DialogClose render={<Button variant="outline" size="sm" className="h-8 px-3 text-xs" />}>Close</DialogClose>
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
