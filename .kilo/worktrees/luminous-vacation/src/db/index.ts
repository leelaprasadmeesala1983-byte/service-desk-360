import { drizzle } from "drizzle-orm/node-postgres";

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

const db = drizzle(normalizedConnectionString, { schema });

export { db };
