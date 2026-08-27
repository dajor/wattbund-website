import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(request: NextRequest) {
  const bbox = parseBbox(request.nextUrl.searchParams.get("bbox"));
  if (!bbox) return NextResponse.json({ error: "Ungültiger Kartenausschnitt" }, { status: 400 });
  if (!pool) return NextResponse.json({ type: "FeatureCollection", features: [] });
  const result = await pool.query(
    `SELECT id, region_name, kind, estimated_area_m2, capacity_kwp, annual_yield_kwh,
      source_name, source_as_of, ST_AsGeoJSON(geometry)::json AS geometry
     FROM solar_installations
     WHERE published = true AND geometry && ST_MakeEnvelope($1, $2, $3, $4, 4326)
     ORDER BY created_at DESC
     LIMIT 2500`,
    bbox
  );
  return NextResponse.json({
    type: "FeatureCollection",
    features: result.rows.map((row) => ({
      type: "Feature",
      id: row.id,
      geometry: row.geometry,
      properties: {
        id: row.id,
        regionName: row.region_name,
        kind: row.kind,
        estimatedAreaM2: Number(row.estimated_area_m2),
        capacityKwp: Number(row.capacity_kwp),
        annualYieldKwh: Number(row.annual_yield_kwh),
        sourceName: row.source_name,
        sourceAsOf: row.source_as_of
      }
    }))
  }, { headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" } });
}

function parseBbox(value: string | null): [number, number, number, number] | null {
  if (!value) return null;
  const values = value.split(",").map(Number);
  if (values.length !== 4 || values.some((item) => !Number.isFinite(item))) return null;
  const [west, south, east, north] = values;
  if (west >= east || south >= north || west < -180 || east > 180 || south < -90 || north > 90) return null;
  return [west, south, east, north];
}
