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

/**
 * Generates the full HTML for an Item Service Report with selective timeline milestones.
 */
export function generateItemReportHtml(
  data: ItemReportData,
  selectedMilestoneIds?: Set<string>,
): string {
  const allMilestones = Array.isArray(data.timeline) ? data.timeline : [];
  const milestones =
    selectedMilestoneIds && selectedMilestoneIds.size > 0
      ? allMilestones.filter((m, idx) =>
          selectedMilestoneIds.has(m.id || String(idx)),
        )
      : allMilestones;

  const rows = milestones
    .map(
      (m, idx) => `
    <tr>
      <td class="center">${idx + 1}</td>
      <td class="bold">${escapeHtml(m.title)}</td>
      <td class="mono">${escapeHtml(m.date)}${m.time ? ` · ${escapeHtml(m.time)}` : ""}</td>
      <td><span style="display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">${escapeHtml(m.status || data.currentStatus)}</span></td>
      <td>${escapeHtml(m.description || "—")}</td>
    </tr>`,
    )
    .join("");

  const body = `
    ${renderDocHeader({ title: "Material Item Service Report", refId: data.trackId, date: formatDate(new Date()) })}
    <div class="cards">
      ${renderInfoCard("Customer & Location", [
        `Customer: ${data.customer}`,
        data.customerMobile ? `Contact: ${data.customerMobile}` : "",
        data.customerAddress ? `Address: ${data.customerAddress}` : "",
        `Received: ${formatDate(data.receivedDate)}`,
      ])}
      ${renderInfoCard("Product & Repair Status", [
        `Product: ${data.product} (${data.category})`,
        `Serial No: ${data.serialNumber}`,
        `Current Status: ${data.currentStatus}`,
        `Vendor: ${data.vendor} · Repair: ${data.repairStatus.replace(/_/g, " ")}`,
        data.complaint ? `Complaint: ${data.complaint}` : "",
      ])}
    </div>
    <div class="section-heading">Selected Service Journey Milestones (${milestones.length})</div>
    <table class="doc-table">
      <thead>
        <tr>
          <th class="center" style="width: 5%;">#</th>
          <th style="width: 25%;">Milestone Event</th>
          <th style="width: 20%;">Date & Time</th>
          <th style="width: 15%;">Status</th>
          <th style="width: 35%;">Description / Audit Notes</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="5" class="center muted">No milestones selected.</td></tr>'}</tbody>
    </table>
    <div class="doc-totals">Total Milestones Included: ${milestones.length}</div>
    ${renderSignatures(["Verified By", "Technician Signature", "Authorized Signatory"])}
    <div class="doc-footer" style="margin-top: 36px; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; color: #64748b; font-size: 10px;">
        <span>ServiceDesk 360 • Item Service Report</span>
        <span>Track ID: ${escapeHtml(data.trackId)}</span>
        <span>Printed: ${formatDate(new Date())}</span>
      </div>
    </div>`;

  return buildPrintDocument({
    title: `Item Report - ${data.trackId}`,
    toolbarLabel: `Item Report ${data.trackId} (${milestones.length} milestones)`,
    body,
  });
}

/**
 * Direct print trigger for Item Report.
 */
export function printItemReportDirect(
  data: ItemReportData,
  selectedMilestoneIds?: Set<string>,
  onPopupBlocked?: () => void,
): void {
  openPrintWindow(
    generateItemReportHtml(data, selectedMilestoneIds),
    onPopupBlocked,
  );
}
