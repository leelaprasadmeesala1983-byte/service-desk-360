import jsPDF from "jspdf";
import type {
  TechnicianDetailedReport,
  TechnicianMonthlySummaryReport,
} from "@/db/queries/technician-reports";
import { formatDateTime } from "@/lib/format";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Color palette matching the modern UI
const primaryColor: [number, number, number] = [30, 41, 59]; // Slate 800
const secondaryColor: [number, number, number] = [71, 85, 105]; // Slate 600
const lightGray: [number, number, number] = [241, 245, 249]; // Slate 100
const borderColor: [number, number, number] = [226, 232, 240]; // Slate 200
const accentColor: [number, number, number] = [37, 99, 235]; // Blue 600
const darkText: [number, number, number] = [15, 23, 42]; // Slate 900

/**
 * Generates and downloads a PDF for the Monthly Technician Summary Report.
 */
export function exportMonthlyTechnicianSummaryPdf(
  report: TechnicianMonthlySummaryReport,
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

  const monthName = MONTH_NAMES[report.month - 1] || `Month ${report.month}`;

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin - 12) {
      doc.addPage();
      y = margin;
      drawPageDivider();
    }
  }

  function drawPageDivider() {
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  // --- Header Banner ---
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...primaryColor);
  doc.text("Technician Productivity Report", margin + 5, y + 9);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.text(
    `Period: ${monthName} ${report.year} (${report.startDate} to ${report.endDate})`,
    margin + 5,
    y + 16,
  );
  doc.text(`Generated on: ${formatDateTime(new Date())}`, margin + 5, y + 21);

  // Stats badge on the right
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...accentColor);
  doc.text(
    `Total Worked Days: ${report.stats.totalWorkedDays}`,
    pageWidth - margin - 5,
    y + 11,
    { align: "right" },
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text(
    `${report.technicians.length} Technicians Analyzed`,
    pageWidth - margin - 5,
    y + 18,
    { align: "right" },
  );

  y += 30;

  // --- Summary Cards Grid ---
  const colWidth = (contentWidth - 9) / 4;
  const cards = [
    { label: "Total Technicians", val: `${report.stats.totalTechnicians}` },
    { label: "Project Days", val: `${report.stats.projectWorkDays}` },
    { label: "Installation Days", val: `${report.stats.installationWorkDays}` },
    { label: "Service Days", val: `${report.stats.serviceWorkDays}` },
  ];

  cards.forEach((card, i) => {
    const cardX = margin + i * (colWidth + 3);
    doc.setFillColor(...lightGray);
    doc.roundedRect(cardX, y, colWidth, 14, 1.5, 1.5, "F");
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, y, colWidth, 14, 1.5, 1.5, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...secondaryColor);
    doc.text(card.label, cardX + 3, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...darkText);
    doc.text(card.val, cardX + 3, y + 11);
  });

  y += 20;

  // --- Table Header ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...primaryColor);
  doc.text("Technician Work Days Summary", margin, y);
  y += 4;

  const colX = {
    sno: margin,
    name: margin + 12,
    dept: margin + 65,
    prj: margin + 105,
    ins: margin + 128,
    srv: margin + 151,
    total: margin + 172,
  };

  doc.setFillColor(...primaryColor);
  doc.rect(margin, y, contentWidth, 7.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text("S.No", colX.sno + 2, y + 5);
  doc.text("Technician Name", colX.name, y + 5);
  doc.text("Department", colX.dept, y + 5);
  doc.text("Project", colX.prj, y + 5);
  doc.text("Installation", colX.ins, y + 5);
  doc.text("Service", colX.srv, y + 5);
  doc.text("Total Days", colX.total, y + 5);

  y += 7.5;

  // --- Table Rows ---
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  if (report.technicians.length === 0) {
    checkPageBreak(12);
    doc.setTextColor(...secondaryColor);
    doc.text(
      "No technician work records found for this period.",
      margin + 5,
      y + 6,
    );
    y += 10;
  } else {
    report.technicians.forEach((tech, index) => {
      checkPageBreak(8);

      if (index % 2 === 1) {
        doc.setFillColor(...lightGray);
        doc.rect(margin, y, contentWidth, 7, "F");
      }

      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.2);
      doc.line(margin, y + 7, pageWidth - margin, y + 7);

      doc.setTextColor(...secondaryColor);
      doc.text(String(index + 1), colX.sno + 2, y + 4.8);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkText);
      const nameText = doc.splitTextToSize(tech.technicianName, 50);
      doc.text(nameText[0] || tech.technicianName, colX.name, y + 4.8);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...secondaryColor);
      doc.text(tech.department || "—", colX.dept, y + 4.8);

      doc.setTextColor(...darkText);
      doc.text(`${tech.projectDays} d`, colX.prj, y + 4.8);
      doc.text(`${tech.installationDays} d`, colX.ins, y + 4.8);
      doc.text(`${tech.serviceDays} d`, colX.srv, y + 4.8);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...accentColor);
      doc.text(`${tech.totalWorkedDays} days`, colX.total, y + 4.8);
      doc.setFont("helvetica", "normal");

      y += 7;
    });
  }

  // --- Page Numbering on All Pages ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...secondaryColor);
    doc.text(
      "Service Desk 360 • Technician Productivity Summary",
      margin,
      pageHeight - 5.5,
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 5.5,
      {
        align: "right",
      },
    );
  }

  const safeFilename =
    `Technician_Summary_${monthName}_${report.year}.pdf`.replace(
      /[^a-zA-Z0-9_\-.]/g,
      "_",
    );
  doc.save(safeFilename);
}

