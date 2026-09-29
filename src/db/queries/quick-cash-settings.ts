import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quickCashSettings } from "@/db/schema/quick-cash-settings";

/**
 * Get opening balance setting (scoped to user if provided)
 */
async function getOpeningBalance(userId?: string): Promise<string> {
  try {
    if (userId) {
      const [userResult] = await db
        .select({ value: quickCashSettings.value })
        .from(quickCashSettings)
        .where(eq(quickCashSettings.key, `opening_balance_${userId}`));

      if (userResult?.value) {
        return String(userResult.value);
      }
      return "0.00";
    }

    const [result] = await db
      .select({ value: quickCashSettings.value })
      .from(quickCashSettings)
      .where(eq(quickCashSettings.key, "opening_balance"));

    return result?.value ? String(result.value) : "0.00";
  } catch {
    return "0.00";
  }
}

/**
 * Set opening balance (admin only, scoped to user)
 */
async function setOpeningBalance(
  amount: string,
  updatedBy: string,
): Promise<void> {
  try {
    const key = `opening_balance_${updatedBy}`;
    await db
      .insert(quickCashSettings)
      .values({
        key,
        value: amount,
        description: `Daily opening balance for user ${updatedBy}`,
        updatedBy,
      })
      .onConflictDoUpdate({
        target: quickCashSettings.key,
        set: {
          value: amount,
          updatedBy,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("setOpeningBalance error:", error);
    throw new Error("Failed to set opening balance");
  }
}

export { getOpeningBalance, setOpeningBalance };
