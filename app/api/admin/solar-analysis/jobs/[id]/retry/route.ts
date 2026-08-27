import { after, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { dispatchSolarAnalysisTiles } from "@/lib/solar-analysis";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  if (!pool) return NextResponse.json({ error: "Datenbank ist nicht konfiguriert" }, { status: 503 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Ungültiger Scan" }, { status: 400 });
  const updated = await pool.query(
    `UPDATE solar_analysis_tiles SET status = 'queued', attempts = 0, last_error = NULL, completed_at = NULL
     WHERE job_id = $1 AND (status = 'failed' OR (status = 'running' AND started_at < now() - interval '5 minutes')) RETURNING id`,
    [id]
  );
  if (!updated.rowCount) return NextResponse.json({ error: "Keine fehlgeschlagenen Kacheln vorhanden" }, { status: 409 });
  await pool.query(`UPDATE solar_analysis_jobs SET status = 'queued', failed_tiles = 0, completed_at = NULL, updated_at = now() WHERE id = $1`, [id]);
  await pool.query(
    `INSERT INTO audit_events (actor_user_id, action, target_type, target_id, metadata)
     VALUES ($1, 'solar.scan_retried', 'solar_analysis_job', $2, jsonb_build_object('tiles', $3::int))`,
    [session.user.id, id, updated.rowCount]
  );
  after(() => dispatchSolarAnalysisTiles(id));
  return NextResponse.json({ retried: updated.rowCount });
}
