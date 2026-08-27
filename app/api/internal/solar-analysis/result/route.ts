import { after, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { dispatchSolarAnalysisTiles, refreshSolarAnalysisJob, safeSecretMatches } from "@/lib/solar-analysis";
import { solarScanCallbackSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!safeSecretMatches(request.headers.get("x-solar-scan-secret"), process.env.SOLAR_SCAN_SECRET)) {
    return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  }
  if (!pool) return NextResponse.json({ error: "Datenbank ist nicht konfiguriert" }, { status: 503 });
  const parsed = solarScanCallbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültiges Scan-Ergebnis" }, { status: 400 });
  const result = parsed.data;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tile = await client.query<{ attempts: number }>(
      `SELECT attempts FROM solar_analysis_tiles WHERE id = $1 AND job_id = $2 FOR UPDATE`,
      [result.tileId, result.jobId]
    );
    if (!tile.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Kachel nicht gefunden" }, { status: 404 });
    }

    if (!result.success) {
      const retry = tile.rows[0].attempts < 3;
      await client.query(
        `UPDATE solar_analysis_tiles SET status = $2::solar_analysis_tile_status, last_error = $3,
          completed_at = CASE WHEN $2 = 'failed' THEN now() ELSE NULL END WHERE id = $1`,
        [result.tileId, retry ? "queued" : "failed", result.error ?? "KI-Analyse fehlgeschlagen"]
      );
    } else {
      for (const detection of result.detections) {
        await client.query(
          `INSERT INTO solar_candidates (
             job_id, tile_id, detection_index, kind, confidence, geometry,
             estimated_area_m2, estimated_kwp, annual_yield_kwh, raw_result
           ) VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_GeomFromGeoJSON($6), 4326), $7, $8, $9, $10::jsonb)
           ON CONFLICT (tile_id, detection_index) DO UPDATE SET
             kind = EXCLUDED.kind, confidence = EXCLUDED.confidence, geometry = EXCLUDED.geometry,
             estimated_area_m2 = EXCLUDED.estimated_area_m2, estimated_kwp = EXCLUDED.estimated_kwp,
             annual_yield_kwh = EXCLUDED.annual_yield_kwh, raw_result = EXCLUDED.raw_result`,
          [
            result.jobId,
            result.tileId,
            detection.detectionIndex,
            detection.kind,
            detection.confidence,
            JSON.stringify(detection.geometry),
            detection.estimatedAreaM2,
            detection.estimatedKwp,
            detection.annualYieldKwh,
            JSON.stringify(detection.raw ?? {})
          ]
        );
      }
      await client.query(
        `UPDATE solar_analysis_tiles SET status = 'completed', completed_at = now(), last_error = NULL WHERE id = $1`,
        [result.tileId]
      );
    }
    await refreshSolarAnalysisJob(client, result.jobId);
    await client.query("COMMIT");
    after(() => dispatchSolarAnalysisTiles(result.jobId, 1));
    return NextResponse.json({ accepted: true });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Solar analysis callback failed", error);
    return NextResponse.json({ error: "Scan-Ergebnis konnte nicht gespeichert werden" }, { status: 500 });
  } finally {
    client.release();
  }
}
