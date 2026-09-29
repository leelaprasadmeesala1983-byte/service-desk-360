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

export type ReceiptMaterialItem = {
  trackId: string;
  productName: string;
  details: string;
  serialNumber: string;
};

export type CustomerReturnReceiptData = {
  dispatchId: string;
  status: string;
  issueDate: string;
  receivedAt: string;
  customer: {
    name: string;
    contact: string;
  };
  vendor: {
    name: string;
    contact: string;
  };
  materials: ReceiptMaterialItem[];
  courier: string;
  referenceNo: string;
};

/**
 * Transforms a raw SendToVendorRow into a normalized receipt data object.
 */
export function normalizeCustomerReturnReceiptData(
  row: SendToVendorRow,
): CustomerReturnReceiptData {
  const dispatchId = row.seq ? formatRecordId("STV", row.seq) : row.id || "—";

  const rawItems = Array.isArray(row.items) ? row.items : [];
  const materials: ReceiptMaterialItem[] =
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
          };
        })
      : [
          {
            trackId: row.assetSeq ? formatRecordId("ASSET", row.assetSeq) : "—",
            productName: row.assetName || "Product",
            details: "—",
            serialNumber: row.serialNumber || "—",
          },
        ];

  const customerName = row.customerName || row.asset?.customerName || "—";
  const customerContact = row.asset?.customerNumber || row.phoneNumber || "—";

  const vendorName = row.vendorName || "—";
  const vendorContact = row.contactPerson || "—";

  const receivedAt = row.customerReceivedAt
    ? formatDateTime(row.customerReceivedAt)
    : row.updatedAt
      ? formatDateTime(row.updatedAt)
      : formatDateTime(new Date());

  const issueDate = row.customerReceivedAt
    ? formatDate(row.customerReceivedAt)
    : row.updatedAt
      ? formatDate(row.updatedAt)
      : formatDate(new Date());

  const courier = row.courierName || "Direct Handover";
  const referenceNo = row.docketAwbNumber || "";

  return {
    dispatchId,
    status: "CUSTOMER RECEIVED",
    issueDate,
    receivedAt,
    customer: {
      name: customerName,
      contact: customerContact,
    },
    vendor: {
      name: vendorName,
      contact: vendorContact,
    },
    materials,
    courier,
    referenceNo,
  };
}

/**
 * Generates the complete, self-contained HTML and CSS for the receipt.
 */
