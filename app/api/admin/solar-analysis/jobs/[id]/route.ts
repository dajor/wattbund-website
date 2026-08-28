import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  if (!pool) return NextResponse.json({ error: "Datenbank ist nicht konfiguriert" }, { status: 503 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Ungültiger Scan" }, { status: 400 });

  const [job, candidates, failures] = await Promise.all([
    pool.query(
      `SELECT id, external_place_id, region_name, location_label, bounds, scan_mode, source_key, model,
        status, total_tiles, completed_tiles, failed_tiles, candidate_count, confirmed_count,
        error, created_at, started_at, completed_at, updated_at,
        ST_X(center) AS longitude, ST_Y(center) AS latitude
       FROM solar_analysis_jobs WHERE id = $1`,
      [id]
    ),
    pool.query(
      `SELECT c.id, c.tile_id, c.detection_index, c.kind, c.confidence, c.estimated_area_m2, c.estimated_kwp,
        c.annual_yield_kwh, c.review_status, c.reviewed_at, c.created_at, t.bounds AS tile_bounds,
        ST_AsGeoJSON(c.geometry)::json AS geometry
       FROM solar_candidates c
       JOIN solar_analysis_tiles t ON t.id = c.tile_id
       WHERE c.job_id = $1
       ORDER BY c.review_status = 'pending' DESC, c.confidence DESC, c.created_at ASC`,
      [id]
    ),
    pool.query(
      `SELECT id, tile_key, attempts, last_error FROM solar_analysis_tiles
       WHERE job_id = $1 AND status = 'failed' ORDER BY tile_key LIMIT 20`,
      [id]
    )
  ]);
  if (!job.rows[0]) return NextResponse.json({ error: "Scan nicht gefunden" }, { status: 404 });
  return NextResponse.json({ job: job.rows[0], candidates: candidates.rows, failures: failures.rows });
}
