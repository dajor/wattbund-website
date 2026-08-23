import { NextResponse } from "next/server";
import { getRegion } from "@/lib/data";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const region = await getRegion(slug);
  if (!region) return NextResponse.json({ error: "Region nicht gefunden" }, { status: 404 });
  return NextResponse.json({ region: region.slug, summary: region.summary });
}
