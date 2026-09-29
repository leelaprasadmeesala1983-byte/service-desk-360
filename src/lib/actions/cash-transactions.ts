"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import { z } from "zod";

import { db } from "@/db";
import {
  findSyncedTransaction,
  getDailyRegister,
  listAllFilteredCashTransactions,
} from "@/db/queries/cash-transactions";
import { setOpeningBalance as setOpeningBalanceQuery } from "@/db/queries/quick-cash-settings";
import { cashTransaction } from "@/db/schema/cash-transaction";
import { dailyCashRegister } from "@/db/schema/daily-cash-register";
import { formatLocalDate, getLocalDateBoundaries } from "@/lib/format";
import { diffRecord, notifyTechnicianOfEdit } from "@/lib/notifications";
import { requireAdmin, requireUser } from "@/lib/session";
import { numericField } from "@/lib/validations/common";

import { type ActionResult, actionError, actionOk } from "./result";

const PATH = "/quick-cash";

/**
 * Fetch a single transaction for editing.
 */
async function getCashTransaction(id: string): Promise<{
  id: string;
  type: "CASH_IN" | "CASH_OUT";
  amount: string;
  description: string;
  date: string; // ISO date string YYYY-MM-DD
} | null> {
  try {
    const current = await requireUser();
    if (current.role !== "ADMIN") return null;

    const transaction = await db.query.cashTransaction.findFirst({
      where: eq(cashTransaction.id, id),
    });

    if (!transaction) return null;

    return {
      id: transaction.id,
      type: transaction.type,
      amount: String(Math.abs(Number(transaction.amount) || 0)),
      description: transaction.description,
      date: formatLocalDate(transaction.createdAt),
    };
  } catch (error) {
    console.error("getCashTransaction error:", error);
    return null;
  }
}

const cashTransactionSchema = z.object({
  id: z.string().min(1).optional(),
  type: z.enum(["CASH_IN", "CASH_OUT"]),
  amount: numericField.refine((v) => v !== null && Number(v) > 0, {
    message: "Amount must be greater than 0",
  }),
  description: z.string().trim().min(1, "Description is required").max(500),
  date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
    message: "Invalid date",
  }),
});

function invalid(error: ZodError): ActionResult {
  return actionError(
    "Please correct the highlighted fields.",
    error.flatten().fieldErrors,
  );
}

/**
 * Add a manual cash transaction (admin only).
 * Checks if the day is a past closed day or if Cash Out exceeds available balance.
 */
async function addCashTransaction(input: unknown): Promise<ActionResult> {
  try {
    const current = await requireUser();
    if (current.role !== "ADMIN") return actionError("Admins only.");

    const parsed = cashTransactionSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const data = parsed.data;

    const todayStr = formatLocalDate(new Date());
    const dateStr = data.date || todayStr;

    if (dateStr < todayStr) {
      return actionError(
        `The cash register for ${dateStr} is closed. Transactions cannot be added to a past day.`,
      );
    }

    const register = await getDailyRegister(dateStr);
    const numAmount = Math.abs(Number(data.amount) || 0);

    // Check available balance for CASH_OUT
    if (data.type === "CASH_OUT") {
      const available =
        Number(register.openingBalance) +
        Number(register.totalCashIn) -
        Number(register.totalCashOut);

      if (numAmount > available) {
        return actionError(
          `Insufficient cash balance. Available balance is ₹${available.toFixed(2)}.`,
        );
      }
    }

    const normalizedAmount = String(numAmount);
    let txDate: Date;
    if (dateStr === todayStr) {
      txDate = new Date();
    } else {
      const { start } = getLocalDateBoundaries(dateStr);
      txDate = new Date(start.getTime() + 12 * 3600 * 1000);
    }

    const [result] = await db
      .insert(cashTransaction)
      .values({
        type: data.type as "CASH_IN" | "CASH_OUT",
        amount: normalizedAmount,
        description: data.description,
        customerName: current.name || "Admin",
        createdById: current.id,
        isAdminEntry: true,
        createdAt: txDate,
      })
      .returning({ id: cashTransaction.id });

    if (!result) return actionError("Failed to create transaction.");

    revalidatePath(PATH);
    revalidatePath("/");
    return actionOk();
  } catch (error) {
    console.error("addCashTransaction error:", error);
    return actionError("Failed to add transaction. Please try again.");
  }
}

/**
 * Update a cash transaction (admin only).
 */
