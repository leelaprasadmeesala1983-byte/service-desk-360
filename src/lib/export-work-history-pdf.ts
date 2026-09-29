import jsPDF from "jspdf";

import type { WorkHistoryItem } from "@/db/queries/work-history";
import { RECORD_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export type WorkHistoryExportContext = {
  recordId: string;
  customerName: string;
  phone: string;
  category?: string;
  address?: string;
  status: string;
};

export function exportWorkHistoryToPdf(
  context: WorkHistoryExportContext,
  items: WorkHistoryItem[],
): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const secondaryColor: [number, number, number] = [71, 85, 105]; // Slate 600
  const lightGray: [number, number, number] = [248, 250, 252]; // Slate 50
  const borderColor: [number, number, number] = [226, 232, 240]; // Slate 200
  const accentColor: [number, number, number] = [37, 99, 235]; // Blue 600

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin - 10) {
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

  // Header Banner
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...primaryColor);
  doc.text(`Work History Report — ${context.recordId}`, margin + 5, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text(
    `Customer: ${context.customerName}  •  Phone: ${context.phone}  •  Status: ${context.status}`,
    margin + 5,
    y + 16,
  );
  doc.text(
    `Generated on: ${formatDateTime(new Date())}  •  Total Logs: ${items.length}`,
    margin + 5,
    y + 21,
  );

  y += 28;

  // Logs List
  if (items.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.text("No work history records found.", margin + 5, y + 10);
    doc.save(`Work-History-${context.recordId}.pdf`);
    return;
  }

  items.forEach((item, _index) => {
    const techText =
      item.technicianNames.length > 0
        ? item.technicianNames.join(", ")
        : "Unassigned";

    const dateStr = item.workDate;
    const timeStr = formatDateTime(item.workDateTime);
    const statusText =
      RECORD_STATUS_LABELS[item.status as keyof typeof RECORD_STATUS_LABELS] ||
      item.status;
    const isInitial = item.recordType === "INITIAL_REQUEST" || item.isInitial;
    const isStatusChange = item.recordType === "STATUS_CHANGE";
    const recordTypeLabel = isStatusChange
      ? "Closed"
      : isInitial
        ? "Initial Request"
        : "Work Log";

    const lines = doc.splitTextToSize(
      item.description || "No description provided.",
      contentWidth - 12,
    );
    const cardHeight = 22 + lines.length * 4.5;

    checkPageBreak(cardHeight + 4);

    // Card background
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentWidth, cardHeight, 1.5, 1.5, "FD");

    // Left accent bar (blue for initial, slate for closed, emerald for work log)
    const barColor: [number, number, number] = isInitial
      ? accentColor
      : isStatusChange
        ? [100, 116, 139]
        : [16, 185, 129];
    doc.setFillColor(...barColor);
    doc.rect(margin, y, 2.5, cardHeight, "F");

    // Title / Date Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...primaryColor);
    doc.text(
      `[${recordTypeLabel.toUpperCase()}]  •  Date: ${dateStr}`,
      margin + 6,
      y + 6,
    );

    // Status & Time on Right
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...secondaryColor);
    doc.text(`Time: ${timeStr}  •  Status: ${statusText}`, margin + 6, y + 11);

    // Technicians
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    doc.text(`Technician(s): `, margin + 6, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...secondaryColor);
    doc.text(techText, margin + 28, y + 16);

    // Description
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...primaryColor);
    let lineY = y + 21;
    for (const line of lines) {
      doc.text(line, margin + 6, lineY);
      lineY += 4.5;
    }

    y += cardHeight + 4;
  });

  doc.save(`Work-History-${context.recordId}.pdf`);
}

export function exportWorkHistoryToCsv(
  context: WorkHistoryExportContext,
  items: WorkHistoryItem[],
): void {
  const headers = [
    "Service ID",
    "Customer Name",
    "Customer Phone",
    "Category",
    "Record Type",
    "Work Date",
    "Work Time",
    "Technicians",
    "Status",
    "Notes / Description",
    "Logged By",
    "Logged At",
  ];

  const rows = items.map((item) => {
    const isInitial = item.recordType === "INITIAL_REQUEST" || item.isInitial;
    const isStatusChange = item.recordType === "STATUS_CHANGE";
    const recordTypeLabel = isStatusChange
      ? "Closed"
      : isInitial
        ? "Initial Request"
        : "Work Log";
    return [
      `"${context.recordId}"`,
      `"${context.customerName.replace(/"/g, '""')}"`,
      `"${context.phone}"`,
      `"${context.category ?? ""}"`,
      `"${recordTypeLabel}"`,
      `"${item.workDate}"`,
      `"${formatDateTime(item.workDateTime)}"`,
      `"${item.technicianNames.join(", ").replace(/"/g, '""')}"`,
      `"${RECORD_STATUS_LABELS[item.status as keyof typeof RECORD_STATUS_LABELS] || item.status}"`,
      `"${(item.description || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
      `"${item.createdByName ?? ""}"`,
      `"${formatDateTime(item.createdAt)}"`,
    ];
  });

  const csvContent =
    "data:text/csv;charset=utf-8," +
    [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Work-History-${context.recordId}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
