import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { requirePool } from "@/lib/db";

async function main() {
  const sql = await readFile(resolve("drizzle/0000_solar_map.sql"), "utf8");
  const pool = requirePool();
  await pool.query(sql);
  await pool.end();
  console.log("WattBund database migration completed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
