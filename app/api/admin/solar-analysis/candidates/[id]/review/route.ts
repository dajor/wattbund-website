import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { refreshSolarAnalysisJob } from "@/lib/solar-analysis";
import { solarCandidateReviewSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  if (!pool) return NextResponse.json({ error: "Datenbank ist nicht konfiguriert" }, { status: 503 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Ungültiger Solar-Fund" }, { status: 400 });
  const parsed = solarCandidateReviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Entscheidung" }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const candidate = await client.query<{ job_id: string }>(
      `UPDATE solar_candidates SET review_status = $2::solar_candidate_review_status, reviewed_by = $3, reviewed_at = now()
       WHERE id = $1 RETURNING job_id`,
      [id, parsed.data.decision === "confirm" ? "confirmed" : "rejected", session.user.id]
    );
    if (!candidate.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Solar-Fund nicht gefunden" }, { status: 404 });
    }
    if (parsed.data.decision === "confirm") {
      await client.query(
        `INSERT INTO solar_installations (
           candidate_id, job_id, region_name, kind, geometry, estimated_area_m2, capacity_kwp,
           annual_yield_kwh, source_as_of, model, reviewed_by
         )
         SELECT c.id, c.job_id, j.region_name, c.kind, c.geometry, c.estimated_area_m2, c.estimated_kwp,
           c.annual_yield_kwh, 'Luftbild abgerufen ' || to_char(c.created_at, 'YYYY-MM-DD'), j.model, $2
         FROM solar_candidates c JOIN solar_analysis_jobs j ON j.id = c.job_id WHERE c.id = $1
         ON CONFLICT (candidate_id) DO UPDATE SET
           kind = EXCLUDED.kind, geometry = EXCLUDED.geometry, estimated_area_m2 = EXCLUDED.estimated_area_m2,
           capacity_kwp = EXCLUDED.capacity_kwp, annual_yield_kwh = EXCLUDED.annual_yield_kwh,
           reviewed_by = EXCLUDED.reviewed_by, published = true, updated_at = now()`,
        [id, session.user.id]
      );
    } else {
      await client.query(`DELETE FROM solar_installations WHERE candidate_id = $1`, [id]);
    }
    await client.query(
      `INSERT INTO audit_events (actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'solar_candidate', $3, '{}'::jsonb)`,
      [session.user.id, parsed.data.decision === "confirm" ? "solar.candidate_confirmed" : "solar.candidate_rejected", id]
    );
    await refreshSolarAnalysisJob(client, candidate.rows[0].job_id);
    await client.query("COMMIT");
    return NextResponse.json({ id, decision: parsed.data.decision });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Solar candidate review failed", error);
    return NextResponse.json({ error: "Die Prüfung konnte nicht gespeichert werden." }, { status: 500 });
  } finally {
    client.release();
  }
}
