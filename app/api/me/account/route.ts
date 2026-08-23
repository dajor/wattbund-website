import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!pool) return NextResponse.json({ error: "Datenbank ist noch nicht konfiguriert" }, { status: 503 });
  await pool.query("DELETE FROM users WHERE id = $1", [session.user.id]);
  return NextResponse.json({ deleted: true });
}
