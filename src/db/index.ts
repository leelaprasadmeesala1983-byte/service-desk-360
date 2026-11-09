import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import { setupDnsResilience } from "@/lib/dns-resilience";
import * as schema from "./schema/index";

// Install DNS resilience fallback for Neon hostnames
setupDnsResilience();

function validateAndNormalizeConnectionString(raw?: string): string {
  if (!raw || typeof raw !== "string" || !raw.trim()) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and configure a valid PostgreSQL connection string.",
    );
  }

  const trimmed = raw.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      throw new Error(
        `Invalid DATABASE_URL protocol: expected "postgresql:" or "postgres:", got "${parsed.protocol}"`,
      );
    }
    if (!parsed.hostname) {
      throw new Error("Invalid DATABASE_URL: missing hostname.");
    }
  } catch (err: any) {
    if (err.message?.includes("Invalid DATABASE_URL")) {
      throw err;
    }
    throw new Error(
      "Invalid DATABASE_URL format. Ensure it is a valid postgresql:// URI.",
    );
  }

  // Explicitly use verify-full to satisfy node-postgres pg v9 security semantics and eliminate warnings
  return trimmed.includes("sslmode=require")
    ? trimmed.replace("sslmode=require", "sslmode=verify-full")
    : trimmed;
}

const connectionString = process.env.DATABASE_URL;
const normalizedConnectionString =
  validateAndNormalizeConnectionString(connectionString);

const poolConfig: PoolConfig = {
  connectionString: normalizedConnectionString,
  max: 5,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  allowExitOnIdle: true,
};

function isConnectionDropError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  const msg = (e.message || "").toLowerCase();
  const code = e.code || "";
  return (
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    code === "57P01" ||
    code === "57P02" ||
    code === "57P03" ||
    code === "08000" ||
    code === "08003" ||
    code === "08006" ||
    msg.includes("connection terminated") ||
    msg.includes("connection reset") ||
    msg.includes("terminating connection") ||
    msg.includes("socket hang up") ||
    msg.includes("client was closed") ||
    msg.includes("server closed the connection")
  );
}

// Global singleton to prevent pool proliferation across Next.js re-evaluations and HMR
const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
  drizzleDb?: ReturnType<typeof drizzle<typeof schema>>;
};

const pool =
  globalForDb.pgPool ??
  (() => {
    const newPool = new Pool(poolConfig);
    newPool.on("error", (err) => {
      // Prevent idle client termination (e.g. Neon PgBouncer dropping idle socket) from crashing the Node process
      console.warn(
        "PostgreSQL pool idle client warning (handled):",
        err.message,
      );
    });

    const originalQuery = newPool.query.bind(newPool);
    // Wrap pool.query with connection-drop retry and safe diagnostic logging
    newPool.query = (async (
      queryTextOrConfig: any,
      values?: any,
      callback?: any,
    ): Promise<any> => {
      if (typeof values === "function" || typeof callback === "function") {
        return (originalQuery as any)(queryTextOrConfig, values, callback);
      }

      try {
        return await (originalQuery as any)(queryTextOrConfig, values);
      } catch (err: any) {
        if (isConnectionDropError(err)) {
          console.warn(
            "[PostgreSQL Pool] Connection dropped by server; reconnecting and retrying query...",
          );
          return await (originalQuery as any)(queryTextOrConfig, values);
        }

        // Safe diagnostic logging for database errors (without logging parameters or credentials)
        const text =
          typeof queryTextOrConfig === "string"
            ? queryTextOrConfig
            : queryTextOrConfig?.text || "";

        if (text.includes('"session"')) {
          console.error("[PostgreSQL Session Query Error Diagnostic]", {
            message: err?.message,
            code: err?.code,
            detail: err?.detail,
            hint: err?.hint,
            schema: err?.schema,
            table: err?.table,
            column: err?.column,
            constraint: err?.constraint,
            severity: err?.severity,
            routine: err?.routine,
          });
        }

        throw err;
      }
    }) as typeof newPool.query;

    return newPool;
  })();

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

const db = globalForDb.drizzleDb ?? drizzle(pool, { schema });

if (process.env.NODE_ENV !== "production") {
  globalForDb.drizzleDb = db;
}

export { db, pool };
