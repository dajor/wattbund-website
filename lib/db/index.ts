import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";

const databaseUrl = process.env.DATABASE_URL;

export const pool = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000
    })
  : null;

export const db = pool ? drizzle(pool, { schema }) : null;

export function requirePool() {
  if (!pool) throw new Error("DATABASE_URL is not configured");
  return pool;
}
