import type { Pool, PoolClient } from "pg";
import { pool } from "@/lib/db";
import { solarScanCallbackSchema } from "@/lib/validation";

export type SolarScanBounds = [number, number, number, number];
export type SolarScanMode = "sample" | "full";

export interface SolarScanTile {
  key: string;
  bounds: SolarScanBounds;
}

const TILE_EDGE_METERS = 320;
export const MAX_SOLAR_SCAN_TILES = 600;
const DISPATCH_CONCURRENCY = 2;

export function createSolarScanTiles(bounds: SolarScanBounds, mode: SolarScanMode, center: [number, number]): SolarScanTile[] {
  const latitude = center[1];
  const latitudeStep = TILE_EDGE_METERS / 111_320;
  const longitudeStep = TILE_EDGE_METERS / (111_320 * Math.max(0.2, Math.cos(latitude * Math.PI / 180)));

  if (mode === "sample") {
    const tiles: SolarScanTile[] = [];
    for (let row = -1; row <= 1; row += 1) {
      for (let column = -1; column <= 1; column += 1) {
        const west = center[0] + column * longitudeStep - longitudeStep / 2;
        const south = center[1] + row * latitudeStep - latitudeStep / 2;
        tiles.push({
          key: `sample-${row + 1}-${column + 1}`,
          bounds: clampTile([west, south, west + longitudeStep, south + latitudeStep], bounds)
        });
      }
    }
    return tiles;
  }

  const [west, south, east, north] = bounds;
  const columns = Math.ceil((east - west) / longitudeStep);
  const rows = Math.ceil((north - south) / latitudeStep);
  const tiles: SolarScanTile[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const tileWest = west + column * longitudeStep;
      const tileSouth = south + row * latitudeStep;
      tiles.push({
        key: `${row}-${column}`,
        bounds: [tileWest, tileSouth, Math.min(east, tileWest + longitudeStep), Math.min(north, tileSouth + latitudeStep)]
      });
    }
  }
  return tiles;
}

export function estimateSolarScanTiles(bounds: SolarScanBounds, center: [number, number]) {
  return createSolarScanTiles(bounds, "full", center).length;
}

function clampTile(tile: SolarScanBounds, outer: SolarScanBounds): SolarScanBounds {
  return [
    Math.max(tile[0], outer[0]),
    Math.max(tile[1], outer[1]),
    Math.min(tile[2], outer[2]),
    Math.min(tile[3], outer[3])
  ];
}

export async function dispatchSolarAnalysisTiles(jobId: string, concurrency = DISPATCH_CONCURRENCY) {
  const database = pool;
  if (!database) return;
  await Promise.all(Array.from({ length: concurrency }, () => claimAndDispatchTile(database, jobId)));
}

export async function recoverStaleSolarAnalysisTiles(database: Pool) {
  const recovered = await database.query<{ job_id: string }>(
    `UPDATE solar_analysis_tiles
     SET status = CASE WHEN attempts >= 3 THEN 'failed'::solar_analysis_tile_status ELSE 'queued'::solar_analysis_tile_status END,
       last_error = 'Unterbrochener Function-Aufruf wurde automatisch wieder aufgenommen',
       completed_at = CASE WHEN attempts >= 3 THEN now() ELSE NULL END
     WHERE status = 'running' AND started_at < now() - interval '5 minutes'
     RETURNING job_id`
  );
  const jobIds = [...new Set(recovered.rows.map((row) => row.job_id))];
  await Promise.all(jobIds.map((jobId) => refreshSolarAnalysisJob(database, jobId)));
  return jobIds;
}

export async function processNextSolarAnalysisTile(jobId: string) {
  const database = pool;
  if (!database) throw new Error("Datenbank ist nicht konfiguriert");
  const claimed = await database.query<{ id: string; bounds: SolarScanBounds; attempts: number }>(
    `WITH next_tile AS (
       SELECT id FROM solar_analysis_tiles
       WHERE job_id = $1 AND status = 'queued'
       ORDER BY tile_key
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE solar_analysis_tiles t
     SET status = 'running', attempts = attempts + 1, started_at = now(), last_error = NULL
     FROM next_tile
     WHERE t.id = next_tile.id
     RETURNING t.id, t.bounds, t.attempts`,
    [jobId]
  );
  const tile = claimed.rows[0];
  if (!tile) {
    await refreshSolarAnalysisJob(database, jobId);
    return { processed: false };
  }
  await database.query(
    `UPDATE solar_analysis_jobs SET status = 'running', started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = $1`,
    [jobId]
  );

  const functionUrl = process.env.SOLAR_SCAN_FUNCTION_URL;
  const secret = process.env.SOLAR_SCAN_SECRET;
  if (!functionUrl || !secret) {
    await markDispatchFailure(database, tile.id, jobId, tile.attempts, "Solar-Scan-Funktion ist nicht konfiguriert");
    return { processed: false, error: "Solar-Scan-Funktion ist nicht konfiguriert" };
  }

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Require-Whisk-Auth": secret,
        "X-Solar-Scan-Secret": secret
      },
      body: JSON.stringify({ jobId, tileId: tile.id, bounds: tile.bounds }),
      signal: AbortSignal.timeout(4 * 60 * 1000)
    });
    if (!response.ok) throw new Error(`Funktion antwortet mit HTTP ${response.status}`);
    const parsed = solarScanCallbackSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("Funktion liefert kein gültiges Scan-Ergebnis");
    await persistSolarScanResult(database, parsed.data);
    return { processed: true, detections: parsed.data.detections.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Funktionsaufruf fehlgeschlagen";
    await markDispatchFailure(database, tile.id, jobId, tile.attempts, message);
    return { processed: false, error: message };
  }
}

