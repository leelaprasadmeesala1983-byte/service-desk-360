import { formatDate, formatDateTime, formatRecordId } from "@/lib/format";
import type { SendToVendorRow } from "@/types/send-to-vendor";
import {
  buildPrintDocument,
  escapeHtml,
  openPrintWindow,
  renderDocHeader,
  renderInfoCard,
  renderSignatures,
} from "./print-template";

export { escapeHtml };

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
 * Generates the complete, self-contained HTML for the receipt.
 */
export function generateCustomerReturnReceiptHtml(
  data: CustomerReturnReceiptData,
): string {
  const rows = data.materials
    .map(
      (m, idx) => `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="mono">${escapeHtml(m.trackId)}</td>
        <td>${escapeHtml(m.productName)}</td>
        <td>${escapeHtml(m.details)}</td>
        <td class="mono bold">${escapeHtml(m.serialNumber)}</td>
      </tr>`,
    )
    .join("");

  const body = `
    ${renderDocHeader({
      title: "Customer Return Receipt",
      refId: data.dispatchId,
      date: data.issueDate,
    })}
    <div class="cards">
      ${renderInfoCard("Customer", [data.customer.name, data.customer.contact])}
      ${renderInfoCard("Courier", [
        data.courier,
        data.referenceNo ? `Docket: ${data.referenceNo}` : "",
        `Serviced by: ${data.vendor.name}`,
      ])}
    </div>
    <table class="doc-table">
      <thead>
        <tr><th class="center">#</th><th>Track ID</th><th>Product</th><th>Details</th><th>Serial No</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="doc-totals">Total Items: ${data.materials.length}</div>
    ${renderSignatures(["Prepared By", "Checked By", "Customer Signature"])}`;

  return buildPrintDocument({
    title: `Customer Return Receipt - ${data.dispatchId}`,
    body,
  });
}

/**
 * Executes direct printing in a dedicated, isolated window without altering the parent application route or state.
 */
export function printCustomerReturnReceipt(
  row: SendToVendorRow,
  onPopupBlocked?: () => void,
): void {
  openPrintWindow(
    generateCustomerReturnReceiptHtml(normalizeCustomerReturnReceiptData(row)),
    onPopupBlocked,
    "width=1000,height=800",
  );
}
