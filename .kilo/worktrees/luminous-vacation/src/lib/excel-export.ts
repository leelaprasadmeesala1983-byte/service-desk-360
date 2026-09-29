import * as XLSX from "xlsx";

import type { RecordStatus } from "@/lib/constants";

type ExcelCell = string | number | boolean | null | undefined;

type ExcelHeader = {
  label: string;
  width?: number;
};

type BuildExcelParams = {
  sheetName: string;
  headers: (string | ExcelHeader)[];
  rows: ExcelCell[][];
};

/**
 * Builds a genuine OpenXML XLSX spreadsheet workbook using SheetJS (xlsx)
 * and returns it as a Base64-encoded string.
 */
function buildExcelSpreadsheet({
  sheetName,
  headers,
  rows,
}: BuildExcelParams): string {
  const headerLabels = headers.map((h) =>
    typeof h === "string" ? h : h.label,
  );

  const sanitizedRows = rows.map((row) =>
    row.map((cell) => (cell === null || cell === undefined ? "" : cell)),
  );

  const aoa = [headerLabels, ...sanitizedRows];
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);

  // Set intelligent column widths based on headers and cell contents
  const colWidths = headerLabels.map((label, colIndex) => {
    let maxLen = label.length;
    for (let r = 0; r < sanitizedRows.length; r++) {
      const val = sanitizedRows[r][colIndex];
      if (val !== null && val !== undefined) {
        const len = String(val).length;
        if (len > maxLen) maxLen = len;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
  });
  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  const safeSheetName = (sheetName || "Sheet1")
    .replace(/[*?:/\\[\]]/g, " ")
    .slice(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);

  const base64 = XLSX.write(workbook, {
    type: "base64",
    bookType: "xlsx",
  });

  return base64;
}

/**
 * Client-side helper to convert Base64 XLSX data to a genuine binary file and trigger a browser download.
 */
function downloadExcelBase64(base64Data: string, filename: string): void {
  const cleanBase64 = base64Data.replace(/^data:.*?;base64,/, "").trim();

  try {
    const wb = XLSX.read(cleanBase64, { type: "base64" });
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.error("XLSX.writeFile failed, falling back to manual Blob:", err);
    const binaryString = window.atob(cleanBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const blob = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Returns canonical export filename according to the module and status.
 */
function getExportFilename(
  moduleName:
    | "service-management"
    | "installation-management"
    | "project-management",
  status?: RecordStatus | "ALL" | string,
): string {
  const normStatus = (status || "ALL").toUpperCase();
  let statusSuffix = "all";

  if (normStatus === "OPEN") {
    statusSuffix = "open";
  } else if (normStatus === "IN_PROGRESS") {
    statusSuffix = "in-progress";
  } else if (normStatus === "CLOSED") {
    statusSuffix = "closed";
  } else if (normStatus !== "ALL") {
    statusSuffix = normStatus.toLowerCase().replace(/_/g, "-");
  }

  return `${moduleName}-${statusSuffix}.xlsx`;
}

export type { ExcelCell, ExcelHeader, BuildExcelParams };
export { buildExcelSpreadsheet, downloadExcelBase64, getExportFilename };
