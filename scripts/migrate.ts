import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { requirePool } from "@/lib/db";

async function main() {
  const pool = requirePool();
  const directory = resolve("drizzle");
  const migrations = (await readdir(directory)).filter((file) => file.endsWith(".sql")).sort();
  for (const migration of migrations) {
    const sql = await readFile(resolve(directory, migration), "utf8");
    await pool.query(sql);
    console.log(`Applied ${migration}`);
  }
  await pool.end();
  console.log("WattBund database migration completed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
