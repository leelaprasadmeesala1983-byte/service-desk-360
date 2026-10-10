"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { DetailGrid, DetailRow } from "@/components/service-tickets/detail-row";
import { RecordWorkSummary } from "@/components/service-tickets/reports/record-work-summary";
import { StatusBadge } from "@/components/service-tickets/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { InstallationRow } from "@/db/queries/installations";
import { formatDateTime } from "@/lib/format";

type InstallationDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: InstallationRow;
};

function InstallationDetailsDialog({
  open,
  onOpenChange,
  record,
}: InstallationDetailsDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const hasPassword = Boolean(
    record?.hasAccountPassword ||
      (record?.accountPassword && record.accountPassword.trim().length > 0),
  );
  const technicianLabel =
    record?.technicianNames && record.technicianNames.length > 0
      ? record.technicianNames.join(", ")
      : record?.technicianName
        ? record.technicianDepartment
          ? `${record.technicianName} (${record.technicianDepartment})`
          : record.technicianName
        : "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {record?.recordId}
            </span>
            <span>{record?.customerName}</span>
            {record && <StatusBadge status={record.status} />}
          </DialogTitle>
        </DialogHeader>

        {record && (
          <div className="space-y-5">
            <DetailGrid>
              <DetailRow label="Installation ID">{record.recordId}</DetailRow>
              <DetailRow label="S.No / Reference ID">
                {record.referenceNo ?? "—"}
              </DetailRow>
              <DetailRow label="Customer Name">{record.customerName}</DetailRow>
              <DetailRow label="Contact Number">
                {record.contactNumber}
              </DetailRow>
              <DetailRow label="Email Address">{record.email || "—"}</DetailRow>
              <DetailRow label="Assigned Technician">
                {technicianLabel}
              </DetailRow>
              <DetailRow label="Address" wide>
                {record.address}
              </DetailRow>
              <DetailRow label="Description" wide>
                {record.description}
              </DetailRow>
              <DetailRow label="Created Date">
                {formatDateTime(record.createdAt)}
              </DetailRow>
              <DetailRow label="Updated Date">
                {formatDateTime(record.updatedAt)}
              </DetailRow>
            </DetailGrid>

            <div className="border-border rounded-lg border p-4">
              <p className="mb-3 text-sm font-semibold">Account Details</p>
              <DetailGrid>
                <DetailRow label="Username">
                  {record.accountUsername ?? "—"}
                </DetailRow>
                <DetailRow label="Password">
                  {hasPassword ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono tracking-wider">
                        {showPassword && record.accountPassword
                          ? record.accountPassword
                          : "••••••••"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded transition-colors inline-flex items-center"
                        title={showPassword ? "Hide password" : "Show password"}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    "Not configured"
                  )}
                </DetailRow>
                <DetailRow label="Mobile Number">
                  {record.accountMobile ?? "—"}
                </DetailRow>
                <DetailRow label="S.No / Reference ID">
                  {record.referenceNo ?? "—"}
                </DetailRow>
              </DetailGrid>
            </div>

            {record.paymentMode && (
              <div className="border-border rounded-lg border p-4">
                <p className="mb-3 text-sm font-semibold">
                  Customer Payment Details
                </p>
                <DetailGrid>
                  <DetailRow label="Payment Mode">
                    {record.paymentMode === "ONLINE" ? "Online" : "Cash"}
                  </DetailRow>
                  {record.paymentMode === "ONLINE" && (
                    <DetailRow label="Payment Status">
                      {record.paymentStatus === "PAID" ? "Paid" : "Pending"}
                    </DetailRow>
                  )}
                  {record.paymentMode === "CASH" && (
                    <DetailRow label="Cash Amount">
                      {record.amount
                        ? `₹${Number(record.amount).toLocaleString("en-IN")}`
                        : "—"}
                    </DetailRow>
                  )}
                </DetailGrid>
              </div>
            )}

            <RecordWorkSummary
              workType="INSTALLATION"
              referenceId={record.id}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { InstallationDetailsDialog };
