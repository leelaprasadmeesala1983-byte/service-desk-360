import "server-only";

import { revalidatePath } from "next/cache";
import { performMidnightRolloverForAllUsers } from "@/db/queries/quick-cash-rollover";
import { APP_TIMEZONE, formatLocalDate } from "@/lib/format";

declare global {
  // eslint-disable-next-line no-var
  var __quickCashMidnightTimer__: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var __quickCashHeartbeatInterval__: NodeJS.Timeout | undefined;
  // eslint-disable-next-line no-var
  var __quickCashLastRolloverDate__: string | undefined;
}

/**
 * Calculates milliseconds from now until the next 12:00:00 AM (midnight) in the specified timezone.
 */
export function getMsUntilNextMidnight(timeZone = APP_TIMEZONE): number {
  const now = new Date();
  
  // Get current local date in timeZone
  const todayStr = formatLocalDate(now, timeZone);
  const parts = todayStr.split("-").map(Number);
  const year = parts[0];
  const month = parts[1] - 1;
  const day = parts[2];

  // Tomorrow's date
  const tomorrowUtc = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
  
  // Find tomorrow's midnight in UTC for the target timezone
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
  
  const partsTz = formatter.formatToParts(tomorrowUtc);
  const getPart = (type: string) => Number(partsTz.find((p) => p.type === type)?.value || 0);
  const tzYear = getPart("year");
  const tzMonth = getPart("month") - 1;
  const tzDay = getPart("day");
  const tzHour = getPart("hour");
  const tzMinute = getPart("minute");
  const tzSecond = getPart("second");

  const tzAsUtc = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, tzSecond);
  const offsetMs = tzAsUtc - tomorrowUtc.getTime();

  // Exact UTC timestamp for tomorrow's midnight in timeZone
  const nextMidnightMs = Date.UTC(year, month, day + 1, 0, 0, 0, 0) - offsetMs;
  const diffMs = nextMidnightMs - now.getTime();

  // Safety buffer: at least 1 second, at most 24h + 1m
  return Math.max(1000, Math.min(diffMs, 24 * 60 * 60 * 1000 + 60000));
}

/**
 * Executes midnight rollover and schedules the next run.
 */
async function runMidnightRolloverTask(): Promise<void> {
  const todayStr = formatLocalDate(new Date(), APP_TIMEZONE);
  console.log(`[Quick Cash Scheduler] Executing midnight rollover for date: ${todayStr} (Timezone: ${APP_TIMEZONE})...`);
  
  try {
    await performMidnightRolloverForAllUsers();
    globalThis.__quickCashLastRolloverDate__ = todayStr;
    revalidatePath("/quick-cash");
    revalidatePath("/");
    console.log(`[Quick Cash Scheduler] Midnight rollover completed successfully.`);
  } catch (error) {
    console.error("[Quick Cash Scheduler] Midnight rollover error:", error);
  } finally {
    // Schedule next midnight run
    scheduleNextMidnightRun();
  }
}

function scheduleNextMidnightRun(): void {
  if (globalThis.__quickCashMidnightTimer__) {
    clearTimeout(globalThis.__quickCashMidnightTimer__);
  }

  const ms = getMsUntilNextMidnight(APP_TIMEZONE);
  const nextRunDate = new Date(Date.now() + ms);
  console.log(
    `[Quick Cash Scheduler] Next midnight rollover scheduled in ${Math.round(ms / 1000)}s (at ${nextRunDate.toLocaleString("en-IN", { timeZone: APP_TIMEZONE })}).`,
  );

  globalThis.__quickCashMidnightTimer__ = setTimeout(() => {
    void runMidnightRolloverTask();
  }, ms);
}

/**
 * Initializes the backend midnight rollover scheduler.
 * Runs once on server startup, catches up on any missed days, and maintains the midnight timer.
 */
export function initMidnightRolloverScheduler(): void {
  // Prevent duplicate initializations in HMR / dev mode
  if (globalThis.__quickCashMidnightTimer__ && globalThis.__quickCashHeartbeatInterval__) {
    return;
  }

  console.log(`[Quick Cash Scheduler] Initializing automatic midnight rollover (Timezone: ${APP_TIMEZONE})...`);

  // Run initial catch-up immediately on startup
  void performMidnightRolloverForAllUsers().then(() => {
    globalThis.__quickCashLastRolloverDate__ = formatLocalDate(new Date(), APP_TIMEZONE);
  });

  // Schedule exact midnight timer
  scheduleNextMidnightRun();

  // Set safety heartbeat check every 5 minutes
  if (!globalThis.__quickCashHeartbeatInterval__) {
    globalThis.__quickCashHeartbeatInterval__ = setInterval(() => {
      const todayStr = formatLocalDate(new Date(), APP_TIMEZONE);
      if (
        globalThis.__quickCashLastRolloverDate__ &&
        globalThis.__quickCashLastRolloverDate__ < todayStr
      ) {
        console.log(`[Quick Cash Scheduler] Heartbeat detected date transition (${globalThis.__quickCashLastRolloverDate__} -> ${todayStr}). Triggering catch-up...`);
        void runMidnightRolloverTask();
      }
    }, 5 * 60 * 1000);
  }
}
