import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRecordId,
} from "@/lib/format";
import type {
  CustomerReportData,
  ItemReportData,
  VendorReportData,
} from "@/types/reports";
import { escapeHtml } from "./print-report-record";

/**
 * Generates the full HTML for a Customer Report.
 */
export function generateCustomerReportHtml(data: CustomerReportData): string {
  const { summary, materials } = data;
  const now = new Date();
  const generatedDate = formatDate(now);
  const generatedTime = formatDateTime(now).split(",")[1]?.trim() || "";

  const rows = materials
    .map(
      (m, idx) => `
    <tr class="${idx % 2 === 1 ? "bg-alt" : ""}">
      <td class="text-center text-muted">${idx + 1}</td>
      <td class="font-mono font-bold text-primary">${escapeHtml(m.trackId)}</td>
      <td class="text-muted">${escapeHtml(formatDate(m.receivedDate))}</td>
      <td class="font-semibold">
        <div>${escapeHtml(m.product)}</div>
        ${m.complaint ? `<div class="text-sub italic">${escapeHtml(m.complaint)}</div>` : ""}
      </td>
      <td class="font-mono text-muted">${escapeHtml(m.serialNumber)}</td>
      <td class="text-muted">${escapeHtml(m.vendor || "—")}</td>
      <td class="font-semibold">${escapeHtml(m.currentStatus)}</td>
      <td class="text-muted">${escapeHtml(m.location || summary.address || "—")}</td>
    </tr>
  `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Customer Report - ${escapeHtml(summary.customerName)}</title>
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0; padding: 0; background: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .print-page { width: 100%; min-height: 100vh; padding: 24px; display: flex; flex-direction: column; align-items: center; }
      .no-print-bar {
        width: 100%; max-width: 900px; margin-bottom: 16px; display: flex; align-items: center;
        justify-content: space-between; background: #ffffff; padding: 12px 18px; border-radius: 12px;
        border: 1px solid #cbd5e1; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
      }
      .btn {
        display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
        padding: 8px 14px; border-radius: 6px; cursor: pointer; border: none;
      }
      .btn-primary { background-color: #2563eb; color: #ffffff; }
      .btn-primary:hover { background-color: #1d4ed8; }
      .btn-secondary { background-color: #e2e8f0; color: #1e293b; }
      .document-sheet {
        width: 100%; max-width: 900px; background: #ffffff; padding: 36px 40px;
        border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      }
      .header { text-align: center; padding-bottom: 18px; border-bottom: 2px solid #0f172a; }
      .company-name { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; color: #0f172a; margin: 0 0 2px 0; }
      .company-subtitle { font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #475569; margin: 0 0 10px 0; }
      .report-badge { display: inline-block; padding: 4px 16px; border: 1px solid #cbd5e1; background-color: #f1f5f9; border-radius: 4px; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
      .banner { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 12px; }
      .banner-title { font-size: 14px; font-weight: 700; color: #0f172a; }
      .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 8px; }
      .meta-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
      .meta-val { font-size: 12px; font-weight: 600; color: #0f172a; margin-top: 2px; }
      table.data-table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1; margin-top: 14px; }
      table.data-table th, table.data-table td { padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left; }
      table.data-table th { background-color: #f1f5f9; font-weight: 700; color: #0f172a; text-transform: uppercase; font-size: 10px; }
      .bg-alt { background-color: #f8fafc; }
      .font-mono { font-family: ui-monospace, monospace; }
      .font-semibold { font-weight: 600; }
      .font-bold { font-weight: 700; }
      .text-primary { color: #2563eb; }
      .text-muted { color: #475569; }
      .text-sub { font-size: 9.5px; color: #64748b; }
      .text-center { text-align: center; }
      .signatures { margin-top: 28px; padding-top: 18px; border-top: 2px solid #0f172a; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 11px; }
      .footer-note { margin-top: 20px; padding-top: 10px; border-top: 1px dashed #94a3b8; text-align: center; font-size: 9.5px; color: #64748b; }
      @page { size: A4 portrait; margin: 10mm; }
      @media print {
        html, body { background: #ffffff !important; color: #000000 !important; }
        .print-page { padding: 0; background: #ffffff; }
        .no-print, .no-print-bar { display: none !important; }
        .document-sheet { box-shadow: none !important; border: none !important; padding: 0 !important; max-width: 100% !important; }
      }
    </style>
  </head>
  <body>
    <div class="print-page">
      <div class="no-print-bar no-print">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 700; font-size: 13px;">Customer Report Preview</span>
          <span style="font-size: 12px; color: #64748b;">(${materials.length} records)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="btn btn-primary" onclick="window.print()">Print / Save as PDF</button>
          <button type="button" class="btn btn-secondary" onclick="window.close()">Close</button>
        </div>
      </div>

      <div class="document-sheet">
        <div class="header">
          <h1 class="company-name">MARUTHI IT SERVICES</h1>
          <div class="company-subtitle">SERVICE &amp; REPAIR MATERIAL TRACKING SYSTEM</div>
          <div class="report-badge">CUSTOMER REPORT</div>
        </div>

        <div class="banner">
          <div class="banner-title">${escapeHtml(summary.customerName)} ${summary.customerNumber ? `· <span class="font-mono">${escapeHtml(summary.customerNumber)}</span>` : ""}</div>
          <div class="grid-4">
            <div>
              <div class="meta-label">Customer Name</div>
              <div class="meta-val">${escapeHtml(summary.customerName)}</div>
            </div>
            <div>
              <div class="meta-label">Mobile Number</div>
              <div class="meta-val font-mono">${escapeHtml(summary.customerNumber || "—")}</div>
            </div>
            <div>
              <div class="meta-label">Address</div>
              <div class="meta-val">${escapeHtml(summary.address || "—")}</div>
            </div>
            <div>
              <div class="meta-label">Total Items</div>
              <div class="meta-val font-bold text-primary">${materials.length} Items</div>
            </div>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 5%;" class="text-center">#</th>
              <th style="width: 15%;">Track ID</th>
              <th style="width: 12%;">Date</th>
              <th style="width: 25%;">Product</th>
              <th style="width: 14%;">Serial</th>
              <th style="width: 12%;">Vendor</th>
              <th style="width: 10%;">Status</th>
              <th style="width: 7%;">Location</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8" class="text-center text-muted" style="padding: 16px;">No material records found.</td></tr>'}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <div class="text-muted">Generated Date: <strong>${escapeHtml(generatedDate)} ${escapeHtml(generatedTime)}</strong></div>
            <div class="text-sub" style="margin-top: 4px;">System Generated Service Report</div>
          </div>
          <div style="text-align: right;">
            <div style="height: 18px;"></div>
            <div class="font-bold">MARUTHI IT SERVICES</div>
            <div class="text-muted" style="font-size: 10px;">Authorized Signatory</div>
          </div>
        </div>

        <div class="footer-note">
          <p style="margin: 0;">This is an official system-generated service report from MARUTHI IT SERVICES.</p>
        </div>
      </div>
    </div>
    <script>
      (function() {
        window.onafterprint = function() { try { window.close(); } catch (e) {} };
        function doPrint() {
          setTimeout(function() {
            try { window.focus(); window.print(); } catch (e) {}
          }, 300);
        }
        if (document.readyState === 'complete') { doPrint(); } else { window.addEventListener('load', doPrint); }
      })();
    </script>
  </body>
</html>`;
}

/**
 * Generates the full HTML for a Vendor Report.
 */
export function generateVendorReportHtml(data: VendorReportData): string {
  const { summary, materials } = data;
  const now = new Date();
  const generatedDate = formatDate(now);
  const generatedTime = formatDateTime(now).split(",")[1]?.trim() || "";

  const rows = materials
    .map(
      (m, idx) => `
    <tr class="${idx % 2 === 1 ? "bg-alt" : ""}">
      <td class="text-center text-muted">${idx + 1}</td>
      <td class="font-mono font-bold text-primary">${escapeHtml(m.trackId)}</td>
      <td class="text-muted">${escapeHtml(formatDate(m.sentDate))}</td>
      <td class="font-semibold">${escapeHtml(m.customer)}</td>
      <td class="font-semibold">${escapeHtml(m.product)}</td>
      <td class="font-mono text-muted">${escapeHtml(m.serialNumber)}</td>
      <td class="font-semibold">${escapeHtml(m.currentStatus)}</td>
      <td class="text-center font-semibold" style="color: #047857;">${formatCurrency(m.repairCost)}</td>
    </tr>
  `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vendor Report - ${escapeHtml(summary.vendorName)}</title>
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0; padding: 0; background: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .print-page { width: 100%; min-height: 100vh; padding: 24px; display: flex; flex-direction: column; align-items: center; }
      .no-print-bar {
        width: 100%; max-width: 900px; margin-bottom: 16px; display: flex; align-items: center;
        justify-content: space-between; background: #ffffff; padding: 12px 18px; border-radius: 12px;
        border: 1px solid #cbd5e1; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
      }
      .btn {
        display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
        padding: 8px 14px; border-radius: 6px; cursor: pointer; border: none;
      }
      .btn-primary { background-color: #2563eb; color: #ffffff; }
      .btn-primary:hover { background-color: #1d4ed8; }
      .btn-secondary { background-color: #e2e8f0; color: #1e293b; }
      .document-sheet {
        width: 100%; max-width: 900px; background: #ffffff; padding: 36px 40px;
        border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      }
      .header { text-align: center; padding-bottom: 18px; border-bottom: 2px solid #0f172a; }
      .company-name { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; color: #0f172a; margin: 0 0 2px 0; }
      .company-subtitle { font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #475569; margin: 0 0 10px 0; }
      .report-badge { display: inline-block; padding: 4px 16px; border: 1px solid #cbd5e1; background-color: #f1f5f9; border-radius: 4px; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
      .banner { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px 16px; border-radius: 8px; margin: 16px 0; font-size: 12px; }
      .banner-title { font-size: 14px; font-weight: 700; color: #0f172a; }
      .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 8px; }
      .meta-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
      .meta-val { font-size: 12px; font-weight: 600; color: #0f172a; margin-top: 2px; }
      table.data-table { width: 100%; border-collapse: collapse; font-size: 11px; border: 1px solid #cbd5e1; margin-top: 14px; }
      table.data-table th, table.data-table td { padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left; }
      table.data-table th { background-color: #f1f5f9; font-weight: 700; color: #0f172a; text-transform: uppercase; font-size: 10px; }
      .bg-alt { background-color: #f8fafc; }
      .font-mono { font-family: ui-monospace, monospace; }
      .font-semibold { font-weight: 600; }
      .font-bold { font-weight: 700; }
      .text-primary { color: #2563eb; }
      .text-muted { color: #475569; }
      .text-center { text-align: center; }
      .signatures { margin-top: 28px; padding-top: 18px; border-top: 2px solid #0f172a; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 11px; }
      .footer-note { margin-top: 20px; padding-top: 10px; border-top: 1px dashed #94a3b8; text-align: center; font-size: 9.5px; color: #64748b; }
      @page { size: A4 portrait; margin: 10mm; }
      @media print {
        html, body { background: #ffffff !important; color: #000000 !important; }
        .print-page { padding: 0; background: #ffffff; }
        .no-print, .no-print-bar { display: none !important; }
        .document-sheet { box-shadow: none !important; border: none !important; padding: 0 !important; max-width: 100% !important; }
      }
    </style>
  </head>
  <body>
    <div class="print-page">
      <div class="no-print-bar no-print">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 700; font-size: 13px;">Vendor Report Preview</span>
          <span style="font-size: 12px; color: #64748b;">(${materials.length} records)</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="btn btn-primary" onclick="window.print()">Print / Save as PDF</button>
          <button type="button" class="btn btn-secondary" onclick="window.close()">Close</button>
        </div>
      </div>

      <div class="document-sheet">
        <div class="header">
          <h1 class="company-name">MARUTHI IT SERVICES</h1>
          <div class="company-subtitle">SERVICE &amp; REPAIR MATERIAL TRACKING SYSTEM</div>
          <div class="report-badge">VENDOR REPORT</div>
        </div>

        <div class="banner">
          <div class="banner-title">${escapeHtml(summary.vendorName)}</div>
          <div class="grid-4">
            <div>
              <div class="meta-label">Vendor Name</div>
              <div class="meta-val">${escapeHtml(summary.vendorName)}</div>
            </div>
            <div>
              <div class="meta-label">Contact Person</div>
              <div class="meta-val">${escapeHtml(summary.contactPerson || "—")}</div>
            </div>
            <div>
              <div class="meta-label">Phone Number</div>
              <div class="meta-val font-mono">${escapeHtml(summary.phoneNumber || "—")}</div>
            </div>
            <div>
              <div class="meta-label">Total Repair Cost</div>
              <div class="meta-val font-bold" style="color: #047857;">${formatCurrency(summary.totalRepairCost)}</div>
            </div>
          </div>
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 5%;" class="text-center">#</th>
              <th style="width: 14%;">Track ID</th>
              <th style="width: 12%;">Sent Date</th>
              <th style="width: 18%;">Customer</th>
              <th style="width: 22%;">Product</th>
              <th style="width: 12%;">Serial</th>
              <th style="width: 9%;">Status</th>
              <th style="width: 8%;" class="text-center">Cost</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8" class="text-center text-muted" style="padding: 16px;">No material records found.</td></tr>'}
          </tbody>
        </table>

        <div class="signatures">
          <div>
            <div class="text-muted">Generated Date: <strong>${escapeHtml(generatedDate)} ${escapeHtml(generatedTime)}</strong></div>
            <div class="text-sub" style="margin-top: 4px;">System Generated Vendor Report</div>
          </div>
          <div style="text-align: right;">
            <div style="height: 18px;"></div>
            <div class="font-bold">MARUTHI IT SERVICES</div>
            <div class="text-muted" style="font-size: 10px;">Authorized Signatory</div>
          </div>
        </div>

        <div class="footer-note">
          <p style="margin: 0;">This is an official system-generated service report from MARUTHI IT SERVICES.</p>
        </div>
      </div>
    </div>
    <script>
      (function() {
        window.onafterprint = function() { try { window.close(); } catch (e) {} };
        function doPrint() {
          setTimeout(function() {
            try { window.focus(); window.print(); } catch (e) {}
          }, 300);
        }
        if (document.readyState === 'complete') { doPrint(); } else { window.addEventListener('load', doPrint); }
      })();
    </script>
  </body>
</html>`;
}

/**
 * Direct print trigger for Customer Report.
 */
export function printCustomerReportDirect(
  data: CustomerReportData,
  onPopupBlocked?: () => void,
): void {
  const printWindow = window.open(
    "",
    "_blank",
    "width=1000,height=850,resizable=yes,scrollbars=yes",
  );
  if (!printWindow) {
    if (onPopupBlocked) onPopupBlocked();
    return;
  }
  const html = generateCustomerReportHtml(data);
  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  } catch (err) {
    console.error("Error writing customer report window:", err);
  }
}

/**
 * Direct print trigger for Vendor Report.
 */
export function printVendorReportDirect(
  data: VendorReportData,
  onPopupBlocked?: () => void,
): void {
  const printWindow = window.open(
    "",
    "_blank",
    "width=1000,height=850,resizable=yes,scrollbars=yes",
  );
  if (!printWindow) {
    if (onPopupBlocked) onPopupBlocked();
    return;
  }
  const html = generateVendorReportHtml(data);
  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  } catch (err) {
    console.error("Error writing vendor report window:", err);
  }
}
