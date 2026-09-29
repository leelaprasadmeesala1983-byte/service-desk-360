const RECORD_ID_PREFIXES = {
  SERVICE: "SRV",
  INSTALLATION: "INS",
  PROJECT: "PRJ",
  CSH: "CSH",
  ASSET: "AST",
  STV: "DSP",
  REP: "REP",
} as const;

type RecordKind = keyof typeof RECORD_ID_PREFIXES;

/** Sequences start at 1, but the display ids in the spec start at 1001. */
const RECORD_ID_OFFSET = 1000;

function formatRecordId(kind: RecordKind, seq: number): string {
  return `${RECORD_ID_PREFIXES[kind]}-${seq + RECORD_ID_OFFSET}`;
}

/**
 * Pulls the sequence back out of a display id so list search can match on
 * "SRV-1001", "1001", or a bare "1".
 */
function parseRecordIdSearch(input: string): number | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;

  const value = Number(digits);
  if (!Number.isSafeInteger(value)) return null;

  return value > RECORD_ID_OFFSET ? value - RECORD_ID_OFFSET : value;
}

function formatCurrency(amount: string | number | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "—";

  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatRelativeTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const thresholds: [Intl.RelativeTimeFormatUnit, number][] = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.35],
    ["month", 12],
  ];

  let duration = seconds;
  for (const [unit, step] of thresholds) {
    if (Math.abs(duration) < step)
      return formatter.format(Math.round(duration), unit);
    duration /= step;
  }

  return formatter.format(Math.round(duration), "year");
}

function getInitials(firstName: string, lastName: string): string {
  const first = firstName.trim().charAt(0);
  const last = lastName.trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "?";
}

/**
 * Formats a Date object or timestamp as a local YYYY-MM-DD string.
 */
function formatLocalDate(value?: Date | string | null): string {
  const date = !value
    ? new Date()
    : typeof value === "string"
      ? new Date(value)
      : value;
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns the start (00:00:00.000) and end (23:59:59.999) Date objects for a YYYY-MM-DD string.
 */
function getLocalDateBoundaries(dateStr: string): { start: Date; end: Date } {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;
  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day, 23, 59, 59, 999);
  return { start, end };
}

export type { RecordKind };
export {
  formatRecordId,
  parseRecordIdSearch,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  getInitials,
  formatLocalDate,
  getLocalDateBoundaries,
};
