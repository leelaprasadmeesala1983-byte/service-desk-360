import "server-only";

import { and, eq, gte, lte, sum } from "drizzle-orm";
import { db } from "@/db";
import { cashTransaction } from "@/db/schema/cash-transaction";
import { getLocalDateBoundaries } from "@/lib/format";

/**
 * Get total Cash In amount for a given date range and optional user.
 */
export async function getTotalCashIn(filters?: {
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
export async function getTotalCashOut(filters?: {
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
