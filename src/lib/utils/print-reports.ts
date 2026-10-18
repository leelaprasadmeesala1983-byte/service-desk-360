import { formatCurrency, formatDate } from "@/lib/format";
import type {
  CustomerReportData,
  ItemReportData,
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

/**
 * Generates the full HTML for a Customer Report.
 */
export function generateCustomerReportHtml(data: CustomerReportData): string {
  const { summary, materials } = data;

  const rows = materials
    .map(
      (m, idx) => `
    <tr>
      <td class="center">${idx + 1}</td>
      <td class="mono">${escapeHtml(m.trackId)}</td>
      <td>${escapeHtml(formatDate(m.receivedDate))}</td>
      <td>${escapeHtml(m.product)}${m.complaint ? `<div class="muted">${escapeHtml(m.complaint)}</div>` : ""}</td>
      <td class="mono bold">${escapeHtml(m.serialNumber)}</td>
      <td>${escapeHtml(m.vendor || "—")}</td>
      <td>${escapeHtml(m.currentStatus)}</td>
      <td>${escapeHtml(m.location || summary.address || "—")}</td>
    </tr>`,
    )
    .join("");

  const body = `
    ${renderDocHeader({ title: "Customer Report", date: formatDate(new Date()) })}
    <div class="cards">
      ${renderInfoCard("Customer", [summary.customerName, summary.address])}
      ${renderInfoCard("Contact", [summary.customerNumber, `Total Items: ${materials.length}`])}
    </div>
    <table class="doc-table">
      <thead>
        <tr>
          <th class="center">#</th><th>Track ID</th><th>Date</th><th>Product</th>
          <th>Serial No</th><th>Vendor</th><th>Status</th><th>Location</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="8" class="center muted">No material records found.</td></tr>'}</tbody>
    </table>
    <div class="doc-totals">Total Items: ${materials.length}</div>
    ${renderSignatures(["Prepared By", "Checked By", "Authorized Signatory"])}`;

  return buildPrintDocument({
    title: `Customer Report - ${summary.customerName}`,
    toolbarLabel: `Customer Report (${materials.length} records)`,
    body,
  });
}

/**
 * Generates the full HTML for a Vendor Report.
 */
export function generateVendorReportHtml(data: VendorReportData): string {
  const { summary, materials } = data;

  const rows = materials
    .map(
      (m, idx) => `
    <tr>
      <td class="center">${idx + 1}</td>
      <td class="mono">${escapeHtml(m.trackId)}</td>
      <td>${escapeHtml(formatDate(m.sentDate))}</td>
      <td>${escapeHtml(m.customer)}</td>
      <td>${escapeHtml(m.product)}</td>
      <td class="mono bold">${escapeHtml(m.serialNumber)}</td>
      <td>${escapeHtml(m.currentStatus)}</td>
      <td class="center">${formatCurrency(m.repairCost)}</td>
    </tr>`,
    )
    .join("");

  const body = `
    ${renderDocHeader({ title: "Vendor Report", date: formatDate(new Date()) })}
    <div class="cards">
      ${renderInfoCard("Vendor", [summary.vendorName, summary.contactPerson, summary.phoneNumber])}
      ${renderInfoCard("Summary", [`Total Items: ${materials.length}`, `Total Repair Cost: ${formatCurrency(summary.totalRepairCost)}`])}
    </div>
    <table class="doc-table">
      <thead>
        <tr>
          <th class="center">#</th><th>Track ID</th><th>Sent Date</th><th>Customer</th>
          <th>Product</th><th>Serial No</th><th>Status</th><th class="center">Cost</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="8" class="center muted">No material records found.</td></tr>'}</tbody>
    </table>
    <div class="doc-totals">Total Items: ${materials.length} &nbsp;|&nbsp; Total Repair Cost: ${formatCurrency(summary.totalRepairCost)}</div>
    ${renderSignatures(["Prepared By", "Checked By", "Authorized Signatory"])}`;

  return buildPrintDocument({
    title: `Vendor Report - ${summary.vendorName}`,
    toolbarLabel: `Vendor Report (${materials.length} records)`,
    body,
  });
}

/**
 * Direct print trigger for Customer Report.
 */
export function printCustomerReportDirect(
  data: CustomerReportData,
  onPopupBlocked?: () => void,
): void {
  openPrintWindow(generateCustomerReportHtml(data), onPopupBlocked);
}

/**
 * Direct print trigger for Vendor Report.
 */
export function printVendorReportDirect(
  data: VendorReportData,
  onPopupBlocked?: () => void,
): void {
  openPrintWindow(generateVendorReportHtml(data), onPopupBlocked);
}