/**
 * Generates and downloads a detailed breakdown PDF for an individual technician.
 */
export function exportTechnicianDetailedPdf(
  report: TechnicianDetailedReport,
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

  const monthName = MONTH_NAMES[report.month - 1] || `Month ${report.month}`;

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin - 12) {
      doc.addPage();
      y = margin;
      drawPageDivider();
    }
  }

  function drawPageDivider() {
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.4);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  // --- Header Banner ---
  doc.setFillColor(...lightGray);
  doc.roundedRect(margin, y, contentWidth, 26, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...primaryColor);
  doc.text(report.technician.name, margin + 5, y + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);
  doc.text(
    `Department: ${report.technician.department || "General"}  •  Email: ${report.technician.email}`,
    margin + 5,
    y + 14,
  );
  doc.text(
    `Report Period: ${monthName} ${report.year}  •  Exported on: ${formatDateTime(new Date())}`,
    margin + 5,
    y + 20,
  );

  // Total Worked Days Badge
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...accentColor);
  doc.text(
    `${report.summary.totalWorkedDays} Worked Days`,
    pageWidth - margin - 5,
    y + 11,
    { align: "right" },
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...secondaryColor);
  doc.text(
    `Unique calendar work dates in ${monthName}`,
    pageWidth - margin - 5,
    y + 18,
    { align: "right" },
  );

  y += 32;

  // --- Summary Metrics Row ---
  const colWidth = (contentWidth - 6) / 3;
  const cards = [
    { label: "Project Work Days", val: `${report.summary.projectDays} days` },
    {
      label: "Installation Work Days",
      val: `${report.summary.installationDays} days`,
    },
    { label: "Service Work Days", val: `${report.summary.serviceDays} days` },
  ];

  cards.forEach((card, i) => {
    const cardX = margin + i * (colWidth + 3);
    doc.setFillColor(...lightGray);
    doc.roundedRect(cardX, y, colWidth, 13, 1.5, 1.5, "F");
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, y, colWidth, 13, 1.5, 1.5, "S");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...secondaryColor);
    doc.text(card.label, cardX + 3, y + 4.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...darkText);
    doc.text(card.val, cardX + 3, y + 10);
  });

  y += 18;

  function renderBreakdownSection(
    title: string,
    items: typeof report.projects,
    typeLabel: string,
  ) {
    checkPageBreak(18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...primaryColor);
    doc.text(`${title} (${items.length})`, margin, y);
    y += 4;

    const colX = {
      id: margin,
      title: margin + 28,
      customer: margin + 85,
      first: margin + 125,
      last: margin + 148,
      days: margin + 170,
    };

    doc.setFillColor(...primaryColor);
    doc.rect(margin, y, contentWidth, 6.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("ID", colX.id + 2, y + 4.5);
    doc.text("Title / Description", colX.title, y + 4.5);
    doc.text("Customer", colX.customer, y + 4.5);
    doc.text("First Date", colX.first, y + 4.5);
    doc.text("Last Date", colX.last, y + 4.5);
    doc.text("Days", colX.days, y + 4.5);

    y += 6.5;

    if (items.length === 0) {
      checkPageBreak(8);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...secondaryColor);
      doc.text(
        `No ${typeLabel.toLowerCase()} tasks worked on during this period.`,
        margin + 3,
        y + 5,
      );
      y += 8;
      return;
    }

    items.forEach((item, index) => {
      checkPageBreak(7.5);

      if (index % 2 === 1) {
        doc.setFillColor(...lightGray);
        doc.rect(margin, y, contentWidth, 6.5, "F");
      }

      doc.setDrawColor(...borderColor);
      doc.setLineWidth(0.2);
      doc.line(margin, y + 6.5, pageWidth - margin, y + 6.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...accentColor);
      doc.text(item.recordId, colX.id + 2, y + 4.5);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...darkText);
      const titleSnippet = doc.splitTextToSize(item.title || "—", 52);
      doc.text(titleSnippet[0] || "—", colX.title, y + 4.5);

      const custSnippet = doc.splitTextToSize(item.customerName || "—", 36);
      doc.setTextColor(...secondaryColor);
      doc.text(custSnippet[0] || "—", colX.customer, y + 4.5);

      doc.text(item.firstWorkDate, colX.first, y + 4.5);
      doc.text(item.lastWorkDate, colX.last, y + 4.5);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...darkText);
      doc.text(`${item.workedDays} d`, colX.days, y + 4.5);

      y += 6.5;
    });

    y += 5;
  }

  // 1. Projects Breakdown
  renderBreakdownSection("Project Work", report.projects, "Projects");

  // 2. Installations Breakdown
  renderBreakdownSection(
    "Installation Work",
    report.installations,
    "Installations",
  );

  // 3. Services Breakdown
  renderBreakdownSection("Service Request Work", report.services, "Services");

  // --- Page Numbering on All Pages ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...secondaryColor);
    doc.text(
      `Service Desk 360 • ${report.technician.name} • ${monthName} ${report.year}`,
      margin,
      pageHeight - 5.5,
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 5.5,
      {
        align: "right",
      },
    );
  }

  const safeTechName = report.technician.name.replace(/\s+/g, "_");
  const safeFilename =
    `${safeTechName}_Work_Report_${monthName}_${report.year}.pdf`.replace(
      /[^a-zA-Z0-9_\-.]/g,
      "_",
    );
  doc.save(safeFilename);
}