async function updateCashTransaction(input: unknown): Promise<ActionResult> {
  try {
    const current = await requireUser();
    if (current.role !== "ADMIN") return actionError("Admins only.");

    const baseSchema = cashTransactionSchema.extend({
      id: z.string().min(1),
    });
    const parsed = baseSchema.safeParse(input);
    if (!parsed.success) return invalid(parsed.error);
    const data = parsed.data;

    const existing = await db.query.cashTransaction.findFirst({
      where: eq(cashTransaction.id, data.id),
    });
    if (!existing) return actionError("Transaction not found.");

    const todayStr = formatLocalDate(new Date());
    const existingDateStr = formatLocalDate(existing.createdAt);

    if (existingDateStr < todayStr) {
      return actionError(
        `The cash register for ${existingDateStr} is closed. Transactions cannot be modified on a past day.`,
      );
    }

    if (data.date < todayStr) {
      return actionError(
        `The cash register for ${data.date} is closed. Transactions cannot be moved to a past day.`,
      );
    }

    const existingRegister = await getDailyRegister(existingDateStr);
    const numAmount = Math.abs(Number(data.amount) || 0);

    // Verify available balance for CASH_OUT
    if (data.type === "CASH_OUT") {
      let available =
        Number(existingRegister.openingBalance) +
        Number(existingRegister.totalCashIn) -
        Number(existingRegister.totalCashOut);

      // Add back existing transaction if on the same day
      if (data.date === existingDateStr) {
        if (existing.type === "CASH_OUT") {
          available += Number(existing.amount);
        } else {
          available -= Number(existing.amount);
        }
      }

      if (numAmount > available) {
        return actionError(
          `Insufficient cash balance. Available balance is ₹${available.toFixed(2)}.`,
        );
      }
    }

    const before = {
      type: existing.type,
      amount: existing.amount,
      description: existing.description,
    };

    const normalizedAmount = String(numAmount);
    let txDate: Date;
    if (data.date === existingDateStr) {
      txDate = existing.createdAt;
    } else if (data.date === todayStr) {
      txDate = new Date();
    } else {
      const { start } = getLocalDateBoundaries(data.date);
      txDate = new Date(start.getTime() + 12 * 3600 * 1000);
    }

    await db
      .update(cashTransaction)
      .set({
        type: data.type as "CASH_IN" | "CASH_OUT",
        amount: normalizedAmount,
        description: data.description,
        createdAt: txDate,
        updatedAt: new Date(),
      })
      .where(eq(cashTransaction.id, data.id));

    // Notify assigned technician if this is a synced transaction
    if (existing.assignedTechnicianId) {
      const changes = diffRecord(before, data, [
        { key: "type", label: "Type" },
        { key: "amount", label: "Amount" },
        { key: "description", label: "Description" },
      ]);

      if (changes.length > 0) {
        await notifyTechnicianOfEdit(
          {
            recordType: "SERVICE",
            recordId: existing.sourceRecordId || "",
            recordLabel: existing.description,
          },
          {
            technicianId: existing.assignedTechnicianId,
            actorId: current.id,
            actorName: current.name,
            summary: `Cash transaction updated: ${changes.join("; ")}`,
          },
        );
      }
    }

    revalidatePath(PATH);
    revalidatePath("/");
    return actionOk();
  } catch (error) {
    console.error("updateCashTransaction error:", error);
    return actionError("Failed to update transaction. Please try again.");
  }
}

/**
 * Delete a cash transaction (admin only).
 */
async function deleteCashTransaction(id: string): Promise<ActionResult> {
  try {
    const current = await requireUser();
    if (current.role !== "ADMIN") return actionError("Admins only.");

    const existing = await db.query.cashTransaction.findFirst({
      where: eq(cashTransaction.id, id),
    });
    if (!existing) return actionError("Transaction not found.");

    const todayStr = formatLocalDate(new Date());
    const dateStr = formatLocalDate(existing.createdAt);

    if (dateStr < todayStr) {
      return actionError(
        `The cash register for ${dateStr} is closed. Transactions cannot be deleted from a past day.`,
      );
    }

    await db.delete(cashTransaction).where(eq(cashTransaction.id, id));
    revalidatePath(PATH);
    revalidatePath("/");
    return actionOk();
  } catch (error) {
    console.error("deleteCashTransaction error:", error);
    return actionError("Failed to delete transaction. Please try again.");
  }
}

/**
 * Set opening balance for a specific day or default (admin only).
 */
async function setOpeningBalance(input: {
  amount: string;
  date?: string;
}): Promise<ActionResult> {
  try {
    const current = await requireUser();
    if (current.role !== "ADMIN") return actionError("Admins only.");

    const parsed = z
      .object({
        amount: numericField.refine((v) => v !== null && Number(v) >= 0, {
          message: "Amount must be a non-negative number",
        }),
        date: z.string().optional(),
      })
      .safeParse(input);

    if (!parsed.success) {
      return actionError("Invalid amount", parsed.error.flatten().fieldErrors);
    }

    const todayStr = formatLocalDate(new Date());
    const targetDate = parsed.data.date || todayStr;

    if (targetDate < todayStr) {
      return actionError(
        `Cannot modify the opening balance of a past closed cash register (${targetDate}).`,
      );
    }

    const register = await getDailyRegister(targetDate);
    const amountStr = parsed.data.amount || "0";

    await db
      .insert(dailyCashRegister)
      .values({
        date: targetDate,
        openingBalance: amountStr,
        totalCashIn: register.totalCashIn,
        totalCashOut: register.totalCashOut,
        closingBalance: (
          Number(amountStr) +
          Number(register.totalCashIn) -
          Number(register.totalCashOut)
        ).toFixed(2),
        status: "OPEN",
      })
      .onConflictDoUpdate({
        target: dailyCashRegister.date,
        set: {
          openingBalance: amountStr,
          closingBalance: (
            Number(amountStr) +
            Number(register.totalCashIn) -
            Number(register.totalCashOut)
          ).toFixed(2),
          updatedAt: new Date(),
        },
      });

    await setOpeningBalanceQuery(amountStr, current.id);

    revalidatePath(PATH);
    revalidatePath("/");
    return actionOk();
  } catch (error) {
    console.error("setOpeningBalance error:", error);
    return actionError("Failed to set opening balance. Please try again.");
  }
}

