import "server-only";

import { and, count, desc, eq, gte, lt, lte, sum } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { getOpeningBalance as getOpeningBalanceSetting } from "@/db/queries/quick-cash-settings";
import { user } from "@/db/schema/auth";
import { cashTransaction } from "@/db/schema/cash-transaction";
import { dailyCashRegister } from "@/db/schema/daily-cash-register";
import {
  formatLocalDate,
  formatRecordId,
  getLocalDateBoundaries,
} from "@/lib/format";

type CashTransactionRow = {
  id: string;
  seq: number;
  recordId: string;
  type: "CASH_IN" | "CASH_OUT";
  category: string | null;
  amount: string;
  description: string;
  sourceRecordId: string | null;
  sourceRecordType: string | null;
  sourceRecordLabel: string | null;
  customerName: string | null;
  isAdminEntry: boolean;
  assignedTechnicianId: string | null;
  technicianName: string | null;
  createdByName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type DailyRegisterRow = {
  date: string; // "YYYY-MM-DD"
  openingBalance: string;
  totalCashIn: string;
  totalCashOut: string;
  closingBalance: string;
  status: "OPEN" | "CLOSED";
  closedAt: Date | null;
  closedById: string | null;
  closedByName: string | null;
  notes: string | null;
};

type MonthlySummary = {
  year: number;
  month: number;
  monthLabel: string;
  from: string;
  to: string;
  openingBalance: string;
  totalCashIn: string;
  totalCashOut: string;
  closingBalance: string;
};

function mapRow(row: {
  transaction: typeof cashTransaction.$inferSelect;
  createdByName: string | null;
  technicianName: string | null;
}): CashTransactionRow {
  const category =
    row.transaction.category ||
    (row.transaction.type === "CASH_IN" ? "Cash In" : "Cash Out");

  return {
    id: row.transaction.id,
    seq: row.transaction.seq,
    recordId: formatRecordId("CSH", row.transaction.seq),
    type: row.transaction.type,
    category,
    amount: row.transaction.amount ?? "0",
    description: row.transaction.description,
    sourceRecordId: row.transaction.sourceRecordId,
    sourceRecordType: row.transaction.sourceRecordType,
    sourceRecordLabel: row.transaction.sourceRecordLabel,
    customerName:
      row.transaction.customerName ||
      row.createdByName ||
      (row.transaction.isAdminEntry ? "Admin" : null),
    isAdminEntry: row.transaction.isAdminEntry ?? false,
    assignedTechnicianId: row.transaction.assignedTechnicianId,
    technicianName: row.transaction.assignedTechnicianId
      ? row.technicianName
      : null,
    createdByName: row.createdByName,
    createdAt: row.transaction.createdAt,
    updatedAt: row.transaction.updatedAt,
  };
}

interface PaginationParams {
  page: number;
  limit: number;
  from?: string;
  to?: string;
  userId?: string;
}

/**
 * List cash transactions with server-side pagination, newest first.
 * Uses normalized local date boundaries to avoid timezone mismatches.
 */
async function listCashTransactions(
  params: PaginationParams,
): Promise<{ rows: CashTransactionRow[]; total: number }> {
  try {
    const offset = (params.page - 1) * params.limit;

    const creatorUser = alias(user, "creator_user");
    const technicianUser = alias(user, "technician_user");

    const filters = [];
    if (params.userId) {
      filters.push(eq(cashTransaction.createdById, params.userId));
    }
    if (params.from) {
      const { start } = getLocalDateBoundaries(params.from);
      filters.push(gte(cashTransaction.createdAt, start));
    }
    if (params.to) {
      const { end } = getLocalDateBoundaries(params.to);
      filters.push(lte(cashTransaction.createdAt, end));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          transaction: cashTransaction,
          createdByName: creatorUser.name,
          technicianName: technicianUser.name,
        })
        .from(cashTransaction)
        .leftJoin(creatorUser, eq(cashTransaction.createdById, creatorUser.id))
        .leftJoin(
          technicianUser,
          eq(cashTransaction.assignedTechnicianId, technicianUser.id),
        )
        .where(whereClause)
        .orderBy(desc(cashTransaction.createdAt), desc(cashTransaction.seq))
        .limit(params.limit)
        .offset(offset),
      db.select({ count: count() }).from(cashTransaction).where(whereClause),
    ]);

    return {
      rows: rows.map((r) =>
        mapRow({
          transaction: r.transaction,
          createdByName: r.createdByName,
          technicianName: r.technicianName,
        }),
      ),
      total: totalResult[0]?.count ? totalResult[0].count : 0,
    };
  } catch {
    return { rows: [], total: 0 };
  }
}

