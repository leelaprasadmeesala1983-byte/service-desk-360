import { formatCurrency, formatDate, formatDateTime, formatRecordId } from "@/lib/format";
import type {
  CustomerMaterialItem,
  CustomerReportData,
  VendorMaterialItem,
  VendorReportData,
} from "@/types/reports";

/**
 * Escapes HTML characters to prevent XSS vulnerabilities in dynamically generated documents.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
 * Generates the complete HTML for a Single Record Service & Dispatch Slip.
 */
export function generateSingleReportRecordHtml(
  record: UnifiedReportRecord,
): string {
  const now = new Date();
  const generatedDate = formatDate(now);
  const generatedTime = formatDateTime(now).split(",")[1]?.trim() || "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Material Service Record - ${escapeHtml(record.trackId)}</title>
    <style>
      * { box-sizing: border-box; }
      html, body {
        margin: 0;
        padding: 0;
        background: #f1f5f9;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #0f172a;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .print-page {
        width: 100%;
        min-height: 100vh;
        padding: 24px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .no-print-bar {
        width: 100%;
        max-width: 860px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: #ffffff;
        padding: 12px 18px;
        border-radius: 12px;
        border: 1px solid #cbd5e1;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
      }
      .btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 600;
        padding: 8px 14px;
        border-radius: 6px;
        cursor: pointer;
        border: none;
        transition: background 0.15s ease;
      }
      .btn-primary { background-color: #2563eb; color: #ffffff; }
      .btn-primary:hover { background-color: #1d4ed8; }
      .btn-secondary { background-color: #e2e8f0; color: #1e293b; }
      .btn-secondary:hover { background-color: #cbd5e1; }
      .document-sheet {
        width: 100%;
        max-width: 860px;
        background: #ffffff;
        padding: 36px 40px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      }
      .header {
        text-align: center;
        padding-bottom: 18px;
        border-bottom: 2px solid #0f172a;
      }
      .company-name {
        font-size: 24px;
        font-weight: 900;
        letter-spacing: -0.5px;
        text-transform: uppercase;
        color: #0f172a;
        margin: 0 0 2px 0;
      }
      .company-subtitle {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #475569;
        margin: 0 0 10px 0;
      }
      .report-badge {
        display: inline-block;
        padding: 4px 16px;
        border: 1px solid #cbd5e1;
        background-color: #f1f5f9;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #0f172a;
      }
      .meta-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        padding: 14px 0;
        border-bottom: 1px solid #0f172a;
        font-size: 12px;
      }
      .meta-col-right {
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }
      .status-pill {
        display: inline-block;
        border: 1px solid #3b82f6;
        background-color: #eff6ff;
        color: #1d4ed8;
        border-radius: 4px;
        padding: 2px 8px;
        font-weight: 700;
        font-size: 10px;
        text-transform: uppercase;
      }
      .cards-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin: 14px 0;
      }
      .info-card {
        border: 1px solid #cbd5e1;
        background-color: #f8fafc;
        border-radius: 8px;
        padding: 12px 16px;
      }
      .card-title {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 6px;
      }
      .card-name {
        font-size: 14px;
        font-weight: 700;
        color: #0f172a;
      }
      .card-sub {
        font-size: 11px;
        color: #334155;
        margin-top: 3px;
        line-height: 1.4;
      }
      .section-heading {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 8px;
      }
      table.materials-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        border: 1px solid #cbd5e1;
      }
      table.materials-table th, table.materials-table td {
        padding: 8px 10px;
        border: 1px solid #cbd5e1;
        text-align: left;
      }
      table.materials-table th {
        background-color: #f1f5f9;
        font-weight: 700;
        color: #0f172a;
        text-transform: uppercase;
        font-size: 10px;
      }
      .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .font-semibold { font-weight: 600; }
      .font-bold { font-weight: 700; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-muted { color: #475569; }
      .details-box {
        margin-top: 14px;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 12px 16px;
        background-color: #f8fafc;
        font-size: 11px;
      }
      .details-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 12px;
      }
      .details-item-label {
        font-weight: 700;
        color: #64748b;
        font-size: 10px;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .details-item-value {
        color: #0f172a;
        font-weight: 600;
      }
      .signature-section {
        margin-top: 28px;
        padding-top: 18px;
        border-top: 2px solid #0f172a;
      }
      .signature-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 20px;
        font-size: 11px;
      }
      .signature-col {
        border-top: 1px solid #0f172a;
        padding-top: 6px;
      }
      .footer-note {
        margin-top: 24px;
        padding-top: 10px;
        border-top: 1px dashed #94a3b8;
        text-align: center;
        font-size: 9.5px;
        color: #64748b;
        line-height: 1.4;
      }
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
      @media print {
        html, body {
          background: #ffffff !important;
          color: #000000 !important;
          margin: 0;
          padding: 0;
        }
        .print-page { padding: 0; background: #ffffff; }
        .no-print, .no-print-bar { display: none !important; }
        .document-sheet {
          box-shadow: none !important;
          border: none !important;
          padding: 0 !important;
          max-width: 100% !important;
        }
      }
    </style>
  </head>
  <body>
    <div class="print-page">
      <!-- Control Bar -->
      <div class="no-print-bar no-print">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 700; font-size: 13px;">Material Service Document</span>
          <span class="font-mono" style="font-weight: 700; font-size: 12px; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 4px;">
            ${escapeHtml(record.trackId)}
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button type="button" class="btn btn-primary" onclick="window.print()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print / Save as PDF
          </button>
          <button type="button" class="btn btn-secondary" onclick="window.close()">Close</button>
        </div>
      </div>

      <!-- Printable Sheet -->
      <div class="document-sheet">
        <!-- 1. Header -->
        <div class="header">
          <h1 class="company-name">MARUTHI IT SERVICES</h1>
          <div class="company-subtitle">SERVICE &amp; REPAIR MATERIAL TRACKING SYSTEM</div>
          <div class="report-badge">INDIVIDUAL MATERIAL SERVICE SLIP</div>
        </div>

        <!-- 2. Meta Info -->
        <div class="meta-grid">
          <div>
            <div><strong>Track ID:</strong> <span class="font-mono font-bold" style="color: #2563eb;">${escapeHtml(record.trackId)}</span></div>
            <div style="margin-top: 4px;"><strong>Generated:</strong> <span>${escapeHtml(generatedDate)} ${escapeHtml(generatedTime)}</span></div>
          </div>
          <div class="meta-col-right">
            <div><strong>Status:</strong> <span class="status-pill">${escapeHtml(record.currentStatus)}</span></div>
            <div style="margin-top: 4px;"><strong>Repair Status:</strong> <span class="font-semibold">${escapeHtml(record.repairStatus.replace(/_/g, " "))}</span></div>
          </div>
        </div>

        <!-- 3. Customer & Vendor Details -->
        <div class="cards-grid">
          <div class="info-card">
            <div class="card-title">Customer Information</div>
            <div class="card-name">${escapeHtml(record.customerName)}</div>
            ${record.customerContact && record.customerContact !== "—" ? `<div class="card-sub"><strong>Contact:</strong> ${escapeHtml(record.customerContact)}</div>` : ""}
            ${record.customerLocation && record.customerLocation !== "—" ? `<div class="card-sub"><strong>Location:</strong> ${escapeHtml(record.customerLocation)}</div>` : ""}
          </div>

          <div class="info-card">
            <div class="card-title">Vendor & Service Center</div>
            <div class="card-name">${escapeHtml(record.vendorName)}</div>
            <div class="card-sub"><strong>Repair Charges:</strong> <span class="font-bold" style="color: #047857;">${formatCurrency(record.repairCost)}</span></div>
            <div class="card-sub"><strong>Status:</strong> ${escapeHtml(record.repairStatus.replace(/_/g, " "))}</div>
          </div>
        </div>

        <!-- 4. Material Table -->
        <div style="margin: 16px 0;">
          <div class="section-heading">Material Details</div>
          <table class="materials-table">
            <thead>
              <tr>
                <th style="width: 20%;">Track ID</th>
                <th style="width: 30%;">Product</th>
                <th style="width: 25%;">Serial Number</th>
                <th style="width: 25%;">Complaint / Issue</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="font-mono font-bold" style="color: #2563eb;">${escapeHtml(record.trackId)}</td>
                <td class="font-semibold">${escapeHtml(record.productName)}</td>
                <td class="font-mono">${escapeHtml(record.serialNumber)}</td>
                <td class="text-muted">${escapeHtml(record.complaint || "Service & Repair")}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 5. Lifecycle Milestones -->
        <div class="details-box">
          <div class="section-heading" style="margin-bottom: 8px;">Lifecycle Milestones &amp; Dates</div>
          <div class="details-grid">
            <div>
              <div class="details-item-label">Received Date</div>
              <div class="details-item-value">${formatDate(record.receivedDate)}</div>
            </div>
            <div>
              <div class="details-item-label">Sent to Vendor</div>
              <div class="details-item-value">${formatDate(record.sentDate)}</div>
            </div>
            <div>
              <div class="details-item-label">Vendor Return</div>
              <div class="details-item-value">${formatDate(record.vendorReceivedDate)}</div>
            </div>
            <div>
              <div class="details-item-label">Customer Return</div>
              <div class="details-item-value">${formatDate(record.returnedDate)}</div>
            </div>
          </div>
        </div>

        <!-- 6. Signatures -->
        <div class="signature-section">
          <div class="signature-grid">
            <div class="signature-col">
              <div class="font-semibold">Service Desk Admin</div>
              <div class="text-muted" style="font-size: 10px; margin-top: 4px;">Prepared By</div>
            </div>
            <div class="signature-col" style="text-align: center;">
              <div style="height: 15px;"></div>
              <div class="text-muted" style="font-size: 10px; margin-top: 4px;">Customer / Receiver Signature</div>
            </div>
            <div class="signature-col" style="text-align: right;">
              <div class="font-semibold">MARUTHI IT SERVICES</div>
              <div class="text-muted" style="font-size: 10px; margin-top: 4px;">Authorized Signatory</div>
            </div>
          </div>
        </div>

        <!-- 7. Footer -->
        <div class="footer-note">
          <p style="margin: 0;">This is an official system-generated Material Service Slip from MARUTHI IT SERVICES.</p>
        </div>
      </div>
    </div>

    <script>
      (function() {
        window.onafterprint = function() {
          try { window.close(); } catch (e) {}
        };
        function doPrint() {
          setTimeout(function() {
            try {
              window.focus();
              window.print();
            } catch (e) { console.error(e); }
          }, 300);
        }
        if (document.readyState === 'complete') {
          doPrint();
        } else {
          window.addEventListener('load', doPrint);
        }
      })();
    </script>
  </body>
</html>`;
}

/**
 * Directly prints / generates the Individual Record PDF document in an isolated popup window.
 */
export function printSingleReportRecord(
  record: UnifiedReportRecord,
  onPopupBlocked?: () => void,
): void {
  const printWindow = window.open(
    "",
    "_blank",
    "width=1000,height=850,resizable=yes,scrollbars=yes",
  );

  if (!printWindow) {
    if (onPopupBlocked) {
      onPopupBlocked();
    }
    return;
  }

  const html = generateSingleReportRecordHtml(record);

  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  } catch (err) {
    console.error("Error writing to record print window:", err);
  }
}
