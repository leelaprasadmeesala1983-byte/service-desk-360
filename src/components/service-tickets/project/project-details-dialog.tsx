"use client";

import { FileText } from "lucide-react";

import { DetailGrid, DetailRow } from "@/components/service-tickets/detail-row";
import { RecordWorkSummary } from "@/components/service-tickets/reports/record-work-summary";
import { StatusBadge } from "@/components/service-tickets/status-badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ProjectRow } from "@/db/queries/projects";
import { formatDateTime } from "@/lib/format";

type ProjectDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record?: ProjectRow;
};

function ProjectDetailsDialog({
  open,
  onOpenChange,
  record,
}: ProjectDetailsDialogProps) {
  const technicianLabel =
    record?.technicianNames && record.technicianNames.length > 0
      ? record.technicianNames.join(", ")
      : record?.technicianName
        ? record.technicianDepartment
          ? `${record.technicianName} (${record.technicianDepartment})`
          : record.technicianName
        : "Unassigned";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Project Details
            <span className="font-mono text-xs text-muted-foreground">
              {record?.recordId}
            </span>
            {record && <StatusBadge status={record.status} />}
          </DialogTitle>
        </DialogHeader>

        {record && (
          <div className="space-y-4">
            <DetailGrid>
              <DetailRow label="Project ID">{record.recordId}</DetailRow>
              <DetailRow label="Company Name">{record.companyName}</DetailRow>
              <DetailRow label="Customer Name">{record.customerName}</DetailRow>
              <DetailRow label="Email Address">{record.email}</DetailRow>
              <DetailRow label="Mobile Number">{record.mobileNo}</DetailRow>
              <DetailRow label="Assigned Technician">
                {technicianLabel}
              </DetailRow>
              <DetailRow label="Estimation Number">
                {record.estimationNo}
              </DetailRow>
              <DetailRow label="Location">{record.location}</DetailRow>
              <DetailRow label="Created Date">
                {formatDateTime(record.createdAt)}
              </DetailRow>
              <DetailRow label="Updated Date">
                {formatDateTime(record.updatedAt)}
              </DetailRow>
              <DetailRow label="Project Description" wide>
                {record.description}
              </DetailRow>
              <DetailRow label="Attached PDF Document" wide>
                {record.pdfUrl ? (
                  <a
                    href={record.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    download={record.pdfName || "project-document.pdf"}
                    className="text-primary inline-flex items-center gap-1.5 hover:underline"
                  >
                    <FileText className="size-4" />
                    {record.pdfName || "Download PDF Document"}
                  </a>
                ) : (
                  "—"
                )}
              </DetailRow>
            </DetailGrid>

            <RecordWorkSummary workType="PROJECT" referenceId={record.id} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { ProjectDetailsDialog };
