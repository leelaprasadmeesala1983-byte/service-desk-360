import type {
  CustomerDetailedReportData,
  RecordDetailReport,
} from "@/db/queries/customer-reports";
import { SERVICE_CATEGORY_LABELS } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  buildPrintDocument,
  escapeHtml,
  openPrintWindow,
  renderDocHeader,
  renderInfoCard,
} from "./print-template";

type Customer360Module = "services" | "installations" | "projects";

export type Customer360PrintGroup = {
  module: Customer360Module;
  records: RecordDetailReport[];
};

const MODULE_LABELS: Record<Customer360Module, string> = {
  services: "Service",
  installations: "Installation",
  projects: "Project",
};

const EXTRA_CSS = `
  .record-page { break-before: page; page-break-before: always; margin-top: 40px; }
  @media print { .record-page { margin-top: 0; } }
  .record-block { margin-bottom: 26px; }
  .record-block + .record-block { border-top: 1px dashed #94a3b8; padding-top: 22px; }
  .record-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 6px; }
  .record-id { font-family: ui-monospace, Menlo, Consolas, monospace; font-weight: 800; font-size: 13px; }
  .record-title { font-weight: 700; font-size: 13px; margin-left: 8px; }
  .record-meta { color: #475569; margin: 6px 0 10px; line-height: 1.5; }
  .record-extra { color: #475569; font-size: 11px; margin: 10px 0 0; }
  .record-extra strong { color: #0f172a; }
  .closure-box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; }
  .closure-note { margin-top: 8px; font-style: italic; }
`;

function kv(label: string, value: string): string {
  return `<div><div class="kv-label">${escapeHtml(label)}</div><div class="kv-value">${escapeHtml(value || "—")}</div></div>`;
}

function renderRecord(
  record: RecordDetailReport,
  module: Customer360Module,
): string {
  const category = record.category
    ? (SERVICE_CATEGORY_LABELS[
        record.category as keyof typeof SERVICE_CATEGORY_LABELS
      ] ?? record.category)
    : "";

  const extras = [
    category ? `Category: <strong>${escapeHtml(category)}</strong>` : "",
    record.accountUsername
      ? `Account: <strong>${escapeHtml(record.accountUsername)}</strong>`
      : "",
    record.referenceNo
      ? `Reference No: <strong>${escapeHtml(record.referenceNo)}</strong>`
      : "",
    record.estimationNo
      ? `Estimation No: <strong>${escapeHtml(record.estimationNo)}</strong>`
      : "",
    record.latestProgress
      ? `Progress: <strong>${escapeHtml(record.latestProgress)}</strong>`
      : "",
  ].filter(Boolean);

  const history = record.dayByDayWorkHistory;
  const historyRows =
    history.length === 0
      ? `<tr><td colspan="3" class="center muted">No work logs have been submitted for this record yet.</td></tr>`
      : history
          .map(
            (day) => `
        <tr>
          <td class="mono bold" style="white-space:nowrap">${escapeHtml(formatDate(day.date))}</td>
          <td>${escapeHtml(day.description || day.workCompleted)}</td>
          <td>${escapeHtml(day.technicianNames?.length ? day.technicianNames.join(", ") : "—")}</td>
        </tr>`,
          )
          .join("");

  const mp = record.manpowerSummary;
  const techRows =
    mp.technicians.length === 0
      ? `<tr><td colspan="3" class="center muted">No technician work records logged for this period.</td></tr>`
      : mp.technicians
          .map(
            (t) => `
        <tr>
          <td>${escapeHtml(t.technicianName)}</td>
          <td class="center mono">${t.workingDays}</td>
          <td class="center mono">${t.manDays}</td>
        </tr>`,
          )
          .join("");

  const cs = record.closureSummary;
  const closure = cs.isClosed
    ? `<div class="closure-box">
        <div class="kv-grid">
          ${kv("Actual Work Start", cs.actualWorkStartDate ? formatDate(cs.actualWorkStartDate) : "—")}
          ${kv("Actual Closure", formatDate(cs.actualClosureDate))}
          ${kv("Calendar Duration", cs.totalCalendarDuration || "—")}
          ${kv("Total Days Worked", `${cs.totalDaysWorked} days`)}
        </div>
        ${cs.finalCompletionNotes ? `<div class="closure-note">"${escapeHtml(cs.finalCompletionNotes)}"</div>` : ""}
      </div>`
    : `<div class="closure-box">
        <div class="kv-grid">
          ${kv("Actual Work Start", cs.actualWorkStartDate ? formatDate(cs.actualWorkStartDate) : "No work logged yet")}
          ${kv("Current Status", record.status)}
          ${kv("Elapsed Duration", cs.elapsedDuration)}
        </div>
      </div>`;

  return `
    <div class="record-block">
      <div class="record-head">
        <div>
          <span class="record-id">${escapeHtml(record.recordId)}</span>
          <span class="record-title">${escapeHtml(record.title)}</span>
        </div>
        <div class="bold">${escapeHtml(MODULE_LABELS[module])} · ${escapeHtml(record.status)}${record.amount ? ` · ${escapeHtml(formatCurrency(record.amount))}` : ""}</div>
      </div>
      ${record.description ? `<div class="record-meta">${escapeHtml(record.description)}</div>` : ""}
      <div class="kv-grid">
        ${kv("Work Location", record.workLocation)}
        ${kv("Assigned Technicians", record.assignedTechniciansDisplay)}
        ${kv("Creation Date", formatDate(record.creationDate))}
        ${kv("Elapsed Duration", record.totalElapsedDuration)}
      </div>
      ${extras.length ? `<div class="record-extra">${extras.join(" &nbsp;|&nbsp; ")}</div>` : ""}

      <div class="section-heading">Day-by-Day Work History (${history.length})</div>
      <table class="doc-table">
        <thead><tr><th style="width:110px">Date</th><th>Description</th><th style="width:170px">Technician</th></tr></thead>
        <tbody>${historyRows}</tbody>
      </table>

      <div class="section-heading">Manpower Summary</div>
      <div class="kv-grid" style="margin-bottom:10px">
        ${kv("Total Working Days", String(mp.totalWorkingDays))}
        ${kv("Total Man-Days", String(mp.totalManDays))}
        ${kv("Unique Technicians", String(mp.uniqueTechnicians))}
      </div>
      <table class="doc-table">
        <thead><tr><th>Technician Name</th><th class="center">Working Days</th><th class="center">Man-Days</th></tr></thead>
        <tbody>${techRows}</tbody>
      </table>

      <div class="section-heading">${cs.isClosed ? "Closure Summary" : "Status &amp; Lifecycle Summary"}</div>
      ${closure}
    </div>`;
}

