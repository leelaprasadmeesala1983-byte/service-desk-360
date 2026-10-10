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

export const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Kolkata";

/**
 * Formats a Date object or timestamp as a local YYYY-MM-DD string in the configured timezone.
 */
function formatLocalDate(value?: Date | string | null, timeZone = APP_TIMEZONE): string {
  const date = !value
    ? new Date()
    : typeof value === "string"
      ? new Date(value)
      : value;
  if (Number.isNaN(date.getTime())) return "";

  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

/**
 * Adds or subtracts days from a YYYY-MM-DD date string.
 */
function addDaysToDateStr(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;
  const d = new Date(Date.UTC(year, month, day + days, 0, 0, 0, 0));
  const resYear = d.getUTCFullYear();
  const resMonth = String(d.getUTCMonth() + 1).padStart(2, "0");
  const resDay = String(d.getUTCDate()).padStart(2, "0");
  return `${resYear}-${resMonth}-${resDay}`;
}

/**
 * Returns an array of YYYY-MM-DD strings from fromStr to toStr (inclusive).
 */
function getDaysBetweenDates(fromStr: string, toStr: string): string[] {
  if (fromStr > toStr) return [];
  const days: string[] = [];
  let curr = fromStr;
  while (curr <= toStr) {
    days.push(curr);
    curr = addDaysToDateStr(curr, 1);
  }
  return days;
}

/**
 * Returns the start (00:00:00.000) and end (23:59:59.999) Date objects for a YYYY-MM-DD string in the configured timezone.
 */
function getLocalDateBoundaries(dateStr: string, timeZone = APP_TIMEZONE): { start: Date; end: Date } {
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] || new Date().getFullYear();
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || 1;

  try {
    const approxUtc = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
    });
    const partsTz = formatter.formatToParts(approxUtc);
    const getPart = (type: string) => Number(partsTz.find((p) => p.type === type)?.value || 0);
    const tzYear = getPart("year");
    const tzMonth = getPart("month") - 1;
    const tzDay = getPart("day");
    const tzHour = getPart("hour");
    const tzMinute = getPart("minute");
    const tzSecond = getPart("second");
    const tzAsUtc = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond);
    const offsetMs = tzAsUtc - approxUtc.getTime();
    const startMs = Date.UTC(year, month, day, 0, 0, 0, 0) - offsetMs;
    const start = new Date(startMs);
    const end = new Date(startMs + 24 * 60 * 60 * 1000 - 1);
    return { start, end };
  } catch {
    const start = new Date(year, month, day, 0, 0, 0, 0);
    const end = new Date(year, month, day, 23, 59, 59, 999);
    return { start, end };
  }
}

/**
 * Formats a Date object or timestamp as a local YYYY-MM-DDTHH:mm string for datetime-local inputs.
 */
function formatLocalDateTime(value?: Date | string | null, timeZone = APP_TIMEZONE): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || "";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  } catch {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
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
  formatLocalDateTime,
  getLocalDateBoundaries,
  addDaysToDateStr,
  getDaysBetweenDates,
};
