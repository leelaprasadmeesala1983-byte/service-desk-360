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

export type DispatchMaterialItem = {
  trackId: string;
  productName: string;
  details: string;
  brand: string;
  model: string;
  complaint: string;
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
            brand: prod.brandName || "",
            model: prod.modelNumber || "",
            complaint: row.reasonForRepair || "",
            serialNumber: prod.serialNumber || "—",
            quantity: Number(prod.quantity) || 1,
          };
        })
      : [
          {
            trackId: row.assetSeq ? formatRecordId("ASSET", row.assetSeq) : "—",
            productName: row.assetName || "Product",
            details: "—",
            brand: "",
            model: "",
            complaint: row.reasonForRepair || "",
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

  const rawStatus = (
    row.repairStatus ||
    row.status ||
    "SENT_TO_VENDOR"
  ).replace(/_/g, " ");

  const packagesCount = Number(row.noOfPackages ?? row.numberOfPackages) || 1;

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
 * Generates the Vendor Dispatch ("Material sent for repair") document.
 */
function renderDispatchBody(data: VendorDispatchDocumentData): string {
  const rows = data.materials
    .map(
      (m, idx) => `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="mono">${escapeHtml(m.trackId)}</td>
        <td>${escapeHtml(m.productName)}</td>
        <td>${escapeHtml(m.brand)}</td>
        <td>${escapeHtml(m.model)}</td>
        <td class="mono bold">${escapeHtml(m.serialNumber)}</td>
        <td class="center">${m.quantity}</td>
        <td>${escapeHtml(m.complaint)}</td>
      </tr>`,
    )
    .join("");
  const totalQty = data.materials.reduce((sum, m) => sum + m.quantity, 0);

  return `
    ${renderDocHeader({
      title: "Material Sent for Repair",
      refId: data.dispatchId,
      date: data.dispatchDate,
    })}
    <div class="cards">
      ${renderInfoCard("Vendor", [
        data.vendor.name,
        data.vendor.address,
        [data.vendor.contact, data.vendor.phone]
          .filter((v) => v && v !== "—")
          .join(" "),
      ])}
      ${renderInfoCard("Courier", [
        data.courier,
        data.docketAwbNumber !== "—" ? `Docket: ${data.docketAwbNumber}` : "",
        `Packages: ${data.numberOfPackages}`,
      ])}
    </div>
    <table class="doc-table">
      <thead>
        <tr>
          <th class="center">#</th><th>Track ID</th><th>Product</th><th>Brand</th>
          <th>Model</th><th>Serial No</th><th class="center">Qty</th><th>Complaint</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="doc-totals">Total Quantity: ${totalQty} &nbsp;|&nbsp; Total Items: ${data.materials.length}</div>
    ${renderSignatures(["Prepared By", "Checked By", "Vendor Signature"])}`;
}

export function generateVendorDispatchHtml(
  data: VendorDispatchDocumentData,
): string {
  const body = renderDispatchBody(data);
  return buildPrintDocument({
    title: `Vendor Dispatch - ${data.dispatchId}`,
    toolbarLabel: `Vendor Dispatch ${data.dispatchId}`,
    body,
  });
}

/**
 * Directly prints / generates the Vendor Dispatch PDF document in an isolated popup window.
 */
export function printVendorDispatch(
  row: SendToVendorRow,
  onPopupBlocked?: () => void,
): void {
  openPrintWindow(
    generateVendorDispatchHtml(normalizeVendorDispatchDocumentData(row)),
    onPopupBlocked,
  );
}

/**
 * Generates one HTML document with every selected dispatch on its own page,
 * each in the same layout as a single dispatch print.
 */
export function generateVendorDispatchListHtml(
  rows: SendToVendorRow[],
): string {
  const docs = rows.map(normalizeVendorDispatchDocumentData);
  const body = docs
    .map(
      (d, i) =>
        `<section${i > 0 ? ' class="dispatch-page"' : ""}>${renderDispatchBody(d)}</section>`,
    )
    .join("");

  return buildPrintDocument({
    title:
      docs.length === 1
        ? `Vendor Dispatch - ${docs[0].dispatchId}`
        : `Vendor Dispatches (${docs.length})`,
    body,
    extraCss:
      ".dispatch-page { break-before: page; page-break-before: always; margin-top: 40px; } @media print { .dispatch-page { margin-top: 0; } }",
  });
}

/**
 * Prints several dispatch records together in a single table.
 */
export function printVendorDispatches(
  rows: SendToVendorRow[],
  onPopupBlocked?: () => void,
): void {
  openPrintWindow(generateVendorDispatchListHtml(rows), onPopupBlocked);
}