async function persistSolarScanResult(database: Pool, result: ReturnType<typeof solarScanCallbackSchema.parse>) {
  const client = await database.connect();
  try {
    await client.query("BEGIN");
    if (!result.success) {
      const tile = await client.query<{ attempts: number }>(`SELECT attempts FROM solar_analysis_tiles WHERE id = $1 FOR UPDATE`, [result.tileId]);
      const retry = (tile.rows[0]?.attempts ?? 3) < 3;
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
          [result.jobId, result.tileId, detection.detectionIndex, detection.kind, detection.confidence,
            JSON.stringify(detection.geometry), detection.estimatedAreaM2, detection.estimatedKwp,
            detection.annualYieldKwh, JSON.stringify(detection.raw ?? {})]
        );
      }
      await client.query(`UPDATE solar_analysis_tiles SET status = 'completed', completed_at = now(), last_error = NULL WHERE id = $1`, [result.tileId]);
    }
    await refreshSolarAnalysisJob(client, result.jobId);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function claimAndDispatchTile(database: Pool, jobId: string) {
  const claimed = await database.query<{
    id: string;
    bounds: SolarScanBounds;
    attempts: number;
  }>(
    `WITH next_tile AS (
       SELECT id FROM solar_analysis_tiles
       WHERE job_id = $1 AND status = 'queued'
       ORDER BY tile_key
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     UPDATE solar_analysis_tiles t
     SET status = 'running', attempts = attempts + 1, started_at = now(), last_error = NULL
     FROM next_tile
     WHERE t.id = next_tile.id
     RETURNING t.id, t.bounds, t.attempts`,
    [jobId]
  );
  const tile = claimed.rows[0];
  if (!tile) {
    await refreshSolarAnalysisJob(database, jobId);
    return;
  }

  await database.query(
    `UPDATE solar_analysis_jobs SET status = 'running', started_at = COALESCE(started_at, now()), updated_at = now() WHERE id = $1`,
    [jobId]
  );

  const functionUrl = process.env.SOLAR_SCAN_FUNCTION_URL;
  const secret = process.env.SOLAR_SCAN_SECRET;
  const baseUrl = process.env.AUTH_URL ?? "https://wattbund.de";
  if (!functionUrl || !secret) {
    await markDispatchFailure(database, tile.id, jobId, tile.attempts, "Solar-Scan-Funktion ist nicht konfiguriert");
    return;
  }

  try {
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Require-Whisk-Auth": secret,
        "X-Solar-Scan-Secret": secret
      },
      body: JSON.stringify({
        jobId,
        tileId: tile.id,
        bounds: tile.bounds,
        callbackUrl: `${baseUrl.replace(/\/$/, "")}/api/internal/solar-analysis/result`
      }),
      signal: AbortSignal.timeout(14 * 60 * 1000)
    });
    if (!response.ok) throw new Error(`Funktion antwortet mit HTTP ${response.status}`);
  } catch (error) {
    await markDispatchFailure(database, tile.id, jobId, tile.attempts, error instanceof Error ? error.message : "Funktionsaufruf fehlgeschlagen");
  }
}

async function markDispatchFailure(database: Pool, tileId: string, jobId: string, attempts: number, message: string) {
  await database.query(
    `UPDATE solar_analysis_tiles
     SET status = $2::solar_analysis_tile_status, last_error = $3, completed_at = CASE WHEN $2 = 'failed' THEN now() ELSE NULL END
     WHERE id = $1`,
    [tileId, attempts >= 3 ? "failed" : "queued", message.slice(0, 2000)]
  );
  await refreshSolarAnalysisJob(database, jobId);
}

export async function refreshSolarAnalysisJob(database: Pool | PoolClient, jobId: string) {
  await database.query(
    `WITH stats AS (
       SELECT
         count(*) FILTER (WHERE status = 'completed')::int AS completed,
         count(*) FILTER (WHERE status = 'failed')::int AS failed,
         count(*) FILTER (WHERE status IN ('queued', 'running'))::int AS remaining
       FROM solar_analysis_tiles WHERE job_id = $1
     ), candidate_stats AS (
       SELECT
         count(*)::int AS candidates,
         count(*) FILTER (WHERE review_status = 'confirmed')::int AS confirmed,
         count(*) FILTER (WHERE review_status = 'pending')::int AS pending
       FROM solar_candidates WHERE job_id = $1
     )
     UPDATE solar_analysis_jobs j SET
       completed_tiles = stats.completed,
       failed_tiles = stats.failed,
       candidate_count = candidate_stats.candidates,
       confirmed_count = candidate_stats.confirmed,
       status = CASE
         WHEN j.status = 'cancelled' THEN j.status
         WHEN stats.remaining > 0 THEN 'running'::solar_analysis_job_status
         WHEN stats.completed = 0 AND stats.failed > 0 THEN 'failed'::solar_analysis_job_status
         WHEN candidate_stats.pending > 0 THEN 'review'::solar_analysis_job_status
         ELSE 'completed'::solar_analysis_job_status
       END,
       completed_at = CASE WHEN stats.remaining = 0 THEN COALESCE(j.completed_at, now()) ELSE NULL END,
       updated_at = now()
     FROM stats, candidate_stats
     WHERE j.id = $1`,
    [jobId]
  );
}

export function safeSecretMatches(received: string | null, configured: string | undefined) {
  if (!received || !configured || received.length !== configured.length) return false;
  let difference = 0;
  for (let index = 0; index < received.length; index += 1) difference |= received.charCodeAt(index) ^ configured.charCodeAt(index);
  return difference === 0;
}
