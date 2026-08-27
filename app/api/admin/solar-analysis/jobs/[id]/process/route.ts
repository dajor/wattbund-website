import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { processNextSolarAnalysisTile, recoverStaleSolarAnalysisTiles } from "@/lib/solar-analysis";

export const maxDuration = 300;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  if (!pool) return NextResponse.json({ error: "Datenbank ist nicht konfiguriert" }, { status: 503 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Ungültiger Scan" }, { status: 400 });
  await recoverStaleSolarAnalysisTiles(pool);
  const result = await processNextSolarAnalysisTile(id);
  return NextResponse.json(result);
}
