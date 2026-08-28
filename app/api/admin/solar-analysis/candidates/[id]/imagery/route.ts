import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { buildBayernDop20ImageUrl, type SolarScanBounds } from "@/lib/solar-analysis";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  if (!pool) return NextResponse.json({ error: "Datenbank ist nicht konfiguriert" }, { status: 503 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Ungültiger Solar-Fund" }, { status: 400 });

  const result = await pool.query<{ bounds: SolarScanBounds }>(
    `SELECT t.bounds
     FROM solar_candidates c
     JOIN solar_analysis_tiles t ON t.id = c.tile_id
     WHERE c.id = $1`,
    [id]
  );
  const bounds = result.rows[0]?.bounds;
  if (!bounds) return NextResponse.json({ error: "Solar-Fund nicht gefunden" }, { status: 404 });

  try {
    const response = await fetch(buildBayernDop20ImageUrl(bounds), {
      headers: { Accept: "image/jpeg" },
      signal: AbortSignal.timeout(25_000)
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Das hochauflösende Luftbild konnte nicht geladen werden" }, { status: 502 });
    }
    const image = await response.arrayBuffer();
    if (image.byteLength < 5_000) {
      return NextResponse.json({ error: "Das Luftbild ist unerwartet klein" }, { status: 502 });
    }
    return new Response(image, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=86400",
        "Content-Length": String(image.byteLength),
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch {
    return NextResponse.json({ error: "Der bayerische Luftbilddienst ist momentan nicht erreichbar" }, { status: 502 });
  }
}
