import "server-only";

import { and, count, desc, eq, gte, lt, lte } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import {
  ensureDailyCashRegister,
  performMidnightRolloverForAllUsers,
  recalculateDailyCashRegister,
} from "@/db/queries/quick-cash-rollover";
import { getOpeningBalance as getOpeningBalanceSetting } from "@/db/queries/quick-cash-settings";
import { user } from "@/db/schema/auth";
import { cashTransaction } from "@/db/schema/cash-transaction";
import { dailyCashRegister } from "@/db/schema/daily-cash-register";
import {
  APP_TIMEZONE,
  formatLocalDate,
  formatRecordId,
  getLocalDateBoundaries,
} from "@/lib/format";
import type {
  CashTransactionRow,
  DailyRegisterRow,
  MonthlySummary,
  PaginationParams,
} from "@/types/cash-transactions";

import {
  getTotalCashIn,
  getTotalCashOut,
} from "./cash-transactions-aggregates";

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
 * Automatically performs midnight rollover & catch-up if needed.
 */
async function getDailyRegister(
  dateStr?: string,
  userId?: string,
): Promise<DailyRegisterRow> {
  return await ensureDailyCashRegister(dateStr, userId);
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
    const todayStr = formatLocalDate(new Date(), APP_TIMEZONE);
    // Ensure rollover is up to date before querying history
    if (params.userId) {
      await ensureDailyCashRegister(todayStr, params.userId);
    }

    const offset = (params.page - 1) * params.limit;

    const registerFilters = [lt(dailyCashRegister.date, todayStr)];
    if (params.userId) {
      registerFilters.push(eq(dailyCashRegister.userId, params.userId));
    }

    const [savedRegisters, totalCountResult] = await Promise.all([
      db
        .select()
        .from(dailyCashRegister)
        .where(and(...registerFilters))
        .orderBy(desc(dailyCashRegister.date))
        .limit(params.limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(dailyCashRegister)
        .where(and(...registerFilters)),
    ]);

    const total = totalCountResult[0]?.count || 0;

    const rows: DailyRegisterRow[] = savedRegisters.map((r) => ({
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
    }));

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
    const todayStr = formatLocalDate(new Date(), APP_TIMEZONE);
    if (userId) {
      await ensureDailyCashRegister(todayStr, userId);
    }

    const registerFilters = [
      gte(dailyCashRegister.date, from),
      lte(dailyCashRegister.date, to),
    ];
    if (userId) {
      registerFilters.push(eq(dailyCashRegister.userId, userId));
    }

    // 1. Get opening balance of the earliest day in or before `from`
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
  ensureDailyCashRegister,
  recalculateDailyCashRegister,
  performMidnightRolloverForAllUsers,
};
