import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  if (!pool) return NextResponse.json({ status: "degraded", database: "not-configured" }, { status: 200 });
  try {
    await pool.query("SELECT 1");
    return NextResponse.json({ status: "ok", database: "connected" });
  } catch {
    return NextResponse.json({ status: "unhealthy", database: "unreachable" }, { status: 503 });
  }
}
