import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { reviewSchema } from "@/lib/validation";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin" ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  if (!pool) return NextResponse.json({ profiles: [], configured: false });
  const result = await pool.query(
    `SELECT p.id, p.display_name, p.role, p.description, p.pv_status, p.capacity_kwp,
      p.status, p.submitted_at, r.name AS region_name, u.email
     FROM profiles p JOIN regions r ON r.id = p.region_id JOIN users u ON u.id = p.user_id
     WHERE p.status = 'pending' ORDER BY p.submitted_at ASC NULLS LAST`
  );
  return NextResponse.json({ profiles: result.rows, configured: true });
}

export async function POST(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  if (!pool) return NextResponse.json({ error: "Datenbank ist noch nicht konfiguriert" }, { status: 503 });
  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültige Prüfung" }, { status: 400 });
  const { profileId, decision, reason } = parsed.data;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const nextStatus = decision === "approve" ? "published" : "rejected";
    const update = await client.query(
      `UPDATE profiles SET status = $1::profile_status,
       published_at = CASE WHEN $1::profile_status = 'published'::profile_status THEN now() ELSE NULL END,
       updated_at = now() WHERE id = $2 AND status = 'pending' RETURNING id`,
      [nextStatus, profileId]
    );
    if (!update.rowCount) throw new Error("Profil ist nicht mehr zur Prüfung offen");
    await client.query(
      `INSERT INTO profile_reviews (profile_id, reviewer_user_id, decision, reason) VALUES ($1, $2, $3, $4)`,
      [profileId, session.user.id, decision, reason || null]
    );
    await client.query(
      `INSERT INTO audit_events (actor_user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'profile', $3, jsonb_build_object('reason', $4::text))`,
      [session.user.id, `profile.${decision}`, profileId, reason || ""]
    );
    await client.query("COMMIT");
    return NextResponse.json({ profileId, status: nextStatus });
  } catch (error) {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Prüfung fehlgeschlagen" }, { status: 409 });
  } finally {
    client.release();
  }
}
