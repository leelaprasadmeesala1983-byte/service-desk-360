import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

import * as schema from "./schema/index";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and set it before starting the app.",
  );
}

// Explicitly use verify-full to satisfy node-postgres pg v9 security semantics and eliminate warnings
const normalizedConnectionString = connectionString.includes("sslmode=require")
  ? connectionString.replace("sslmode=require", "sslmode=verify-full")
  : connectionString;

const poolConfig: PoolConfig = {
  connectionString: normalizedConnectionString,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

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
