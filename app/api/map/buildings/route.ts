import { NextRequest, NextResponse } from "next/server";
import { getBuildingsGeoJson, getRegion } from "@/lib/data";

export async function GET(request: NextRequest) {
  const region = request.nextUrl.searchParams.get("region") ?? "";
  if (!(await getRegion(region))) return NextResponse.json({ error: "Ungültige Region" }, { status: 400 });
  const bbox = parseBbox(request.nextUrl.searchParams.get("bbox"));
  if (request.nextUrl.searchParams.has("bbox") && !bbox) {
    return NextResponse.json({ error: "Ungültiger Kartenausschnitt" }, { status: 400 });
  }
  return NextResponse.json(await getBuildingsGeoJson(region, bbox ?? undefined), {
    headers: { "Cache-Control": "public, max-age=120, stale-while-revalidate=600" }
  });
}

function parseBbox(value: string | null): [number, number, number, number] | null {
  if (!value) return null;
  const values = value.split(",").map(Number);
  if (values.length !== 4 || values.some((item) => !Number.isFinite(item))) return null;
  const [west, south, east, north] = values;
  if (west >= east || south >= north || west < -180 || east > 180 || south < -90 || north > 90) return null;
  return [west, south, east, north];
}
