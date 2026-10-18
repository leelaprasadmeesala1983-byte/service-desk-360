/**
 * Shared MARUTHI IT SERVICES print/PDF template.
 *
 * Layout: logo (left) + document no/date (right), blue rule, centered letter-spaced
 * title, bordered info cards, light-grid table, totals line, signature lines.
 * Every HTML print document goes through `buildPrintDocument` so they all match.
 */

export const PRINT_LOGO_PATH = "/maruthi-logo.png";

export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Popup documents are written into about:blank, so the logo needs an absolute URL. */
function logoUrl(): string {
  if (typeof window === "undefined") return PRINT_LOGO_PATH;
  return `${window.location.origin}${PRINT_LOGO_PATH}`;
}

export const PRINT_TEMPLATE_CSS = `
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0; background: #f1f5f9;
    font-family: "Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    color: #0f172a; font-size: 12px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .print-page { width: 100%; min-height: 100vh; padding: 24px; display: flex; flex-direction: column; align-items: center; }
  .no-print-bar {
    width: 100%; max-width: 900px; margin-bottom: 16px; display: flex; align-items: center;
    justify-content: space-between; background: #fff; padding: 12px 18px; border-radius: 12px;
    border: 1px solid #cbd5e1;
  }
  .btn { font-size: 12px; font-weight: 600; padding: 8px 14px; border-radius: 6px; cursor: pointer; border: none; margin-left: 6px; }
  .btn-primary { background: #2563eb; color: #fff; }
  .btn-secondary { background: #e2e8f0; color: #1e293b; }
  .document-sheet { width: 100%; max-width: 900px; background: #fff; padding: 36px 40px; border: 1px solid #e2e8f0; }

  .doc-header { display: flex; justify-content: space-between; align-items: flex-start; }
  .doc-logo { height: 84px; width: auto; display: block; margin-left: -8px; }
  .doc-ref { text-align: right; font-size: 12px; color: #334155; line-height: 1.5; }
  .doc-ref-id { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 800; font-size: 13px; color: #0f172a; }
  .doc-rule { height: 3px; background: #2563eb; margin: 8px 0 22px; }
  .doc-title { margin: 0 0 22px; text-align: center; font-size: 17px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #0f172a; }

  .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 20px; }
  .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px 16px; line-height: 1.45; }
  .card-label { font-weight: 700; color: #334155; margin-bottom: 2px; }
  .card-line { color: #0f172a; }

  table.doc-table { width: 100%; border-collapse: collapse; font-size: 11.5px; border: 1px solid #cbd5e1; }
  table.doc-table th, table.doc-table td { padding: 8px 10px; border: 1px solid #cbd5e1; text-align: left; vertical-align: top; }
  table.doc-table th { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #0f172a; background: #fff; }
  table.doc-table tr { page-break-inside: avoid; }

  .doc-totals { text-align: right; font-weight: 700; margin-top: 10px; font-size: 12px; }
  .section-heading { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; margin: 18px 0 8px; }
  .kv-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .kv-label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }
  .kv-value { font-weight: 600; margin-top: 2px; }

  .doc-signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; margin-top: 56px; }
  .doc-signature { border-top: 2px solid #0f172a; padding-top: 8px; text-align: center; color: #334155; }

  .doc-footer { margin-top: 28px; text-align: center; font-size: 10px; color: #64748b; }

  .mono { font-family: ui-monospace, Menlo, Consolas, monospace; }
  .bold { font-weight: 700; }
  .center { text-align: center; }
  .muted { color: #475569; }

  @media print {
    html, body { background: #fff !important; }
    .print-page { padding: 0; background: #fff; display: block; min-height: auto; }
    .no-print-bar { display: none !important; }
    .document-sheet { border: none !important; padding: 0 !important; max-width: 100% !important; }
  }
`;

export type DocHeaderOptions = {
  title: string;
  /** Document number shown top-right (e.g. DISP-2026-0001). */
  refId?: string;
  /** Pre-formatted date shown under the document number. */
  date?: string;
};

export function renderDocHeader({ title, refId, date }: DocHeaderOptions) {
  return `
    <div class="doc-header">
      <img class="doc-logo" src="${escapeHtml(logoUrl())}" alt="MARUTHI IT SERVICES" />
      <div class="doc-ref">
        ${refId ? `<div class="doc-ref-id">${escapeHtml(refId)}</div>` : ""}
        ${date ? `<div>${escapeHtml(date)}</div>` : ""}
      </div>
    </div>
    <div class="doc-rule"></div>
    <h1 class="doc-title">${escapeHtml(title)}</h1>`;
}

export function renderInfoCard(
  label: string,
  lines: Array<string | null | undefined>,
) {
  const body = lines
    .filter((l): l is string => Boolean(l) && l !== "—")
    .map((l) => `<div class="card-line">${escapeHtml(l)}</div>`)
    .join("");
  return `<div class="card"><div class="card-label">${escapeHtml(label)}</div>${body}</div>`;
}

export function renderSignatures(
  labels: string[] = ["Prepared By", "Checked By", "Vendor Signature"],
) {
  return `<div class="doc-signatures">${labels
    .map((l) => `<div class="doc-signature">${escapeHtml(l)}</div>`)
    .join("")}</div>`;
}

export type PrintDocumentOptions = {
  title: string;
  body: string;
  landscape?: boolean;
  toolbarLabel?: string;
  extraCss?: string;
};

export function buildPrintDocument({
  title,
  body,
  landscape = false,
  toolbarLabel,
  extraCss = "",
}: PrintDocumentOptions): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
    <style>
      ${PRINT_TEMPLATE_CSS}
      ${landscape ? ".document-sheet, .no-print-bar { max-width: 1200px; }" : ""}
      @page { size: A4 ${landscape ? "landscape" : "portrait"}; margin: 10mm; }
      ${extraCss}
    </style>
  </head>
  <body>
    <div class="print-page">
      <div class="no-print-bar">
        <strong>${escapeHtml(toolbarLabel ?? title)}</strong>
        <div>
          <button type="button" class="btn btn-primary" onclick="window.print()">Print / Save as PDF</button>
          <button type="button" class="btn btn-secondary" onclick="window.close()">Close</button>
        </div>
      </div>
      <div class="document-sheet">${body}</div>
    </div>
    <script>
      (function () {
        window.onafterprint = function () { try { window.close(); } catch (e) {} };
        function doPrint() {
          var img = document.querySelector('.doc-logo');
          function go() { setTimeout(function () { try { window.focus(); window.print(); } catch (e) {} }, 300); }
          if (img && !img.complete) { img.addEventListener('load', go); img.addEventListener('error', go); } else { go(); }
        }
        if (document.readyState === 'complete') { doPrint(); } else { window.addEventListener('load', doPrint); }
      })();
    </script>
  </body>
</html>`;
}

/** Writes `html` into a new popup window; calls `onPopupBlocked` if it can't open. */
export function openPrintWindow(
  html: string,
  onPopupBlocked?: () => void,
  size = "width=1000,height=850",
): void {
  const printWindow = window.open(
    "",
    "_blank",
    `${size},resizable=yes,scrollbars=yes`,
  );
  if (!printWindow) {
    onPopupBlocked?.();
    return;
  }
  try {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
  } catch (err) {
    console.error("Error writing to print window:", err);
  }
}
