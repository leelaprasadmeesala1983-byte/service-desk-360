"use client";

import { DetailGrid, DetailRow } from "@/components/service-tickets/detail-row";
import { RecordWorkSummary } from "@/components/service-tickets/reports/record-work-summary";
import { StatusBadge } from "@/components/service-tickets/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ServiceRequestRow } from "@/db/queries/service-requests";
import { SERVICE_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDateTime } from "@/lib/format";

type ServiceDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: ServiceRequestRow;
};

function ServiceDetailsDialog({
  open,
  onOpenChange,
  record,
}: ServiceDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {record?.recordId}
            </span>
            {record?.issueTitle}
            {record && <StatusBadge status={record.status} />}
          </DialogTitle>
        </DialogHeader>

        {record && (
          <div className="space-y-4">
            <DetailGrid>
              <DetailRow label="Customer Name">{record.customerName}</DetailRow>
              <DetailRow label="Phone Number">{record.phone}</DetailRow>
              <DetailRow label="Email Address">{record.email || "—"}</DetailRow>
              <DetailRow label="Category">
                {SERVICE_CATEGORY_LABELS[record.category]}
              </DetailRow>
              <DetailRow label="Assigned Technician">
                {record.technicianNames && record.technicianNames.length > 0
                  ? record.technicianNames.join(", ")
                  : (record.technicianName ?? "—")}
              </DetailRow>
              <DetailRow label="Amount">
                {formatCurrency(record.amount)}
              </DetailRow>
              <DetailRow label="Address" wide>
                {record.address}
              </DetailRow>
              <DetailRow label="Created Date">
                {formatDateTime(record.createdAt)}
              </DetailRow>
              <DetailRow label="Last Updated">
                {formatDateTime(record.updatedAt)}
              </DetailRow>
              <DetailRow label="Issue Description" wide>
                {record.description}
              </DetailRow>
              {record.closedDescription && (
                <DetailRow label="Resolution / Closed Description" wide>
                  {record.closedDescription}
                </DetailRow>
              )}
              {record.imageUrl && (
                <DetailRow label="Attached Image" wide>
                  <div className="mt-1">
                    <img
                      src={record?.imageUrl}
                      alt="Attached service attachment"
                      className="h-40 w-full max-w-[280px] rounded-lg border border-slate-200 bg-slate-50 object-contain"
                    />
                  </div>
                </DetailRow>
              )}
            </DetailGrid>

            <RecordWorkSummary workType="SERVICE" referenceId={record.id} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { ServiceDetailsDialog };
