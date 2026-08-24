import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function GET() {
  const services = {
    resend: Boolean(process.env.AUTH_RESEND_KEY && process.env.EMAIL_FROM),
    maptiler: Boolean(process.env.MAPTILER_API_KEY || process.env.NEXT_PUBLIC_MAPTILER_API_KEY)
  };
  if (!pool) return NextResponse.json({ status: "degraded", database: "not-configured", services }, { status: 200 });
  try {
    const schema = await pool.query(`SELECT to_regclass('public.region_interests') IS NOT NULL AS region_interests`);
    const ready = Boolean(schema.rows[0]?.region_interests);
    return NextResponse.json({ status: ready && services.resend && services.maptiler ? "ok" : "degraded", database: "connected", schema: { regionInterests: ready }, services });
  } catch (error) {
    console.error("Health check database failure", error);
    return NextResponse.json({ status: "unhealthy", database: "unreachable", services }, { status: 503 });
  }
}