/**
 * List all cash transactions without pagination, useful for exports.
 */
async function listAllFilteredCashTransactions(params: {
  from?: string;
  to?: string;
  userId?: string;
}): Promise<CashTransactionRow[]> {
  try {
    const creatorUser = alias(user, "creator_user");
    const technicianUser = alias(user, "technician_user");

    const filters = [];
    if (params.userId) {
      filters.push(eq(cashTransaction.createdById, params.userId));
    }
    if (params.from) {
      const { start } = getLocalDateBoundaries(params.from);
      filters.push(gte(cashTransaction.createdAt, start));
    }
    if (params.to) {
      const { end } = getLocalDateBoundaries(params.to);
      filters.push(lte(cashTransaction.createdAt, end));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const rows = await db
      .select({
        transaction: cashTransaction,
        createdByName: creatorUser.name,
        technicianName: technicianUser.name,
      })
      .from(cashTransaction)
      .leftJoin(creatorUser, eq(cashTransaction.createdById, creatorUser.id))
      .leftJoin(
        technicianUser,
        eq(cashTransaction.assignedTechnicianId, technicianUser.id),
      )
      .where(whereClause)
      .orderBy(desc(cashTransaction.createdAt), desc(cashTransaction.seq));

    return rows.map((r) =>
      mapRow({
        transaction: r.transaction,
        createdByName: r.createdByName,
        technicianName: r.technicianName,
      }),
    );
  } catch {
    return [];
  }
}

/**
 * Get total Cash In amount for a given date range and optional user.
 */
async function getTotalCashIn(filters?: {
  from?: string;
  to?: string;
  userId?: string;
}): Promise<string> {
  try {
    const filterClauses = [eq(cashTransaction.type, "CASH_IN")];
    if (filters?.userId) {
      filterClauses.push(eq(cashTransaction.createdById, filters.userId));
    }
    if (filters?.from) {
      const { start } = getLocalDateBoundaries(filters.from);
      filterClauses.push(gte(cashTransaction.createdAt, start));
    }
    if (filters?.to) {
      const { end } = getLocalDateBoundaries(filters.to);
      filterClauses.push(lte(cashTransaction.createdAt, end));
    }

    const [result] = await db
      .select({ total: sum(cashTransaction.amount).mapWith(String) })
      .from(cashTransaction)
      .where(and(...filterClauses));

    const total = result?.total ? Math.abs(Number(result.total)) : 0;
    return total.toFixed(2);
  } catch {
    return "0.00";
  }
}

/**
 * Get total Cash Out amount for a given date range and optional user.
 */
async function getTotalCashOut(filters?: {
  from?: string;
  to?: string;
  userId?: string;
}): Promise<string> {
  try {
    const filterClauses = [eq(cashTransaction.type, "CASH_OUT")];
    if (filters?.userId) {
      filterClauses.push(eq(cashTransaction.createdById, filters.userId));
    }
    if (filters?.from) {
      const { start } = getLocalDateBoundaries(filters.from);
      filterClauses.push(gte(cashTransaction.createdAt, start));
    }
    if (filters?.to) {
      const { end } = getLocalDateBoundaries(filters.to);
      filterClauses.push(lte(cashTransaction.createdAt, end));
    }

    const [result] = await db
      .select({ total: sum(cashTransaction.amount).mapWith(String) })
      .from(cashTransaction)
      .where(and(...filterClauses));

    const total = result?.total ? Math.abs(Number(result.total)) : 0;
    return total.toFixed(2);
  } catch {
    return "0.00";
  }
}

/**
 * Get opening balance setting (scoped to user if provided)
 */
async function getOpeningBalance(userId?: string): Promise<string> {
  return getOpeningBalanceSetting(userId);
}

/**
 * Find existing synced transaction from a service request amount.
 */
async function findSyncedTransaction(
  sourceRecordId: string,
  sourceRecordType: string,
): Promise<{ id: string; amount: string } | null> {
  const [result] = await db
    .select({ id: cashTransaction.id, amount: cashTransaction.amount })
    .from(cashTransaction)
    .where(
      and(
        eq(cashTransaction.sourceRecordId, sourceRecordId),
        eq(cashTransaction.sourceRecordType, sourceRecordType),
      ),
    );

  return result ?? null;
}

/**
 * Get daily register for a specific date (defaults to today) and user.
 * Automatic daily closing rules:
 * 1. Today is always OPEN.
 * 2. Past calendar days (< todayStr) are automatically CLOSED.
 * 3. Opening balance of today is inherited from the previous recorded day's closing balance (or default setting).
 * 4. Closing balance = Opening Balance + Total Cash In - Total Cash Out.
 */
async function getDailyRegister(
  dateStr?: string,
  userId?: string,
): Promise<DailyRegisterRow> {
  const todayStr = formatLocalDate(new Date());
  const targetDate = dateStr || todayStr;
  const isPastDay = targetDate < todayStr;

  try {
    const registerFilters = [eq(dailyCashRegister.date, targetDate)];
    if (userId) {
      registerFilters.push(eq(dailyCashRegister.userId, userId));
    }

    const [existing] = await db
      .select()
      .from(dailyCashRegister)
      .where(and(...registerFilters));

    // Calculate live daily Cash In and Cash Out
    const [totalIn, totalOut] = await Promise.all([
      getTotalCashIn({ from: targetDate, to: targetDate, userId }),
      getTotalCashOut({ from: targetDate, to: targetDate, userId }),
    ]);

    // Initial value is ₹0.00 unless explicitly configured for this day
    let opening = existing ? existing.openingBalance : "0.00";

    // If no existing register for today, check previous day closing or user opening balance
    if (!existing) {
      const priorFilters = [lt(dailyCashRegister.date, targetDate)];
      if (userId) {
        priorFilters.push(eq(dailyCashRegister.userId, userId));
      }
      const [priorDay] = await db
        .select()
        .from(dailyCashRegister)
        .where(and(...priorFilters))
        .orderBy(desc(dailyCashRegister.date))
        .limit(1);

      if (priorDay) {
        opening = priorDay.closingBalance;
      } else {
        opening = await getOpeningBalance(userId);
      }
    }

    const numOpening = Number(opening) || 0;
    const numIn = Number(totalIn) || 0;
    const numOut = Number(totalOut) || 0;
    const closing = (numOpening + numIn - numOut).toFixed(2);

    const status: "OPEN" | "CLOSED" = isPastDay ? "CLOSED" : "OPEN";

    // If it's a past day, persist in dailyCashRegister to lock in history
    if (isPastDay && (!existing || existing.status !== "CLOSED")) {
      const insertData = {
        date: targetDate,
        userId: userId ?? undefined,
        openingBalance: numOpening.toFixed(2),
        totalCashIn: numIn.toFixed(2),
        totalCashOut: numOut.toFixed(2),
        closingBalance: closing,
        status: "CLOSED" as const,
        closedAt: new Date(),
      };

      if (userId) {
        await db
          .insert(dailyCashRegister)
          .values(insertData)
          .onConflictDoUpdate({
            target: [dailyCashRegister.userId, dailyCashRegister.date],
            set: {
              openingBalance: numOpening.toFixed(2),
              totalCashIn: numIn.toFixed(2),
              totalCashOut: numOut.toFixed(2),
              closingBalance: closing,
              status: "CLOSED",
              updatedAt: new Date(),
            },
          });
      } else {
        await db
          .insert(dailyCashRegister)
          .values(insertData)
          .onConflictDoUpdate({
            target: dailyCashRegister.date,
            set: {
              openingBalance: numOpening.toFixed(2),
              totalCashIn: numIn.toFixed(2),
              totalCashOut: numOut.toFixed(2),
              closingBalance: closing,
              status: "CLOSED",
              updatedAt: new Date(),
            },
          });
      }
    }

    return {
      date: targetDate,
      openingBalance: numOpening.toFixed(2),
      totalCashIn: numIn.toFixed(2),
      totalCashOut: numOut.toFixed(2),
      closingBalance: closing,
      status,
      closedAt: isPastDay ? existing?.closedAt || new Date() : null,
      closedById: existing?.closedById || null,
      closedByName: existing?.closedByName || null,
      notes: existing?.notes ?? null,
    };
  } catch (error) {
    console.error("getDailyRegister error:", error);
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
 * List completed past daily registers for Daily History.
 */
async function listDailyRegisters(params: {
  page: number;
  limit: number;
  userId?: string;
}): Promise<{ rows: DailyRegisterRow[]; total: number }> {
  try {
    const todayStr = formatLocalDate(new Date());
    const offset = (params.page - 1) * params.limit;

    const registerFilters = [lt(dailyCashRegister.date, todayStr)];
    if (params.userId) {
      registerFilters.push(eq(dailyCashRegister.userId, params.userId));
    }

    const txFilters = [];
    if (params.userId) {
      txFilters.push(eq(cashTransaction.createdById, params.userId));
    }

    // Fetch recorded days up to today
    const [savedRegisters, txDates] = await Promise.all([
      db
        .select()
        .from(dailyCashRegister)
        .where(and(...registerFilters))
        .orderBy(desc(dailyCashRegister.date)),
      db
        .select({ createdAt: cashTransaction.createdAt })
        .from(cashTransaction)
        .where(txFilters.length > 0 ? and(...txFilters) : undefined)
        .orderBy(desc(cashTransaction.createdAt)),
    ]);

    const dateMap = new Map<string, DailyRegisterRow>();

    for (const r of savedRegisters) {
      dateMap.set(r.date, {
        date: r.date,
        openingBalance: Number(r.openingBalance).toFixed(2),
        totalCashIn: Number(r.totalCashIn).toFixed(2),
        totalCashOut: Number(r.totalCashOut).toFixed(2),
        closingBalance: Number(r.closingBalance).toFixed(2),
        status: "CLOSED",
        closedAt: r.closedAt,
        closedById: r.closedById,
        closedByName: r.closedByName,
        notes: r.notes,
      });
    }

    // Include any past dates from cashTransaction not yet explicitly stored
    for (const tx of txDates) {
      const d = formatLocalDate(tx.createdAt);
      if (d < todayStr && !dateMap.has(d)) {
        dateMap.set(d, {
          date: d,
          openingBalance: "0.00",
          totalCashIn: "0.00",
          totalCashOut: "0.00",
          closingBalance: "0.00",
          status: "CLOSED",
          closedAt: null,
          closedById: null,
          closedByName: null,
          notes: null,
        });
      }
    }

    const allDates = Array.from(dateMap.keys()).sort((a, b) =>
      b.localeCompare(a),
    );
    const total = allDates.length;
    const pagedDates = allDates.slice(offset, offset + params.limit);

    const rows: DailyRegisterRow[] = await Promise.all(
      pagedDates.map(async (d) => {
        const cached: DailyRegisterRow = dateMap.get(d) ?? {
          date: d,
          openingBalance: "0.00",
          totalCashIn: "0.00",
          totalCashOut: "0.00",
          closingBalance: "0.00",
          status: "OPEN",
          closedAt: null,
          closedById: null,
          closedByName: null,
          notes: null,
        };
        if (
          cached.totalCashIn !== "0.00" ||
          cached.totalCashOut !== "0.00" ||
          cached.openingBalance !== "0.00"
        ) {
          return cached;
        }
        const [totalIn, totalOut] = await Promise.all([
          getTotalCashIn({ from: d, to: d, userId: params.userId }),
          getTotalCashOut({ from: d, to: d, userId: params.userId }),
        ]);
        const closing = (
          Number(cached.openingBalance) +
          Number(totalIn) -
          Number(totalOut)
        ).toFixed(2);
        return {
          ...cached,
          totalCashIn: Number(totalIn).toFixed(2),
          totalCashOut: Number(totalOut).toFixed(2),
          closingBalance: closing,
        };
      }),
    );

    return { rows, total };
  } catch {
    return { rows: [], total: 0 };
  }
}

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

/**
 * Get monthly aggregated cash summary.
 */
async function getMonthlySummary(
  year: number,
  month: number, // 1-12
  customRange?: { from: string; to: string },
  userId?: string,
): Promise<MonthlySummary> {
  const padMonth = String(month).padStart(2, "0");
  const defaultFrom = `${year}-${padMonth}-01`;
  const defaultTo = `${year}-${padMonth}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;

  const from = customRange?.from || defaultFrom;
  const to = customRange?.to || defaultTo;

  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  try {
    const registerFilters = [
      gte(dailyCashRegister.date, from),
      lte(dailyCashRegister.date, to),
    ];
    if (userId) {
      registerFilters.push(eq(dailyCashRegister.userId, userId));
    }

    // 1. Get opening balance at or before `from`
    const [firstDayRegister] = await db
      .select()
      .from(dailyCashRegister)
      .where(and(...registerFilters))
      .orderBy(dailyCashRegister.date)
      .limit(1);

    let opening = firstDayRegister?.openingBalance;

    if (!opening) {
      // Find the last register before `from`
      const priorFilters = [lt(dailyCashRegister.date, from)];
      if (userId) {
        priorFilters.push(eq(dailyCashRegister.userId, userId));
      }
      const [priorMonthRegister] = await db
        .select()
        .from(dailyCashRegister)
        .where(and(...priorFilters))
        .orderBy(desc(dailyCashRegister.date))
        .limit(1);

      if (priorMonthRegister) {
        opening = priorMonthRegister.closingBalance;
      } else {
        opening = await getOpeningBalance(userId);
      }
    }

    const [totalIn, totalOut] = await Promise.all([
      getTotalCashIn({ from, to, userId }),
      getTotalCashOut({ from, to, userId }),
    ]);

    const numOpening = Number(opening) || 0;
    const numIn = Number(totalIn) || 0;
    const numOut = Number(totalOut) || 0;
    const closing = (numOpening + numIn - numOut).toFixed(2);

    return {
      year,
      month,
      monthLabel,
      from,
      to,
      openingBalance: numOpening.toFixed(2),
      totalCashIn: numIn.toFixed(2),
      totalCashOut: numOut.toFixed(2),
      closingBalance: closing,
    };
  } catch (error) {
    console.error("getMonthlySummary error:", error);
    return {
      year,
      month,
      monthLabel,
      from,
      to,
      openingBalance: "0.00",
      totalCashIn: "0.00",
      totalCashOut: "0.00",
      closingBalance: "0.00",
    };
  }
}

/**
 * Get cash flow stats for a filter or current day.
 */
async function getCashStats(filters?: {
  from?: string;
  to?: string;
  userId?: string;
}): Promise<{
  opening: string;
  closing: string;
  totalCashIn: string;
  totalCashOut: string;
}> {
  // If single-day filter matches today or specific date, use daily register
  if (filters?.from && filters?.to && filters.from === filters.to) {
    const daily = await getDailyRegister(filters.from, filters.userId);
    return {
      opening: daily.openingBalance,
      closing: daily.closingBalance,
      totalCashIn: daily.totalCashIn,
      totalCashOut: daily.totalCashOut,
    };
  }

  const [totalIn, totalOut, opening] = await Promise.all([
    getTotalCashIn(filters),
    getTotalCashOut(filters),
    getOpeningBalance(filters?.userId),
  ]);

  const numOpening = Number(opening) || 0;
  const numIn = Number(totalIn) || 0;
  const numOut = Number(totalOut) || 0;
  const closing = (numOpening + numIn - numOut).toFixed(2);

  return {
    opening: numOpening.toFixed(2),
    closing,
    totalCashIn: numIn.toFixed(2),
    totalCashOut: numOut.toFixed(2),
  };
}

export type {
  CashTransactionRow,
  DailyRegisterRow,
  MonthlySummary,
  PaginationParams,
};
export {
  listCashTransactions,
  listAllFilteredCashTransactions,
  getTotalCashIn,
  getTotalCashOut,
  getOpeningBalance,
  findSyncedTransaction,
  getDailyRegister,
  listDailyRegisters,
  getMonthlySummary,
  getCashStats,
};
