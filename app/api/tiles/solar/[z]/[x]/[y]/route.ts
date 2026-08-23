import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  if (!pool) return new NextResponse(null, { status: 204 });
  const { z, x, y } = await params;
  const region = new URL(request.url).searchParams.get("region");
  const coordinates = [Number(z), Number(x), Number(y)];
  if (!region || coordinates.some((value) => !Number.isInteger(value))) {
    return NextResponse.json({ error: "Ungültige Kachelparameter" }, { status: 400 });
  }
  const result = await pool.query(
    `WITH bounds AS (SELECT ST_TileEnvelope($1, $2, $3) AS geom), mvtgeom AS (
      SELECT b.id, se.estimated_kwp, se.annual_yield_kwh, se.potential_class,
        ST_AsMVTGeom(ST_Transform(b.footprint, 3857), bounds.geom, 4096, 64, true) AS geom
      FROM buildings b JOIN regions r ON r.id = b.region_id
      JOIN solar_estimates se ON se.building_id = b.id AND se.model_version = r.model_version
      CROSS JOIN bounds WHERE r.slug = $4 AND r.status = 'published'
        AND ST_Transform(b.footprint, 3857) && bounds.geom
    ) SELECT ST_AsMVT(mvtgeom, 'solar', 4096, 'geom') AS tile FROM mvtgeom`,
    [...coordinates, region]
  );
  const tile = result.rows[0]?.tile;
  return new NextResponse(tile ?? null, {
    status: tile ? 200 : 204,
    headers: { "Content-Type": "application/vnd.mapbox-vector-tile", "Cache-Control": "public, max-age=600" }
  });
}
