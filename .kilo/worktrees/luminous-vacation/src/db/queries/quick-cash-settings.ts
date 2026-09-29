import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quickCashSettings } from "@/db/schema/quick-cash-settings";

/**
 * Get opening balance setting
 */
async function getOpeningBalance(): Promise<string> {
  try {
    const [result] = await db
      .select({ value: quickCashSettings.value })
      .from(quickCashSettings)
      .where(eq(quickCashSettings.key, "opening_balance"));

    return result?.value ? String(result.value) : "0";
  } catch {
    return "0";
  }
}

/**
 * Set opening balance (admin only)
 */
async function setOpeningBalance(
  amount: string,
  updatedBy: string,
): Promise<void> {
  try {
    await db
      .insert(quickCashSettings)
      .values({
        key: "opening_balance",
        value: amount,
        description: "Daily opening balance",
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
