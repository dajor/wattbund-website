import { after, NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { createSolarScanTiles, dispatchSolarAnalysisTiles, MAX_SOLAR_SCAN_TILES, recoverStaleSolarAnalysisTiles } from "@/lib/solar-analysis";
import { solarScanJobSchema } from "@/lib/validation";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin" ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  if (!pool) return NextResponse.json({ jobs: [], configured: false });
  const recoveredJobIds = await recoverStaleSolarAnalysisTiles(pool);
  recoveredJobIds.forEach((jobId) => after(() => dispatchSolarAnalysisTiles(jobId)));
  const jobs = await pool.query(
    `SELECT id, external_place_id, region_name, location_label, bounds, scan_mode, source_key, model,
      status, total_tiles, completed_tiles, failed_tiles, candidate_count, confirmed_count,
      error, created_at, started_at, completed_at, updated_at,
      ST_X(center) AS longitude, ST_Y(center) AS latitude
     FROM solar_analysis_jobs
     ORDER BY created_at DESC
     LIMIT 50`
  );
  return NextResponse.json({ jobs: jobs.rows, configured: Boolean(process.env.SOLAR_SCAN_FUNCTION_URL), maxTiles: MAX_SOLAR_SCAN_TILES });
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  if (!pool) return NextResponse.json({ error: "Datenbank ist nicht konfiguriert" }, { status: 503 });

  const parsed = solarScanJobSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte wähle ein gültiges Gemeindegebiet." }, { status: 400 });
  const input = parsed.data;
  const tiles = createSolarScanTiles(input.bbox, input.scanMode, input.center);
  if (tiles.length > MAX_SOLAR_SCAN_TILES) {
    return NextResponse.json({
      error: `Das Gebiet umfasst ${tiles.length} Luftbild-Kacheln. Der MVP erlaubt höchstens ${MAX_SOLAR_SCAN_TILES}. Bitte starte zunächst den 9-Kacheln-Test.`
    }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO solar_analysis_jobs (
         external_place_id, region_name, location_label, center, bounds, scan_mode,
         total_tiles, created_by
       ) VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6::jsonb, $7, $8, $9)
       RETURNING id`,
      [input.externalPlaceId ?? null, input.regionName, input.locationLabel, input.center[0], input.center[1], JSON.stringify(input.bbox), input.scanMode, tiles.length, session.user.id]
    );
    const jobId = inserted.rows[0].id;
    for (const tile of tiles) {
      await client.query(
        `INSERT INTO solar_analysis_tiles (job_id, tile_key, bounds) VALUES ($1, $2, $3::jsonb)`,
        [jobId, tile.key, JSON.stringify(tile.bounds)]
      );
    }
    await client.query(
      `INSERT INTO audit_events (actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, 'solar.scan_started', 'solar_analysis_job', $2, jsonb_build_object('region', $3::text, 'tiles', $4::int, 'mode', $5::text))`,
      [session.user.id, jobId, input.regionName, tiles.length, input.scanMode]
    );
    await client.query("COMMIT");
    after(() => dispatchSolarAnalysisTiles(jobId));
    return NextResponse.json({ jobId, totalTiles: tiles.length }, { status: 201 });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Solar analysis job creation failed", error);
    return NextResponse.json({ error: "Der Solar-Scan konnte nicht angelegt werden." }, { status: 500 });
  } finally {
    client.release();
  }
}
