import { formatDate, formatDateTime, formatRecordId } from "@/lib/format";
import type { SendToVendorRow } from "@/types/send-to-vendor";

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

export type DispatchMaterialItem = {
  trackId: string;
  productName: string;
  details: string;
  serialNumber: string;
  quantity: number;
};

export type VendorDispatchDocumentData = {
  dispatchId: string;
  trackId: string;
  status: string;
  dispatchDate: string;
  createdDate: string;
  numberOfPackages: number;
  customer: {
    name: string;
    contact: string;
  };
  vendor: {
    name: string;
    contact: string;
    phone: string;
    address: string;
  };
  materials: DispatchMaterialItem[];
  courier: string;
  docketAwbNumber: string;
  reasonForRepair: string;
  remarks: string;
  dispatchRemarks: string;
  createdByName: string;
};

/**
 * Transforms a SendToVendorRow into a normalized dispatch document data object.
 */
export function normalizeVendorDispatchDocumentData(
  row: SendToVendorRow,
): VendorDispatchDocumentData {
  const dispatchId = row.seq ? formatRecordId("STV", row.seq) : row.id || "—";

  const rawItems = Array.isArray(row.items) ? row.items : [];
  const primaryTrackId =
    rawItems[0]?.trackId ||
    (row.assetSeq ? formatRecordId("ASSET", row.assetSeq) : "—");

  const materials: DispatchMaterialItem[] =
    rawItems.length > 0
      ? rawItems.map((prod) => {
          const detailsParts = [prod.brandName, prod.modelNumber].filter(
            Boolean,
          );
          return {
            trackId:
              prod.trackId ||
              (row.assetSeq ? formatRecordId("ASSET", row.assetSeq) : "—"),
            productName: prod.productName || "Product",
            details: detailsParts.length > 0 ? detailsParts.join(" - ") : "—",
            serialNumber: prod.serialNumber || "—",
            quantity: Number(prod.quantity) || 1,
          };
        })
      : [
          {
            trackId: row.assetSeq ? formatRecordId("ASSET", row.assetSeq) : "—",
            productName: row.assetName || "Product",
            details: "—",
            serialNumber: row.serialNumber || "—",
            quantity: 1,
          },
        ];

  const customerName = row.customerName || row.asset?.customerName || "—";
  const customerContact = row.asset?.customerNumber || row.phoneNumber || "—";

  const vendorName = row.vendorName || "—";
  const vendorContact = row.contactPerson || "—";
  const vendorPhone = row.phoneNumber || "—";
  const vendorAddress = row.address || "—";

  const dispatchDate = row.bookingDate
    ? formatDate(row.bookingDate)
    : formatDate(row.createdAt);

  const createdDate = formatDateTime(row.createdAt);

  const rawStatus = (row.repairStatus || row.status || "SENT_TO_VENDOR").replace(
    /_/g,
    " ",
  );

  const packagesCount =
    Number(row.noOfPackages ?? row.numberOfPackages) || 1;

  return {
    dispatchId,
    trackId: primaryTrackId,
    status: rawStatus.toUpperCase(),
    dispatchDate,
    createdDate,
    numberOfPackages: packagesCount,
    customer: {
      name: customerName,
      contact: customerContact,
    },
    vendor: {
      name: vendorName,
      contact: vendorContact,
      phone: vendorPhone,
      address: vendorAddress,
    },
    materials,
    courier: row.courierName || "Direct Handover",
    docketAwbNumber: row.docketAwbNumber || "—",
    reasonForRepair: row.reasonForRepair || "—",
    remarks: row.remarks || "",
    dispatchRemarks: row.dispatchRemarks || "",
    createdByName: row.createdByName || "System Admin",
  };
}

/**
 * Generates the complete, self-contained HTML and CSS for the Vendor Dispatch PDF/Print Document.
 */
