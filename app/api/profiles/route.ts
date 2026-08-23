import { NextRequest, NextResponse } from "next/server";
import { getRegion, listPublicProfiles } from "@/lib/data";

export async function GET(request: NextRequest) {
  const region = request.nextUrl.searchParams.get("region") ?? "";
  if (!(await getRegion(region))) return NextResponse.json({ error: "Ungültige Region" }, { status: 400 });
  const bboxRaw = request.nextUrl.searchParams.get("bbox");
  const bboxValues = bboxRaw?.split(",").map(Number);
  const bbox = bboxValues?.length === 4 && bboxValues.every(Number.isFinite)
    ? bboxValues as [number, number, number, number]
    : undefined;
  return NextResponse.json({ profiles: await listPublicProfiles(region, bbox) }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=180" }
  });
}