/**
 * Sync amount from a service request. Creates or updates a CASH_IN transaction.
 */
async function syncServiceRequestAmount(
  sourceRecordId: string,
  sourceRecordType: "SERVICE" | "INSTALLATION" | "PROJECT",
  amount: string | null,
  description: string,
  customerName: string | null,
  assignedTechnicianId: string | null,
  createdById: string,
  sourceRecordLabel: string,
): Promise<void> {
  try {
    if (!amount || Number(amount) === 0) {
      await db
        .delete(cashTransaction)
        .where(
          and(
            eq(cashTransaction.sourceRecordId, sourceRecordId),
            eq(cashTransaction.sourceRecordType, sourceRecordType),
          ),
        );
      return;
    }

    const existing = await findSyncedTransaction(
      sourceRecordId,
      sourceRecordType,
    );

    if (existing) {
      // The register lists entries by created date, so an amount changed
      // after the entry's original day would otherwise stay on that (closed)
      // day and never show up in the current one. Re-date it to now.
      const amountChanged = Number(existing.amount) !== Number(amount);
      await db
        .update(cashTransaction)
        .set({
          amount,
          description,
          customerName,
          sourceRecordLabel,
          assignedTechnicianId,
          ...(amountChanged ? { createdAt: new Date() } : {}),
          updatedAt: new Date(),
        })
        .where(eq(cashTransaction.id, existing.id));
    } else {
      await db.insert(cashTransaction).values({
        type: "CASH_IN",
        amount,
        description,
        sourceRecordId,
        sourceRecordType,
        sourceRecordLabel,
        customerName,
        assignedTechnicianId,
        createdById,
        isAdminEntry: false,
      });
    }
  } catch (error) {
    console.error("syncServiceRequestAmount error:", error);
    // Don't throw - let the caller decide how to handle it
  }
}

/**
 * Export cash transactions (CSV or Excel).
 */
async function exportCashTransactions(
  format: "csv" | "excel",
  from?: string,
  to?: string,
): Promise<{ data: string; filename: string }> {
  await requireAdmin();
  const rows = await listAllFilteredCashTransactions({ from, to });

  const dateSuffix =
    from && to
      ? from === to
        ? from
        : `${from}_to_${to}`
      : formatLocalDate(new Date());

  if (format === "csv") {
    const headers = ["Date", "Type", "Service ID", "Added By", "Amount (₹)"];
    const escapeCSV = (field: unknown) => {
      if (field === null || field === undefined) return "";
      const str = String(field);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvRows = rows.map((r) => {
      return [
        formatLocalDate(r.createdAt),
        r.type === "CASH_IN" ? "Cash In" : "Cash Out",
        r.sourceRecordLabel || "",
        r.createdByName || r.technicianName || "",
        r.type === "CASH_IN" ? `+${r.amount}` : `-${r.amount}`,
      ]
        .map(escapeCSV)
        .join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    return { data: csvContent, filename: `Quick_Cash_${dateSuffix}.csv` };
  } else {
    const rowsHtml = rows
      .map(
        (r) => `
      <tr>
        <td>${formatLocalDate(r.createdAt)}</td>
        <td>${r.type === "CASH_IN" ? "Cash In" : "Cash Out"}</td>
        <td>${r.sourceRecordLabel || ""}</td>
        <td>${r.createdByName || r.technicianName || ""}</td>
        <td>${r.type === "CASH_IN" ? "+" : "-"}${r.amount}</td>
      </tr>
    `,
      )
      .join("");

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
      <x:ExcelWorkbook>
      <x:ExcelWorksheets>
      <x:ExcelWorksheet>
      <x:Name>Quick Cash</x:Name>
      <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
      </x:ExcelWorksheet>
      </x:ExcelWorksheets>
      </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      </head>
      <body>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Service ID</th>
            <th>Added By</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      </body>
      </html>
    `;
    return { data: htmlContent, filename: `Quick_Cash_${dateSuffix}.xls` };
  }
}

export {
  addCashTransaction,
  updateCashTransaction,
  deleteCashTransaction,
  setOpeningBalance,
  syncServiceRequestAmount,
  getCashTransaction,
  exportCashTransactions,
};