export function generateVendorDispatchHtml(
  data: VendorDispatchDocumentData,
): string {
  const materialsRows = data.materials
    .map(
      (m, idx) => `
      <tr>
        <td class="col-sno text-center">${idx + 1}</td>
        <td class="col-track-id font-mono font-bold">${escapeHtml(m.trackId)}</td>
        <td class="col-product font-semibold">${escapeHtml(m.productName)}</td>
        <td class="col-details text-muted">${escapeHtml(m.details)}</td>
        <td class="col-serial font-mono">${escapeHtml(m.serialNumber)}</td>
        <td class="col-qty text-center font-bold">${m.quantity}</td>
      </tr>
    `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vendor Dispatch Slip - ${escapeHtml(data.dispatchId)}</title>
    <style>
      * {
        box-sizing: border-box;
      }

      html,
      body {
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

      .btn-primary {
        background-color: #2563eb;
        color: #ffffff;
      }

      .btn-primary:hover {
        background-color: #1d4ed8;
      }

      .btn-secondary {
        background-color: #e2e8f0;
        color: #1e293b;
      }

      .btn-secondary:hover {
        background-color: #cbd5e1;
      }

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

      .packages-pill {
        display: inline-block;
        border: 1px solid #0f172a;
        background-color: #f8fafc;
        color: #0f172a;
        border-radius: 4px;
        padding: 2px 8px;
        font-weight: 700;
        font-size: 11px;
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

      table.materials-table th,
      table.materials-table td {
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

      .col-sno {
        width: 5%;
      }

      .col-track-id {
        width: 20%;
        color: #1d4ed8;
      }

      .col-product {
        width: 27%;
      }

      .col-details {
        width: 24%;
      }

      .col-serial {
        width: 18%;
      }

      .col-qty {
        width: 6%;
      }

      .font-mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      .font-semibold {
        font-weight: 600;
      }

      .font-bold {
        font-weight: 700;
      }

      .text-center {
        text-align: center;
      }

      .text-muted {
        color: #475569;
      }

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
        grid-template-columns: 1fr 1fr;
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
        font-weight: 500;
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
        html,
        body {
          background: #ffffff !important;
          color: #000000 !important;
          margin: 0;
          padding: 0;
        }

        .print-page {
          padding: 0;
          background: #ffffff;
        }

        .no-print,
        .no-print-bar {
          display: none !important;
        }

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
      <!-- On-Screen Control Bar -->
      <div class="no-print-bar no-print">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-weight: 700; font-size: 13px;">Vendor Dispatch Document</span>
          <span class="font-mono" style="font-weight: 700; font-size: 12px; color: #2563eb; background: #eff6ff; padding: 2px 8px; border-radius: 4px;">
            ${escapeHtml(data.dispatchId)}
          </span>
          <span style="font-size: 11px; color: #64748b;">(${data.materials.length} material(s), ${data.numberOfPackages} package(s))</span>
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
          <button type="button" class="btn btn-secondary" onclick="window.close()">
            Close
          </button>
        </div>
      </div>

      <!-- Printable Document Sheet -->
      <div class="document-sheet">
        <!-- 1. Header -->
        <div class="header">
          <h1 class="company-name">MARUTHI IT SERVICES</h1>
          <div class="company-subtitle">SERVICE &amp; REPAIR MATERIAL TRACKING SYSTEM</div>
          <div class="report-badge">VENDOR DISPATCH SLIP</div>
        </div>

        <!-- 2. Meta Info Grid -->
        <div class="meta-grid">
          <div>
            <div><strong>Dispatch ID:</strong> <span class="font-mono font-bold">${escapeHtml(data.dispatchId)}</span></div>
            <div style="margin-top: 4px;"><strong>Dispatch Date:</strong> <span class="font-semibold">${escapeHtml(data.dispatchDate)}</span></div>
          </div>
          <div class="meta-col-right">
            <div><strong>Status:</strong> <span class="status-pill">${escapeHtml(data.status)}</span></div>
            <div style="margin-top: 4px;">
              <strong>No. of Packages:</strong>
              <span class="packages-pill">${data.numberOfPackages}</span>
            </div>
          </div>
        </div>

        <!-- 3. Customer & Vendor Details -->
        <div class="cards-grid">
          <div class="info-card">
            <div class="card-title">Consignee / Vendor Details</div>
            <div class="card-name">${escapeHtml(data.vendor.name)}</div>
            ${data.vendor.contact !== "—" ? `<div class="card-sub"><strong>Attn:</strong> ${escapeHtml(data.vendor.contact)}</div>` : ""}
            ${data.vendor.phone !== "—" ? `<div class="card-sub"><strong>Phone:</strong> ${escapeHtml(data.vendor.phone)}</div>` : ""}
            ${data.vendor.address !== "—" ? `<div class="card-sub"><strong>Address:</strong> ${escapeHtml(data.vendor.address)}</div>` : ""}
          </div>

          <div class="info-card">
            <div class="card-title">Customer & Origin Details</div>
            <div class="card-name">${escapeHtml(data.customer.name)}</div>
            ${data.customer.contact !== "—" ? `<div class="card-sub"><strong>Contact:</strong> ${escapeHtml(data.customer.contact)}</div>` : ""}
            <div class="card-sub"><strong>Track Reference:</strong> <span class="font-mono">${escapeHtml(data.trackId)}</span></div>
            <div class="card-sub"><strong>Created Date:</strong> ${escapeHtml(data.createdDate)}</div>
          </div>
        </div>

        <!-- 4. Dispatched Materials Table -->
        <div style="margin: 16px 0;">
          <div class="section-heading">Dispatched Materials (${data.materials.length} Item(s))</div>
          <table class="materials-table">
            <thead>
              <tr>
                <th class="col-sno text-center">#</th>
                <th class="col-track-id">Track ID</th>
                <th class="col-product">Product</th>
                <th class="col-details">Details</th>
                <th class="col-serial">Serial Number</th>
                <th class="col-qty text-center">Qty</th>
              </tr>
            </thead>
            <tbody>
              ${materialsRows}
            </tbody>
          </table>
        </div>

        <!-- 5. Courier & Repair Logistics -->
        <div class="details-box">
          <div class="section-heading" style="margin-bottom: 8px;">Logistics &amp; Repair Details</div>
          <div class="details-grid">
            <div>
              <div class="details-item-label">Courier / Logistics Carrier</div>
              <div class="details-item-value font-semibold">${escapeHtml(data.courier)}</div>
            </div>
            <div>
              <div class="details-item-label">Docket / AWB Tracking Number</div>
              <div class="details-item-value font-mono font-bold">${escapeHtml(data.docketAwbNumber)}</div>
            </div>
            <div>
              <div class="details-item-label">Reason for Repair / Issue Description</div>
              <div class="details-item-value">${escapeHtml(data.reasonForRepair)}</div>
            </div>
            <div>
              <div class="details-item-label">Total Packages</div>
              <div class="details-item-value font-bold">${data.numberOfPackages} Package(s)</div>
            </div>
          </div>

          ${
            data.remarks || data.dispatchRemarks
              ? `
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1;">
            ${data.remarks ? `<div><span class="details-item-label">Additional Notes: </span><span class="details-item-value">${escapeHtml(data.remarks)}</span></div>` : ""}
            ${data.dispatchRemarks ? `<div style="margin-top: 4px;"><span class="details-item-label">Dispatch Remarks: </span><span class="details-item-value">${escapeHtml(data.dispatchRemarks)}</span></div>` : ""}
          </div>
          `
              : ""
          }
        </div>

        <!-- 6. Signatures & Acknowledgement -->
        <div class="signature-section">
          <div class="signature-grid">
            <div class="signature-col">
              <div class="font-semibold">${escapeHtml(data.createdByName)}</div>
              <div class="text-muted" style="font-size: 10px; margin-top: 4px;">Prepared / Dispatched By</div>
            </div>
            <div class="signature-col" style="text-align: center;">
              <div style="height: 15px;"></div>
              <div class="text-muted" style="font-size: 10px; margin-top: 4px;">Carrier / Courier Receiver Signature</div>
            </div>
            <div class="signature-col" style="text-align: right;">
              <div class="font-semibold">MARUTHI IT SERVICES</div>
              <div class="text-muted" style="font-size: 10px; margin-top: 4px;">Authorized Signatory</div>
            </div>
          </div>
        </div>

        <!-- 7. Footer -->
        <div class="footer-note">
          <p style="margin: 0;">This is an official system-generated Vendor Dispatch Note from MARUTHI IT SERVICES.</p>
          <p style="margin: 3px 0 0 0;">All items listed above have been dispatched for authorized repair/service.</p>
        </div>
      </div>
    </div>

    <script>
      (function() {
        window.onafterprint = function() {
          try {
            window.close();
          } catch (e) {}
        };

        function doPrint() {
          setTimeout(function() {
            try {
              window.focus();
              window.print();
            } catch (e) {
              console.error(e);
            }
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
 * Directly prints / generates the Vendor Dispatch PDF document in an isolated popup window.
 */
export function printVendorDispatch(
  row: SendToVendorRow,
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

  const normalizedData = normalizeVendorDispatchDocumentData(row);
  const html = generateVendorDispatchHtml(normalizedData);

  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  } catch (err) {
    console.error("Error writing to vendor dispatch print window:", err);
  }
}

/**
 * Generates one HTML document listing every selected dispatch in a single table
 * (one row per dispatched material).
 */
export function generateVendorDispatchListHtml(
  rows: SendToVendorRow[],
): string {
  const docs = rows.map(normalizeVendorDispatchDocumentData);
  let sNo = 0;
  const bodyRows = docs
    .flatMap((d) =>
      d.materials.map((m) => {
        sNo += 1;
        return `
      <tr>
        <td class="text-center">${sNo}</td>
        <td class="font-mono font-bold">${escapeHtml(d.dispatchId)}</td>
        <td class="font-mono">${escapeHtml(m.trackId)}</td>
        <td>${escapeHtml(d.customer.name)}</td>
        <td><strong>${escapeHtml(m.productName)}</strong>${
          m.details !== "—"
            ? `<div class="muted">${escapeHtml(m.details)}</div>`
            : ""
        }</td>
        <td class="font-mono">${escapeHtml(m.serialNumber)}</td>
        <td class="text-center">${m.quantity}</td>
        <td>${escapeHtml(d.vendor.name)}</td>
        <td>${escapeHtml(d.dispatchDate)}</td>
        <td>${escapeHtml(d.status)}</td>
      </tr>`;
      }),
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Vendor Dispatch List</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; padding: 24px; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h1 { margin: 0; font-size: 20px; text-transform: uppercase; text-align: center; }
      .sub { text-align: center; font-size: 12px; color: #475569; margin: 4px 0 14px; padding-bottom: 12px; border-bottom: 2px solid #0f172a; }
      .toolbar { margin-bottom: 14px; }
      .toolbar button { font-size: 12px; font-weight: 600; padding: 8px 14px; border: none; border-radius: 6px; cursor: pointer; background: #2563eb; color: #fff; margin-right: 6px; }
      .toolbar button.secondary { background: #e2e8f0; color: #1e293b; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; }
      tr { page-break-inside: avoid; }
      .text-center { text-align: center; }
      .font-mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
      .font-bold { font-weight: 700; }
      .muted { color: #475569; font-size: 10px; }
      @page { size: A4 landscape; margin: 10mm; }
      @media print { .toolbar { display: none !important; } body { padding: 0; } }
    </style>
  </head>
  <body>
    <div class="toolbar">
      <button type="button" onclick="window.print()">Print / Save as PDF</button>
      <button type="button" class="secondary" onclick="window.close()">Close</button>
    </div>
    <h1>MARUTHI IT SERVICES</h1>
    <div class="sub">Vendor Dispatch List &mdash; ${docs.length} dispatch(es), ${sNo} item(s) &middot; ${escapeHtml(formatDateTime(new Date().toISOString()))}</div>
    <table>
      <thead>
        <tr>
          <th class="text-center">S.No</th><th>Dispatch ID</th><th>Track ID</th><th>Customer</th><th>Product</th><th>Serial Number</th><th class="text-center">Qty</th><th>Vendor</th><th>Dispatch Date</th><th>Status</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
    <script>
      window.addEventListener('load', function () {
        setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 300);
      });
    </script>
  </body>
</html>`;
}

/**
 * Prints several dispatch records together in a single table.
 */
export function printVendorDispatches(
  rows: SendToVendorRow[],
  onPopupBlocked?: () => void,
): void {
  const printWindow = window.open(
    "",
    "_blank",
    "width=1100,height=850,resizable=yes,scrollbars=yes",
  );

  if (!printWindow) {
    onPopupBlocked?.();
    return;
  }

  try {
    printWindow.document.open();
    printWindow.document.write(generateVendorDispatchListHtml(rows));
    printWindow.document.close();
    printWindow.focus();
  } catch (err) {
    console.error("Error writing to vendor dispatch list print window:", err);
  }
}
