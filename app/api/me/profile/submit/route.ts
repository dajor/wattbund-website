import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!pool) return NextResponse.json({ error: "Datenbank ist noch nicht konfiguriert" }, { status: 503 });
  const result = await pool.query(
    `UPDATE profiles SET status = 'pending', submitted_at = now(), updated_at = now()
     WHERE user_id = $1 AND publish_consent = true AND status IN ('draft', 'rejected', 'hidden') RETURNING id`,
    [session.user.id]
  );
  if (!result.rowCount) return NextResponse.json({ error: "Speichere zuerst ein vollständiges Profil" }, { status: 400 });
  return NextResponse.json({ status: "pending" });
}
