import { formatDate, formatDateTime, formatRecordId } from "@/lib/format";
import type { ReceivedItemRow } from "@/types/assets";
import {
  buildPrintDocument,
  escapeHtml,
  openPrintWindow,
  renderDocHeader,
  renderInfoCard,
  renderSignatures,
} from "./print-template";

export { escapeHtml };

export type ReceivedMaterialPrintData = {
  trackId: string;
  customerName: string;
  customerNumber: string;
  location: string;
  productName: string;
  brandName: string;
  productModel: string;
  serialNumber: string;
  quantity: number;
  receivedDate: string;
  receivedDateTime: string;
  complaintRemarks: string;
  accessories: string;
  currentStatus: string;
  generatedDate: string;
  printedDateTime: string;
};

/**
 * Normalizes a ReceivedItemRow into a structured print object.
 */
export function normalizeReceivedMaterialData(
  item: ReceivedItemRow,
): ReceivedMaterialPrintData {
  const trackId =
    item.trackId ||
    (item.assetSeq ? formatRecordId("ASSET", item.assetSeq) : "—");

  const productName =
    item.productType === "Other" && item.otherProductType
      ? `Other (${item.otherProductType})`
      : item.productType || "Asset";

  const brandModelParts = [item.brandName, item.modelNumber].filter(Boolean);
  const productModel =
    brandModelParts.length > 0
      ? brandModelParts.join(" - ")
      : item.modelNumber || "—";

  const rawStatus = String(item.itemStatus || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
  const isAvailable =
    !item.dispatchId &&
    (!rawStatus || rawStatus === "received" || rawStatus === "available");
  const currentStatus = isAvailable ? "Available" : "Dispatched to Vendor";

  const complaintRemarks = item.remarks || item.description || "—";
  const accessories = item.accessories || "—";

  return {
    trackId,
    customerName: item.customerName || "—",
    customerNumber: item.customerNumber || "—",
    location: item.location || "—",
    productName,
    brandName: item.brandName || "—",
    productModel,
    serialNumber: item.serialNumber || "—",
    quantity: Number(item.quantity) || 1,
    receivedDate: formatDate(item.createdAt),
    receivedDateTime: formatDateTime(item.createdAt),
    complaintRemarks,
    accessories,
    currentStatus,
    generatedDate: formatDate(new Date()),
    printedDateTime: formatDateTime(new Date()),
  };
}

/**
 * Generates the clean, professional A4 print HTML for a single Received Material record.
 */
export function generateReceivedMaterialHtml(item: ReceivedItemRow): string {
  const data = normalizeReceivedMaterialData(item);

  const body = `
    ${renderDocHeader({
      title: "RECEIVED MATERIAL DETAILS",
      refId: data.trackId,
      date: `Generated: ${data.generatedDate}`,
    })}

    <!-- Customer & Material Summary Cards -->
    <div class="cards" style="margin-bottom: 24px;">
      ${renderInfoCard("Customer Information", [
        `Name: ${data.customerName}`,
        data.customerNumber !== "—" ? `Contact: ${data.customerNumber}` : "",
        data.location !== "—" ? `Location: ${data.location}` : "",
      ])}
      ${renderInfoCard("Receipt Summary", [
        `Track ID: ${data.trackId}`,
        `Received Date: ${data.receivedDateTime}`,
        `Current Status: ${data.currentStatus}`,
      ])}
    </div>

    <!-- Section: Material Information Table -->
    <div class="section-heading" style="margin-bottom: 8px;">Material Information</div>
    <table class="doc-table" style="margin-bottom: 24px;">
      <thead>
        <tr>
          <th style="width: 20%;">Track ID</th>
          <th style="width: 25%;">Product Name</th>
          <th style="width: 25%;">Product Model</th>
          <th style="width: 20%;">Serial Number</th>
          <th class="center" style="width: 10%;">Qty</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="mono bold" style="color: #2563eb;">${escapeHtml(data.trackId)}</td>
          <td class="bold">${escapeHtml(data.productName)}</td>
          <td>${escapeHtml(data.productModel)}</td>
          <td class="mono bold">${escapeHtml(data.serialNumber)}</td>
          <td class="center bold">${escapeHtml(data.quantity)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Section: Detailed Attributes Grid -->
    <div class="section-heading" style="margin-bottom: 8px;">Record & Condition Details</div>
    <div class="card" style="margin-bottom: 28px; padding: 14px 18px;">
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
        <div>
          <div class="kv-label">Received Date</div>
          <div class="kv-value" style="font-size: 13px;">${escapeHtml(data.receivedDateTime)}</div>
        </div>
        <div>
          <div class="kv-label">Current Status</div>
          <div class="kv-value" style="font-size: 13px;">
            <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; background: ${
              data.currentStatus === "Available"
                ? "#ecfdf5; color: #047857; border: 1px solid #a7f3d0;"
                : "#faf5ff; color: #6b21a8; border: 1px solid #e9d5ff;"
            }">
              ${escapeHtml(data.currentStatus)}
            </span>
          </div>
        </div>
        <div>
          <div class="kv-label">Accessories Included</div>
          <div class="kv-value" style="font-size: 12px; color: #334155;">${escapeHtml(data.accessories)}</div>
        </div>
        <div>
          <div class="kv-label">Customer / Handover By</div>
          <div class="kv-value" style="font-size: 12px; color: #334155;">${escapeHtml(data.customerName)}</div>
        </div>
        <div style="grid-column: span 2;">
          <div class="kv-label">Complaint / Remarks</div>
          <div class="kv-value" style="font-size: 12px; color: #1e293b; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; margin-top: 4px; min-height: 38px;">
            ${escapeHtml(data.complaintRemarks)}
          </div>
        </div>
      </div>
    </div>

    <!-- Footer: Signatures -->
    ${renderSignatures(["Received By", "Verified By", "Authorized Signature"])}

    <!-- Document Footer Info -->
    <div class="doc-footer" style="margin-top: 40px; border-top: 1px dashed #cbd5e1; padding-top: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center; color: #64748b; font-size: 10px;">
        <span>ServiceDesk 360 • Asset Management</span>
        <span>Printed: ${escapeHtml(data.printedDateTime)}</span>
        <span>Track ID: ${escapeHtml(data.trackId)}</span>
      </div>
    </div>
  `;

  return buildPrintDocument({
    title: `Received Material - ${data.trackId}`,
    toolbarLabel: `Received Material Details: ${data.trackId}`,
    body,
    extraCss: `
      @page {
        size: A4 portrait;
        margin: 12mm;
      }
      .kv-label {
        font-size: 10px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 2px;
      }
      .kv-value {
        font-weight: 600;
        color: #0f172a;
      }
    `,
  });
}

/**
 * Triggers the browser print dialog for the selected Received Material record
 * in an isolated, professional print window.
 */
export function printReceivedMaterial(
  item: ReceivedItemRow,
  onPopupBlocked?: () => void,
): void {
  openPrintWindow(
    generateReceivedMaterialHtml(item),
    onPopupBlocked,
    "width=1000,height=850",
  );
}
