import "server-only";

import { and, desc, eq, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import { getOpeningBalance as getOpeningBalanceSetting } from "@/db/queries/quick-cash-settings";
import { user } from "@/db/schema/auth";
import { dailyCashRegister } from "@/db/schema/daily-cash-register";
import {
  addDaysToDateStr,
  APP_TIMEZONE,
  formatLocalDate,
  getLocalDateBoundaries,
} from "@/lib/format";
import type { DailyRegisterRow } from "@/types/cash-transactions";

import {
  getTotalCashIn,
  getTotalCashOut,
} from "./cash-transactions-aggregates";

/**
 * Ensures that the daily cash register exists and is up-to-date for a given date and user.
 * Implements automatic midnight rollover:
 * - Opening balance of the new day = Closing balance of previous day.
 * - Initial Cash In = 0.00, Cash Out = 0.00.
 * - Initial Closing balance = Opening balance.
 * - Idempotent and catches up missing days seamlessly if the server was offline.
 */
export async function ensureDailyCashRegister(
  dateStr?: string,
  userId?: string,
): Promise<DailyRegisterRow> {
  const todayStr = formatLocalDate(new Date(), APP_TIMEZONE);
  const targetDate = dateStr || todayStr;
  const isPastDay = targetDate < todayStr;

  try {
    // 1. If no userId provided, run rollover for all admins and return today's default register
    if (!userId) {
      await performMidnightRolloverForAllUsers();
      return {
        date: targetDate,
        openingBalance: "0.00",
        totalCashIn: "0.00",
        totalCashOut: "0.00",
        closingBalance: "0.00",
        status: isPastDay ? "CLOSED" : "OPEN",
        closedAt: null,
        closedById: null,
        closedByName: null,
        notes: null,
      };
    }

    // 2. Check if the target day's register already exists for this user
    const [existingTarget] = await db
      .select()
      .from(dailyCashRegister)
      .where(
        and(
          eq(dailyCashRegister.userId, userId),
          eq(dailyCashRegister.date, targetDate),
        ),
      )
      .limit(1);

    // 3. Catch up missing previous days up to targetDate (or todayStr)
    const [lastRecord] = await db
      .select()
      .from(dailyCashRegister)
      .where(
        and(
          eq(dailyCashRegister.userId, userId),
          lt(dailyCashRegister.date, targetDate),
        ),
      )
      .orderBy(desc(dailyCashRegister.date))
      .limit(1);

    if (lastRecord) {
      let prevDate = lastRecord.date;
      let prevClosing = lastRecord.closingBalance;

      // Ensure lastRecord is CLOSED if it is a past day
      if (prevDate < todayStr && lastRecord.status !== "CLOSED") {
        const [inAmt, outAmt] = await Promise.all([
          getTotalCashIn({ from: prevDate, to: prevDate, userId }),
          getTotalCashOut({ from: prevDate, to: prevDate, userId }),
        ]);
        const numOpen = Number(lastRecord.openingBalance) || 0;
        const numIn = Number(inAmt) || 0;
        const numOut = Number(outAmt) || 0;
        const closing = (numOpen + numIn - numOut).toFixed(2);
        prevClosing = closing;

        await db
          .update(dailyCashRegister)
          .set({
            totalCashIn: numIn.toFixed(2),
            totalCashOut: numOut.toFixed(2),
            closingBalance: closing,
            status: "CLOSED",
            closedAt: lastRecord.closedAt || getLocalDateBoundaries(prevDate).end,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(dailyCashRegister.userId, userId),
              eq(dailyCashRegister.date, prevDate),
            ),
          );
      }

      // Step forward through each missing date up to targetDate
      let nextDate = addDaysToDateStr(prevDate, 1);
      while (nextDate <= targetDate) {
        const isNextPast = nextDate < todayStr;
        const isNextTarget = nextDate === targetDate;

        const [existingNext] = await db
          .select()
          .from(dailyCashRegister)
          .where(
            and(
              eq(dailyCashRegister.userId, userId),
              eq(dailyCashRegister.date, nextDate),
            ),
          )
          .limit(1);

        const [inAmt, outAmt] = await Promise.all([
          getTotalCashIn({ from: nextDate, to: nextDate, userId }),
          getTotalCashOut({ from: nextDate, to: nextDate, userId }),
        ]);

        const numIn = Number(inAmt) || 0;
        const numOut = Number(outAmt) || 0;

        if (!existingNext) {
          // Automatic rollover: opening balance = previous day closing balance
          const opening = Number(prevClosing).toFixed(2);
          const closing = (Number(opening) + numIn - numOut).toFixed(2);
          const status = isNextPast ? ("CLOSED" as const) : ("OPEN" as const);
          const closedAt = isNextPast
            ? getLocalDateBoundaries(nextDate).end
            : null;

          await db.insert(dailyCashRegister).values({
            userId,
            date: nextDate,
            openingBalance: opening,
            totalCashIn: numIn.toFixed(2),
            totalCashOut: numOut.toFixed(2),
            closingBalance: closing,
            status,
            closedAt,
          });

          prevClosing = closing;
        } else {
          // Record exists: preserve opening balance (in case manually set), update flows & closing
          const numOpen = Number(existingNext.openingBalance) || 0;
          const closing = (numOpen + numIn - numOut).toFixed(2);
          const status = isNextPast ? ("CLOSED" as const) : existingNext.status;

          await db
            .update(dailyCashRegister)
            .set({
              totalCashIn: numIn.toFixed(2),
              totalCashOut: numOut.toFixed(2),
              closingBalance: closing,
              status,
              closedAt: isNextPast
                ? existingNext.closedAt || getLocalDateBoundaries(nextDate).end
                : null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(dailyCashRegister.userId, userId),
                eq(dailyCashRegister.date, nextDate),
              ),
            );

          prevClosing = closing;
        }

        nextDate = addDaysToDateStr(nextDate, 1);
      }
    } else if (!existingTarget) {
      // No prior records at all: initialize targetDate from configured setting
      const defaultOpening = await getOpeningBalanceSetting(userId);
      const [inAmt, outAmt] = await Promise.all([
        getTotalCashIn({ from: targetDate, to: targetDate, userId }),
        getTotalCashOut({ from: targetDate, to: targetDate, userId }),
      ]);

      const numOpen = Number(defaultOpening) || 0;
      const numIn = Number(inAmt) || 0;
      const numOut = Number(outAmt) || 0;
      const closing = (numOpen + numIn - numOut).toFixed(2);
      const status = isPastDay ? ("CLOSED" as const) : ("OPEN" as const);
      const closedAt = isPastDay
        ? getLocalDateBoundaries(targetDate).end
        : null;

      await db.insert(dailyCashRegister).values({
        userId,
        date: targetDate,
        openingBalance: numOpen.toFixed(2),
        totalCashIn: numIn.toFixed(2),
        totalCashOut: numOut.toFixed(2),
        closingBalance: closing,
        status,
        closedAt,
      });
    } else {
      // Target exists and no prior records: refresh flows
      const [inAmt, outAmt] = await Promise.all([
        getTotalCashIn({ from: targetDate, to: targetDate, userId }),
        getTotalCashOut({ from: targetDate, to: targetDate, userId }),
      ]);
      const numOpen = Number(existingTarget.openingBalance) || 0;
      const numIn = Number(inAmt) || 0;
      const numOut = Number(outAmt) || 0;
      const closing = (numOpen + numIn - numOut).toFixed(2);

      await db
        .update(dailyCashRegister)
        .set({
          totalCashIn: numIn.toFixed(2),
          totalCashOut: numOut.toFixed(2),
          closingBalance: closing,
          status: isPastDay ? "CLOSED" : existingTarget.status,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dailyCashRegister.userId, userId),
            eq(dailyCashRegister.date, targetDate),
          ),
        );
    }

    // 4. Fetch the final updated record for targetDate
    const [finalRecord] = await db
      .select()
      .from(dailyCashRegister)
      .where(
        and(
          eq(dailyCashRegister.userId, userId),
          eq(dailyCashRegister.date, targetDate),
        ),
      )
      .limit(1);

    if (finalRecord) {
      return {
        date: finalRecord.date,
        openingBalance: Number(finalRecord.openingBalance).toFixed(2),
        totalCashIn: Number(finalRecord.totalCashIn).toFixed(2),
        totalCashOut: Number(finalRecord.totalCashOut).toFixed(2),
        closingBalance: Number(finalRecord.closingBalance).toFixed(2),
        status: (finalRecord.status as "OPEN" | "CLOSED") || (isPastDay ? "CLOSED" : "OPEN"),
        closedAt: finalRecord.closedAt,
        closedById: finalRecord.closedById,
        closedByName: finalRecord.closedByName,
        notes: finalRecord.notes,
      };
    }

    return {
      date: targetDate,
      openingBalance: "0.00",
      totalCashIn: "0.00",
      totalCashOut: "0.00",
      closingBalance: "0.00",
      status: isPastDay ? "CLOSED" : "OPEN",
      closedAt: null,
      closedById: null,
      closedByName: null,
      notes: null,
    };
  } catch (error) {
    console.error("ensureDailyCashRegister error:", error);
    return {
      date: targetDate,
      openingBalance: "0.00",
      totalCashIn: "0.00",
      totalCashOut: "0.00",
      closingBalance: "0.00",
      status: isPastDay ? "CLOSED" : "OPEN",
      closedAt: null,
      closedById: null,
      closedByName: null,
      notes: null,
    };
  }
}

