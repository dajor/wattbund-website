import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { funnelEventSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!pool) return new NextResponse(null, { status: 204 });
  const parsed = funnelEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültiges Ereignis" }, { status: 400 });
  const input = parsed.data;
  try {
    if (input.anonymousSessionId) {
      const duplicate = await pool.query(
        `SELECT 1 FROM funnel_events WHERE name = $1 AND anonymous_session_id = $2
         AND created_at > now() - interval '30 minutes' LIMIT 1`,
        [input.name, input.anonymousSessionId]
      );
      if (duplicate.rowCount) return new NextResponse(null, { status: 204 });
    }
    await pool.query(
      `INSERT INTO funnel_events (name, source_route, persona, anonymous_session_id) VALUES ($1, $2, $3, $4)`,
      [input.name, input.sourceRoute ?? null, input.persona ?? null, input.anonymousSessionId ?? null]
    );
  } catch (error) {
    console.error("Funnel event storage failed", { name: input.name, error });
  }
  return new NextResponse(null, { status: 204 });
}
