"use client";

import { DetailGrid, DetailRow } from "@/components/service-tickets/detail-row";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CustomerRow } from "@/db/queries/customers";
import { formatDate } from "@/lib/format";

type CustomerDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerRow;
};

export function CustomerDetailsDialog({
  open,
  onOpenChange,
  customer,
}: CustomerDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>
            {customer?.customerName || "Customer Details"}
          </DialogTitle>
        </DialogHeader>

        {customer && (
          <DetailGrid>
            <DetailRow label="Customer Name">{customer.customerName}</DetailRow>
            <DetailRow label="Mobile Number">{customer.mobileNumber}</DetailRow>
            <DetailRow label="Email Address">{customer.email || "—"}</DetailRow>
            <DetailRow label="Registered By">
              {customer.createdByName || "System / Migration"}
            </DetailRow>
            <DetailRow label="Created Date">
              {formatDate(customer.createdAt)}
            </DetailRow>
            <DetailRow label="Last Updated">
              {formatDate(customer.updatedAt)}
            </DetailRow>
            <DetailRow label="Full Address" wide>
              <div className="whitespace-pre-wrap">
                {customer.address || "—"}
              </div>
            </DetailRow>
          </DetailGrid>
        )}
      </DialogContent>
    </Dialog>
  );
}