/** Common header: logo, report title and the customer details card. */
function renderPageHeader(
  customer: CustomerDetailedReportData["customer"],
  refId: string,
): string {
  const contact = [customer.mobileNumber, customer.email]
    .filter((v) => v && v !== "—")
    .join("  |  ");
  return `
    ${renderDocHeader({
      title: "Customer 360 Report",
      refId,
      date: formatDate(new Date()),
    })}
    <div class="cards">
      ${renderInfoCard("Customer", [customer.customerName, customer.companyName, contact])}
      ${renderInfoCard("Address", [customer.address])}
    </div>`;
}

/**
 * Builds the print document.
 * - `onePage: false` → every record gets its own page with its own header.
 * - `onePage: true` → one common header, then all records back to back.
 */
export function generateCustomer360Html(
  customer: CustomerDetailedReportData["customer"],
  groups: Customer360PrintGroup[],
  onePage: boolean,
): string {
  const entries = groups.flatMap((g) =>
    g.records.map((record) => ({ record, module: g.module })),
  );

  let body: string;
  if (onePage) {
    const ids = entries.map((e) => e.record.recordId).join(", ");
    body = `<section>${renderPageHeader(customer, ids)}${entries
      .map((e) => renderRecord(e.record, e.module))
      .join("")}</section>`;
  } else {
    body = entries
      .map(
        (e, i) =>
          `<section${i > 0 ? ' class="record-page"' : ""}>${renderPageHeader(customer, e.record.recordId)}${renderRecord(e.record, e.module)}</section>`,
      )
      .join("");
  }

  return buildPrintDocument({
    title: `Customer 360 - ${customer.customerName}`,
    body,
    extraCss: EXTRA_CSS,
  });
}

export function printCustomer360(
  customer: CustomerDetailedReportData["customer"],
  groups: Customer360PrintGroup[],
  onePage: boolean,
  onPopupBlocked?: () => void,
): void {
  openPrintWindow(
    generateCustomer360Html(customer, groups, onePage),
    onPopupBlocked,
  );
}
