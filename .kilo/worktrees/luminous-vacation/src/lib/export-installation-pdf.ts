import jsPDF from "jspdf";
import type { InstallationRow } from "@/db/queries/installations";
import { RECORD_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export function exportInstallationToPdf(record: InstallationRow): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Color palette
  const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800
  const secondaryColor: [number, number, number] = [71, 85, 105]; // Slate 600
  const lightGray: [number, number, number] = [241, 245, 249]; // Slate 100
  const borderColor: [number, number, number] = [226, 232, 240]; // Slate 200
  const accentColor: [number, number, number] = [37, 99, 235]; // Blue 600

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin - 12) {
      doc.addPage();
      y = margin;
      drawPageHeader();
    }
  }

  function drawPageHeader() {
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  // --- Top Header Banner ---
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...primaryColor);
  doc.text("Installation Details", margin + 5, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.text(`Exported on: ${formatDateTime(new Date())}`, margin + 5, y + 17);

  // Status & Record Badge on the right
  const statusText = RECORD_STATUS_LABELS[record.status] || record.status;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...accentColor);
  doc.text(record.recordId, pageWidth - margin - 5, y + 10, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.text(`Status: ${statusText}`, pageWidth - margin - 5, y + 17, {
    align: "right",
  });

  y += 30;

  // --- Helper to draw a section header ---
  function drawSectionTitle(title: string) {
    checkPageBreak(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(title, margin, y);
    y += 2;
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + 25, y);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(margin + 25, y, pageWidth - margin, y);
    y += 6;
  }

  // --- Helper to draw a 2-column key-value grid row ---
  function drawTwoColumnRow(
    leftLabel: string,
    leftVal: string,
    rightLabel: string,
    rightVal: string,
  ) {
    checkPageBreak(12);
    const colWidth = (contentWidth - 6) / 2;
    const col1X = margin;
    const col2X = margin + colWidth + 6;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);
    doc.text(leftLabel, col1X, y);
    if (rightLabel) {
      doc.text(rightLabel, col2X, y);
    }

    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...primaryColor);

    const leftLines = doc.splitTextToSize(leftVal || "—", colWidth);
    doc.text(leftLines, col1X, y);

    let maxLineCount = leftLines.length;
    if (rightLabel) {
      const rightLines = doc.splitTextToSize(rightVal || "—", colWidth);
      doc.text(rightLines, col2X, y);
      maxLineCount = Math.max(maxLineCount, rightLines.length);
    }

    y += maxLineCount * 4.5 + 3;
  }

  // --- Helper to draw full-width text field (e.g. address, description) ---
  function drawFullWidthField(label: string, value: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...secondaryColor);

    const lines = doc.splitTextToSize(value || "—", contentWidth - 4);
    const neededHeight = 5 + lines.length * 4.5 + 3;
    checkPageBreak(neededHeight);

    doc.text(label, margin, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...primaryColor);
    doc.text(lines, margin, y);

    y += lines.length * 4.5 + 3;
  }

  // 1. Customer & General Information
  drawSectionTitle("Customer & General Information");
  drawTwoColumnRow(
    "Customer Name",
    record.customerName,
    "Contact Number",
    record.contactNumber,
  );
  drawTwoColumnRow(
    "Email Address",
    record.email,
    "S.No / Reference ID",
    record.referenceNo || "—",
  );
  drawFullWidthField("Customer Address", record.address);

  y += 3;

  // 2. Installation & Assignment Details
  drawSectionTitle("Installation & Assignment Details");
  const techDisplay =
    record.technicianNames && record.technicianNames.length > 0
      ? record.technicianNames.join(", ")
      : record.technicianName
        ? record.technicianDepartment
          ? `${record.technicianName} (${record.technicianDepartment})`
          : record.technicianName
        : "Unassigned";

  drawTwoColumnRow(
    "Assigned Technician(s)",
    techDisplay,
    "Current Status",
    statusText,
  );
  drawTwoColumnRow(
    "Created Date",
    formatDateTime(record.createdAt),
    "Last Updated Date",
    formatDateTime(record.updatedAt),
  );
  drawFullWidthField("Installation Description", record.description);

  // NOTE: Account & Credentials are strictly excluded from the PDF.

  // --- Page Numbering on All Pages ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...secondaryColor);
    doc.text("Service Desk 360 • Installation Record", margin, pageHeight - 7);
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 7, {
      align: "right",
    });
  }

  // Trigger download
  const safeFilename =
    `${record.recordId || "Installation"}_Details.pdf`.replace(
      /[^a-zA-Z0-9_\-.]/g,
      "_",
    );
  doc.save(safeFilename);
}
