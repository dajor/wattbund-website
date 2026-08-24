import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { purgeExpiredRegionInterests } from "@/lib/region-interests";
import { regionDemandStageSchema } from "@/lib/validation";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin" ? session : null;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  if (!pool) return NextResponse.json({ regions: [], trend: [], funnel: [], configured: false });
  await purgeExpiredRegionInterests(pool.query.bind(pool));
  const [regions, trend, funnel] = await Promise.all([
    pool.query(
      `SELECT i.postal_code, max(i.municipality) AS municipality,
        count(*) FILTER (WHERE i.status = 'confirmed' AND i.consent_expires_at > now())::int AS confirmed,
        count(*) FILTER (WHERE i.status = 'pending')::int AS pending,
        count(*) FILTER (WHERE i.status = 'confirmed' AND i.consent_expires_at > now() AND i.role = 'producer')::int AS producers,
        count(*) FILTER (WHERE i.status = 'confirmed' AND i.consent_expires_at > now() AND i.role = 'consumer')::int AS consumers,
        count(*) FILTER (WHERE i.status = 'confirmed' AND i.consent_expires_at > now() AND i.role = 'business')::int AS businesses,
        count(*) FILTER (WHERE i.status = 'confirmed' AND i.consent_expires_at > now() AND i.role = 'solar_partner')::int AS solar_partners,
        count(*) FILTER (WHERE i.status = 'confirmed' AND i.consent_expires_at > now() AND i.role = 'municipality')::int AS municipalities,
        count(*) FILTER (WHERE i.status = 'confirmed' AND i.consent_expires_at > now() AND i.role = 'initiator')::int AS initiators,
        COALESCE(r.stage, 'watch') AS stage
       FROM region_interests i LEFT JOIN region_demand_reviews r ON r.postal_code = i.postal_code
       GROUP BY i.postal_code, r.stage
       ORDER BY confirmed DESC, pending DESC, i.postal_code ASC`
    ),
    pool.query(
      `SELECT to_char(day, 'YYYY-MM-DD') AS day, count(i.id)::int AS confirmed
       FROM generate_series(current_date - interval '29 days', current_date, interval '1 day') day
       LEFT JOIN region_interests i ON i.status = 'confirmed' AND i.consent_expires_at > now() AND i.confirmed_at >= day AND i.confirmed_at < day + interval '1 day'
       GROUP BY day ORDER BY day`
    ),
    pool.query(
      `SELECT name, count(*)::int AS count FROM funnel_events
       WHERE created_at > now() - interval '30 days' GROUP BY name ORDER BY name`
    )
  ]);
  return NextResponse.json({ regions: regions.rows, trend: trend.rows, funnel: funnel.rows, configured: true });
}

export async function PATCH(request: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Nicht berechtigt" }, { status: 403 });
  if (!pool) return NextResponse.json({ error: "Datenbank ist nicht konfiguriert" }, { status: 503 });
  const parsed = regionDemandStageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ungültiger Status" }, { status: 400 });
  const { postalCode, stage } = parsed.data;
  await pool.query(
    `INSERT INTO region_demand_reviews (postal_code, stage, updated_by) VALUES ($1, $2, $3)
     ON CONFLICT (postal_code) DO UPDATE SET stage = EXCLUDED.stage, updated_by = EXCLUDED.updated_by, updated_at = now()`,
    [postalCode, stage, session.user.id]
  );
  await pool.query(
    `INSERT INTO audit_events (actor_user_id, action, target_type, target_id, metadata)
     VALUES ($1, 'region.stage_changed', 'postal_code', $2, jsonb_build_object('stage', $3::text))`,
    [session.user.id, postalCode, stage]
  );
  return NextResponse.json({ postalCode, stage });
}
