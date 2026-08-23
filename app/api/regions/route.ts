import { NextResponse } from "next/server";
import { listRegions } from "@/lib/data";

export async function GET() {
  return NextResponse.json({ regions: await listRegions() }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" }
  });
}
