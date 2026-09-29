import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { and, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import * as schema from "@/db/schema/auth";
import { SESSION_IDLE_TIMEOUT_SECONDS } from "@/lib/constants";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),

  baseURL: process.env.BETTER_AUTH_URL,

  trustedOrigins: process.env.CORS_ORIGIN ? [process.env.CORS_ORIGIN] : [],

  emailAndPassword: {
    // Resets do not go through better-auth's emailed-token route: the reset
    // form verifies the email and sets the new password in the same visit,
    // so no sendResetPassword handler is configured. See lib/actions/auth.ts.
    enabled: true,
    minPasswordLength: 8,
  },

  session: {
    // Expiry is pushed forward on activity, giving a 5-hour idle timeout
    // rather than a hard session cap.
    expiresIn: SESSION_IDLE_TIMEOUT_SECONDS,
    updateAge: 5 * 60,
  },

  user: {
    additionalFields: {
      firstName: { type: "string", required: false, input: true },
      lastName: { type: "string", required: false, input: true },
      phone: { type: "string", required: false, input: true },
      department: { type: "string", required: false, input: true },
      // Privilege-bearing fields: never accepted from client payloads.
      role: { type: "string", required: false, input: false },
      status: { type: "string", required: false, input: false },
    },
  },

  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const account = await db.query.user.findFirst({
            where: eq(schema.user.id, session.userId),
            columns: { status: true },
          });

          if (account?.status === "INACTIVE") {
            throw new APIError("FORBIDDEN", {
              code: "ACCOUNT_INACTIVE",
              message:
                "Your account is inactive. Please contact an administrator.",
            });
          }

          return { data: session };
        },

        after: async (session) => {
          // One active session per user: signing in elsewhere ends the others.
          await db
            .delete(schema.session)
            .where(
              and(
                eq(schema.session.userId, session.userId),
                ne(schema.session.id, session.id),
              ),
            );
        },
      },
    },
  },

  plugins: [nextCookies()],
});
