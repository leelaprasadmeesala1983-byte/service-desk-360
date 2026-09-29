"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth";

import { type ActionResult, actionError, actionOk } from "./result";

const INVALID_CREDENTIALS = "Invalid email/phone number or password.";
const INACTIVE_ACCOUNT =
  "Your account is inactive. Please contact an administrator.";
const UNKNOWN_EMAIL = "No account found with that email address.";

/** Phone numbers are login identifiers too, so resolve them to the account email. */
async function findAccountByIdentifier(identifier: string) {
  const trimmed = identifier.trim();
  const isEmail = trimmed.includes("@");

  if (isEmail) {
    return db.query.user.findFirst({
      where: eq(user.email, trimmed.toLowerCase()),
      columns: { id: true, email: true, status: true },
    });
  }

  return db.query.user.findFirst({
    where: eq(user.phone, trimmed),
    columns: { id: true, email: true, status: true },
  });
}

async function findAccountByEmail(email: string) {
  return db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true, email: true, status: true },
  });
}

async function login(input: unknown): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "Please correct the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { identifier, password } = parsed.data;

  const account = await findAccountByIdentifier(identifier);
  // Same message whether the identifier is unknown or the password is wrong,
  // so the form never reveals which identifiers are registered.
  if (!account) return actionError(INVALID_CREDENTIALS);

  try {
    await auth.api.signInEmail({
      body: { email: account.email, password },
      headers: await headers(),
    });
  } catch (error) {
    // The session hook rejects inactive accounts, but only after the password
    // has been verified — so this message cannot be used to probe for accounts.
    if (isInactiveAccountError(error)) return actionError(INACTIVE_ACCOUNT);
    return actionError(INVALID_CREDENTIALS);
  }

  return actionOk();
}

function isInactiveAccountError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const body = (error as { body?: { code?: string } }).body;
  return body?.code === "ACCOUNT_INACTIVE";
}

/**
 * Step 1 of the reset: confirm the email belongs to an active account. The
 * answer is explicit — the reset runs in the same visit, with no emailed link
 * or code to prove ownership, so the form does say which addresses exist.
 */
async function verifyResetEmail(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "Please correct the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const account = await findAccountByEmail(parsed.data.email);

  if (!account) return actionError(UNKNOWN_EMAIL);
  if (account.status === "INACTIVE") return actionError(INACTIVE_ACCOUNT);

  return actionOk();
}

/**
 * Step 2 of the reset: write the new password for the account named in step 1.
 * The email is re-checked here because step 1 leaves nothing behind that this
 * call could trust.
 */
async function completePasswordReset(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      "Please correct the highlighted fields.",
      parsed.error.flatten().fieldErrors,
    );
  }

  const { email, newPassword } = parsed.data;

  const account = await findAccountByEmail(email);
  if (!account) return actionError(UNKNOWN_EMAIL);
  if (account.status === "INACTIVE") return actionError(INACTIVE_ACCOUNT);

  try {
    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash(newPassword);
    const accounts = await ctx.internalAdapter.findAccounts(account.id);
    const hasCredentials = accounts.some(
      (row) => row.providerId === "credential",
    );

    // Seeded or invite-only accounts may not have a credential row yet.
    if (hasCredentials) {
      await ctx.internalAdapter.updatePassword(account.id, hashedPassword);
    } else {
      await ctx.internalAdapter.createAccount({
        userId: account.id,
        providerId: "credential",
        accountId: account.id,
        password: hashedPassword,
      });
    }

    // Any session opened with the old password dies with the reset.
    await ctx.internalAdapter.deleteUserSessions(account.id);
  } catch {
    return actionError("Could not update the password. Please try again.");
  }

  return actionOk();
}

async function logout(): Promise<ActionResult> {
  await auth.api.signOut({ headers: await headers() });
  return actionOk();
}

export { login, verifyResetEmail, completePasswordReset, logout };
