import { requirePool } from "@/lib/db";

async function main() {
  const pool = requirePool();
  const pending = await pool.query(
    `DELETE FROM region_interests WHERE status = 'pending' AND created_at < now() - interval '7 days' RETURNING id`
  );
  const expired = await pool.query(
    `SELECT count(*)::int AS count FROM region_interests WHERE status = 'confirmed' AND consent_expires_at <= now()`
  );
  console.log(`Deleted ${pending.rowCount ?? 0} unconfirmed region interests`);
  console.log(`${expired.rows[0].count} confirmed interests require renewed consent`);
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