/**
 * Recalculates cash register totals and closing balance for a specific day when transactions change.
 */
export async function recalculateDailyCashRegister(
  dateStr: string,
  userId: string,
): Promise<void> {
  try {
    const [inAmt, outAmt] = await Promise.all([
      getTotalCashIn({ from: dateStr, to: dateStr, userId }),
      getTotalCashOut({ from: dateStr, to: dateStr, userId }),
    ]);

    const numIn = Number(inAmt) || 0;
    const numOut = Number(outAmt) || 0;

    const [existing] = await db
      .select()
      .from(dailyCashRegister)
      .where(
        and(
          eq(dailyCashRegister.userId, userId),
          eq(dailyCashRegister.date, dateStr),
        ),
      )
      .limit(1);

    if (existing) {
      const numOpen = Number(existing.openingBalance) || 0;
      const closing = (numOpen + numIn - numOut).toFixed(2);

      await db
        .update(dailyCashRegister)
        .set({
          totalCashIn: numIn.toFixed(2),
          totalCashOut: numOut.toFixed(2),
          closingBalance: closing,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dailyCashRegister.userId, userId),
            eq(dailyCashRegister.date, dateStr),
          ),
        );
    } else {
      await ensureDailyCashRegister(dateStr, userId);
    }
  } catch (error) {
    console.error("recalculateDailyCashRegister error:", error);
  }
}

/**
 * Performs midnight rollover for all admin users and any users with registers.
 */
export async function performMidnightRolloverForAllUsers(): Promise<void> {
  const todayStr = formatLocalDate(new Date(), APP_TIMEZONE);

  try {
    const adminUsers = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.role, "ADMIN"));

    const distinctRegisterUsers = await db
      .selectDistinct({ userId: dailyCashRegister.userId })
      .from(dailyCashRegister);

    const userIds = new Set<string>();
    adminUsers.forEach((u) => userIds.add(u.id));
    distinctRegisterUsers.forEach((r) => {
      if (r.userId) userIds.add(r.userId);
    });

    for (const uId of userIds) {
      await ensureDailyCashRegister(todayStr, uId);
    }
  } catch (error) {
    console.error("performMidnightRolloverForAllUsers error:", error);
  }
}
