import { NextResponse } from "next/server";
import { getBuilding } from "@/lib/data";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const building = await getBuilding((await params).id);
  if (!building) return NextResponse.json({ error: "Gebäude nicht gefunden" }, { status: 404 });
  return NextResponse.json({ building });
}