export function generateCustomerReturnReceiptHtml(
  data: CustomerReturnReceiptData,
): string {
  const materialsRows = data.materials
    .map(
      (m) => `
      <tr>
        <td class="col-track-id">${escapeHtml(m.trackId)}</td>
        <td class="col-product font-semibold">${escapeHtml(m.productName)}</td>
        <td class="col-details text-muted">${escapeHtml(m.details)}</td>
        <td class="col-serial font-mono">${escapeHtml(m.serialNumber)}</td>
      </tr>
    `,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Customer Return Receipt - ${escapeHtml(data.dispatchId)}</title>
    <style>
      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        color: #111827;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .print-page {
        width: 100%;
        min-height: 100vh;
        padding: 24px;
        display: flex;
        justify-content: center;
        background: #f8fafc;
      }

      .receipt {
        width: 100%;
        max-width: 850px;
        margin: 0 auto;
        background: #ffffff;
        padding: 28px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
      }

      .receipt-header {
        text-align: center;
        padding-bottom: 20px;
        border-bottom: 2px solid #18181b;
      }

      .company-name {
        font-size: 24px;
        font-weight: 900;
        letter-spacing: -0.5px;
        text-transform: uppercase;
        color: #18181b;
        margin: 0 0 2px 0;
      }

      .company-subtitle {
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: #52525b;
        margin: 0 0 12px 0;
      }

      .receipt-badge {
        display: inline-block;
        padding: 4px 16px;
        border: 1px solid #d4d4d8;
        background-color: #f4f4f5;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.025em;
        text-transform: uppercase;
        color: #18181b;
      }

      .divider {
        border-top: 1px solid #18181b;
        margin: 14px 0;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        font-size: 12px;
        line-height: 1.6;
      }

      .info-col-right {
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .status-pill {
        display: inline-block;
        border: 1px solid #10b981;
        background-color: #ecfdf5;
        color: #047857;
        border-radius: 4px;
        padding: 2px 8px;
        font-weight: 700;
        font-size: 10px;
        text-transform: uppercase;
        margin-left: 6px;
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
        border-radius: 6px;
        padding: 12px 14px;
      }

      .card-title {
        font-size: 10px;
        font-weight: 700;
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
        font-size: 12px;
        color: #475569;
        margin-top: 3px;
      }

      .section-heading {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #64748b;
        margin-bottom: 8px;
      }

      .material-table-wrapper {
        width: 100%;
        overflow-x: auto;
      }

      table.material-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }

      table.material-table th,
      table.material-table td {
        padding: 8px 10px;
        text-align: left;
        border-bottom: 1px solid #e2e8f0;
      }

      table.material-table th {
        font-weight: 700;
        background-color: #f1f5f9;
        border-bottom: 1px solid #0f172a;
        color: #0f172a;
      }

      .col-track-id {
        width: 22%;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-weight: 700;
        color: #0f172a;
      }

      .col-product {
        width: 28%;
      }

      .col-details {
        width: 26%;
      }

      .col-serial {
        width: 24%;
      }

      .font-semibold {
        font-weight: 600;
      }

      .font-mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      }

      .text-muted {
        color: #475569;
      }

      .courier-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        padding: 8px 0;
        font-size: 12px;
      }

      .acknowledgement-section {
        margin-top: 24px;
      }

      .acknowledgement-title {
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        color: #64748b;
        text-align: center;
        margin-bottom: 24px;
      }

      .signature-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 24px;
      }

      .signature-col {
        border-top: 1px solid #0f172a;
        padding-top: 6px;
        font-size: 11px;
      }

      .footer-note {
        border-top: 1px dashed #94a3b8;
        margin-top: 28px;
        padding-top: 10px;
        text-align: center;
        font-size: 10px;
        color: #64748b;
      }

      @media (max-width: 768px) {
        .print-page {
          padding: 12px;
        }

        .receipt {
          padding: 16px;
        }

        .cards-grid,
        .info-grid,
        .courier-grid {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .info-col-right {
          text-align: left;
          align-items: flex-start;
        }
      }

      @page {
        size: A4 portrait;
        margin: 12mm;
      }

      @media print {
        html,
        body {
          width: 100%;
          margin: 0;
          padding: 0;
          background: #ffffff;
        }

        .print-page {
          padding: 0;
          min-height: auto;
          background: #ffffff;
          display: block;
        }

        .receipt {
          width: 100%;
          max-width: none;
          box-shadow: none;
          border: none;
          padding: 0;
        }

        .no-print {
          display: none !important;
        }
      }
    </style>
  </head>

  <body>
    <div class="print-page">
      <div class="receipt">
        <!-- 1. Header -->
        <div class="receipt-header">
          <h1 class="company-name">MARUTHI IT SERVICES</h1>
          <div class="company-subtitle">SERVICE &amp; REPAIR MATERIAL TRACKING SYSTEM</div>
          <div class="receipt-badge">CUSTOMER RETURN RECEIPT</div>
        </div>

        <!-- 2. Meta Info -->
        <div class="info-grid">
          <div>
            <div><strong>Dispatch / Receipt ID:</strong> <span class="font-mono font-semibold">${escapeHtml(data.dispatchId)}</span></div>
            <div style="margin-top: 4px;"><strong>Issue Date:</strong> ${escapeHtml(data.issueDate)}</div>
          </div>
          <div class="info-col-right">
            <div><strong>Status:</strong> <span class="status-pill">${escapeHtml(data.status)}</span></div>
            <div style="margin-top: 4px;"><strong>Received At:</strong> <span class="font-mono font-semibold">${escapeHtml(data.receivedAt)}</span></div>
          </div>
        </div>

        <div class="divider"></div>

        <!-- 3. Customer & Vendor Details -->
        <div class="cards-grid">
          <div class="info-card">
            <div class="card-title">Customer Details</div>
            <div class="card-name">${escapeHtml(data.customer.name)}</div>
            ${data.customer.contact !== "—" ? `<div class="card-sub">Contact: ${escapeHtml(data.customer.contact)}</div>` : ""}
          </div>
          <div class="info-card">
            <div class="card-title">Vendor Serviced By</div>
            <div class="card-name">${escapeHtml(data.vendor.name)}</div>
            ${data.vendor.contact !== "—" ? `<div class="card-sub">Contact: ${escapeHtml(data.vendor.contact)}</div>` : ""}
          </div>
        </div>

        <div class="divider"></div>

        <!-- 4. Returned Material Details -->
        <div style="margin: 14px 0;">
          <div class="section-heading">Returned Material Details</div>
          <div class="material-table-wrapper">
            <table class="material-table">
              <thead>
                <tr>
                  <th class="col-track-id">Track ID</th>
                  <th class="col-product">Product</th>
                  <th class="col-details">Details</th>
                  <th class="col-serial">Serial No.</th>
                </tr>
              </thead>
              <tbody>
                ${materialsRows}
              </tbody>
            </table>
          </div>
        </div>

        <div class="divider"></div>

        <!-- 5. Courier Details -->
        <div class="courier-grid">
          <div>
            <span class="text-muted">Courier / Handover:</span>
            <div class="font-semibold" style="margin-top: 2px;">${escapeHtml(data.courier)}</div>
          </div>
          ${
            data.referenceNo
              ? `
          <div>
            <span class="text-muted">Docket / Reference No.:</span>
            <div class="font-mono font-semibold" style="margin-top: 2px;">${escapeHtml(data.referenceNo)}</div>
          </div>
          `
              : ""
          }
        </div>

        <div class="divider"></div>

        <!-- 6. Customer Acknowledgement -->
        <div class="acknowledgement-section">
          <div class="acknowledgement-title">Customer Acknowledgement</div>
          <div class="signature-grid">
            <div class="signature-col">
              <div class="font-semibold">${escapeHtml(data.customer.name)}</div>
              <div class="text-muted" style="font-size: 10px; margin-top: 4px;">Customer Name</div>
            </div>
            <div class="signature-col" style="text-align: center;">
              <div style="height: 16px;"></div>
              <div class="text-muted" style="font-size: 10px; margin-top: 4px;">Authorized Signature</div>
            </div>
            <div class="signature-col" style="text-align: right;">
              <div class="font-semibold">${escapeHtml(data.issueDate)}</div>
              <div class="text-muted" style="font-size: 10px; margin-top: 4px;">Received Date</div>
            </div>
          </div>
        </div>

        <!-- 7. Footer -->
        <div class="footer-note">
          <p style="margin: 0;">This is an official system-generated Material Return Receipt from MARUTHI IT SERVICES.</p>
          <p style="margin: 3px 0 0 0;">Materials received in verified and satisfactory condition.</p>
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
          }, 250);
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
 * Executes direct printing in a dedicated, isolated window without altering the parent application route or state.
 */
export function printCustomerReturnReceipt(
  row: SendToVendorRow,
  onPopupBlocked?: () => void,
): void {
  const printWindow = window.open(
    "",
    "_blank",
    "width=1000,height=800,resizable=yes,scrollbars=yes",
  );

  if (!printWindow) {
    if (onPopupBlocked) {
      onPopupBlocked();
    }
    return;
  }

  const normalizedData = normalizeCustomerReturnReceiptData(row);
  const html = generateCustomerReturnReceiptHtml(normalizedData);

  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  } catch (err) {
    console.error("Error writing to receipt print window:", err);
  }
}
