import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/lib/db/schema";

const databaseUrl = process.env.DATABASE_URL;
const poolConnection = databaseUrl ? createPoolConnection(databaseUrl) : null;

export const pool = poolConnection
  ? new Pool({
      ...poolConnection,
      max: 10,
      idleTimeoutMillis: 30_000
    })
  : null;

export const db = pool ? drizzle(pool, { schema }) : null;

export function requirePool() {
  if (!pool) throw new Error("DATABASE_URL is not configured");
  return pool;
}

function createPoolConnection(connectionString: string) {
  const url = new URL(connectionString);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const isLocal = localHosts.has(url.hostname);

  // node-postgres lets sslmode from the URL replace the explicit SSL object.
  // App Platform DEV databases use a self-signed chain, so keep TLS enabled
  // while applying the intended certificate policy explicitly.
  url.searchParams.delete("sslmode");
  url.searchParams.delete("uselibpqcompat");

  return {
    connectionString: url.toString(),
    ssl: isLocal ? false : { rejectUnauthorized: false }
  };
}
