import { formatCurrency, formatDate } from "@/lib/format";
import type {
  CustomerMaterialItem,
  CustomerReportData,
  VendorMaterialItem,
  VendorReportData,
} from "@/types/reports";
import {
  buildPrintDocument,
  escapeHtml,
  openPrintWindow,
  renderDocHeader,
  renderInfoCard,
  renderSignatures,
} from "./print-template";

export { escapeHtml };

export type UnifiedReportRecord = {
  id: string;
  trackId: string;
  customerName: string;
  customerContact?: string;
  customerLocation?: string;
  productName: string;
  serialNumber: string;
  complaint?: string;
  vendorName: string;
  receivedDate?: string | null;
  sentDate?: string | null;
  vendorReceivedDate?: string | null;
  returnedDate?: string | null;
  repairStatus: string;
  repairCost: number;
  currentStatus: string;
};

/**
 * Normalizes a CustomerMaterialItem into a UnifiedReportRecord.
 */
export function normalizeCustomerRecord(
  item: CustomerMaterialItem,
  customerAddress?: string,
  customerNumber?: string,
): UnifiedReportRecord {
  return {
    id: item.id,
    trackId: item.trackId || "—",
    customerName: item.customer || "—",
    customerContact: customerNumber || "—",
    customerLocation: item.location || customerAddress || "—",
    productName: item.product || "Product",
    serialNumber: item.serialNumber || "—",
    complaint: item.complaint || "Service & Repair",
    vendorName: item.vendor || "—",
    receivedDate: item.receivedDate,
    sentDate: item.sentToVendorDate,
    vendorReceivedDate: item.vendorReceivedDate,
    returnedDate: item.returnedDate,
    repairStatus: item.repairStatus || "NOT_REQUIRED",
    repairCost: item.repairCost || 0,
    currentStatus: item.currentStatus || "Received",
  };
}

/**
 * Normalizes a VendorMaterialItem into a UnifiedReportRecord.
 */
export function normalizeVendorRecord(
  item: VendorMaterialItem,
  vendorAddress?: string,
  vendorContact?: string,
): UnifiedReportRecord {
  return {
    id: item.id,
    trackId: item.trackId || "—",
    customerName: item.customer || "—",
    customerContact: "—",
    customerLocation: "—",
    productName: item.product || "Product",
    serialNumber: item.serialNumber || "—",
    complaint: "Service & Repair",
    vendorName: vendorContact || item.customer || "Vendor",
    receivedDate: item.sentDate,
    sentDate: item.sentDate,
    vendorReceivedDate: item.vendorReceivedDate,
    returnedDate: item.customerReturnDate,
    repairStatus: item.repairStatus || "UNDER_REPAIR",
    repairCost: item.repairCost || 0,
    currentStatus: item.currentStatus || "Sent to Vendor",
  };
}

/**
 * Generates the complete HTML for a Single Record Service Slip.
 */
export function generateSingleReportRecordHtml(
  record: UnifiedReportRecord,
): string {
  const repairStatus = record.repairStatus.replace(/_/g, " ");

  const body = `
    ${renderDocHeader({
      title: "Material Service Slip",
      refId: record.trackId,
      date: formatDate(new Date()),
    })}
    <div class="cards">
      ${renderInfoCard("Customer", [
        record.customerName,
        record.customerLocation,
        record.customerContact,
      ])}
      ${renderInfoCard("Vendor", [
        record.vendorName,
        `Repair Charges: ${formatCurrency(record.repairCost)}`,
        `Status: ${repairStatus}`,
      ])}
    </div>
    <table class="doc-table">
      <thead>
        <tr><th>Track ID</th><th>Product</th><th>Serial No</th><th>Complaint</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr>
          <td class="mono">${escapeHtml(record.trackId)}</td>
          <td>${escapeHtml(record.productName)}</td>
          <td class="mono bold">${escapeHtml(record.serialNumber)}</td>
          <td>${escapeHtml(record.complaint || "Service & Repair")}</td>
          <td>${escapeHtml(record.currentStatus)}</td>
        </tr>
      </tbody>
    </table>
    <div class="section-heading">Lifecycle Milestones</div>
    <div class="kv-grid">
      <div><div class="kv-label">Received Date</div><div class="kv-value">${formatDate(record.receivedDate)}</div></div>
      <div><div class="kv-label">Sent to Vendor</div><div class="kv-value">${formatDate(record.sentDate)}</div></div>
      <div><div class="kv-label">Vendor Return</div><div class="kv-value">${formatDate(record.vendorReceivedDate)}</div></div>
      <div><div class="kv-label">Customer Return</div><div class="kv-value">${formatDate(record.returnedDate)}</div></div>
    </div>
    ${renderSignatures(["Prepared By", "Checked By", "Customer Signature"])}`;

  return buildPrintDocument({
    title: `Material Service Record - ${record.trackId}`,
    toolbarLabel: `Material Service Slip ${record.trackId}`,
    body,
  });
}

/**
 * Directly prints / generates the Individual Record PDF document in an isolated popup window.
 */
export function printSingleReportRecord(
  record: UnifiedReportRecord,
  onPopupBlocked?: () => void,
): void {
  openPrintWindow(generateSingleReportRecordHtml(record), onPopupBlocked);
}
