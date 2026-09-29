/**
 * Bootstraps the first admin login and the default department list.
 *
 * Run with:  npm run db:seed
 * Override the admin with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD / SEED_ADMIN_PHONE.
 */
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { department } from "@/db/schema/department";
import { auth } from "@/lib/auth";
import { DEFAULT_DEPARTMENTS } from "@/lib/constants";

async function seedDepartments() {
  await db
    .insert(department)
    .values(DEFAULT_DEPARTMENTS.map((name) => ({ name })))
    .onConflictDoNothing();

  console.log(`Departments ready (${DEFAULT_DEPARTMENTS.length} defaults).`);
}

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@servicedesk360.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const phone = process.env.SEED_ADMIN_PHONE ?? "9999999999";

  const existing = await db.query.user.findFirst({
    where: eq(user.email, email),
    columns: { id: true },
  });

  if (existing) {
    console.log(`Admin ${email} already exists; leaving it untouched.`);
    return;
  }

  const ctx = await auth.$context;
  const id = crypto.randomUUID();

  await db.insert(user).values({
    id,
    name: "System Admin",
    email,
    emailVerified: true,
    firstName: "System",
    lastName: "Admin",
    phone,
    role: "ADMIN",
    status: "ACTIVE",
  });

  await ctx.internalAdapter.createAccount({
    userId: id,
    providerId: "credential",
    accountId: id,
    password: await ctx.password.hash(password),
  });

  console.log(`Created admin ${email} (password: ${password}).`);
  console.log("Change this password after the first sign-in.");
}

async function main() {
  await seedDepartments();
  await seedAdmin();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
