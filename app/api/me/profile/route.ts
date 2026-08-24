import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getRegion } from "@/lib/data";
import { pool } from "@/lib/db";
import { geocodeAddress, pointWithinRegionBounds } from "@/lib/geocoding";
import { createApproximatePoint, decryptPrivateLocation, encryptPrivateLocation } from "@/lib/privacy";
import { profileSchema } from "@/lib/validation";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!pool) return NextResponse.json({ profile: null, configured: false });
  const result = await pool.query(
    `SELECT p.id, p.display_name, p.role, r.slug AS region_slug, p.description, p.pv_status,
      p.capacity_kwp, p.status, p.publish_consent, pl.address_ciphertext
    FROM profiles p JOIN regions r ON r.id = p.region_id
    LEFT JOIN profile_private_locations pl ON pl.profile_id = p.id
    WHERE p.user_id = $1 LIMIT 1`,
    [session.user.id]
  );
  const row = result.rows[0];
  if (!row) return NextResponse.json({ profile: null, configured: true });
  return NextResponse.json({
    configured: true,
    profile: {
      id: row.id,
      displayName: row.display_name,
      role: row.role,
      regionSlug: row.region_slug,
      description: row.description ?? "",
      pvStatus: row.pv_status ?? "none",
      capacityKwp: row.capacity_kwp == null ? "" : Number(row.capacity_kwp),
      status: row.status,
      publishConsent: row.publish_consent,
      address: row.address_ciphertext ? decryptPrivateLocation(row.address_ciphertext) : ""
    }
  });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!pool) return NextResponse.json({ error: "Datenbank ist noch nicht konfiguriert" }, { status: 503 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bitte prüfe deine Angaben", details: parsed.error.flatten() }, { status: 400 });
  const input = parsed.data;
  const region = await getRegion(input.regionSlug);
  if (!region) return NextResponse.json({ error: "Region ist nicht verfügbar" }, { status: 400 });

  try {
    const exactPoint = await geocodeAddress(`${input.address}, Deutschland`);
    if (!pointWithinRegionBounds(exactPoint, region)) {
      return NextResponse.json({ error: `Die Adresse liegt nicht in ${region.name}` }, { status: 400 });
    }
    const publicPoint = createApproximatePoint(exactPoint);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const existingProfile = await client.query("SELECT 1 FROM profiles WHERE user_id = $1 LIMIT 1", [session.user.id]);
      const profileResult = await client.query(
        `INSERT INTO profiles (user_id, region_id, display_name, role, description, pv_status, capacity_kwp, status, publish_consent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8)
         ON CONFLICT (user_id) DO UPDATE SET region_id = EXCLUDED.region_id,
           display_name = EXCLUDED.display_name, role = EXCLUDED.role, description = EXCLUDED.description,
           pv_status = EXCLUDED.pv_status, capacity_kwp = EXCLUDED.capacity_kwp,
           status = 'draft', publish_consent = EXCLUDED.publish_consent,
           submitted_at = NULL, published_at = NULL, updated_at = now()
         RETURNING id`,
        [session.user.id, region.id, input.displayName, input.role, input.description || null, input.pvStatus ?? null, input.capacityKwp ?? null, input.publishConsent]
      );
      const profileId = profileResult.rows[0].id;
      await client.query(
        `INSERT INTO profile_private_locations (profile_id, address_ciphertext, longitude_ciphertext, latitude_ciphertext)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (profile_id) DO UPDATE SET address_ciphertext = EXCLUDED.address_ciphertext,
           longitude_ciphertext = EXCLUDED.longitude_ciphertext, latitude_ciphertext = EXCLUDED.latitude_ciphertext,
           key_version = 1, updated_at = now()`,
        [profileId, encryptPrivateLocation(input.address), encryptPrivateLocation(String(exactPoint[0])), encryptPrivateLocation(String(exactPoint[1]))]
      );
      await client.query(
        `INSERT INTO profile_public_locations (profile_id, point, displacement_meters)
         VALUES ($1, ST_SetSRID(ST_MakePoint($2, $3), 4326), $4)
         ON CONFLICT (profile_id) DO UPDATE SET point = EXCLUDED.point,
           displacement_meters = EXCLUDED.displacement_meters, generated_at = now()`,
        [profileId, publicPoint[0], publicPoint[1], 375]
      );
      await client.query(
        `INSERT INTO consents (user_id, kind, version, granted) VALUES ($1, 'public-profile', '2026-08-23', true)`,
        [session.user.id]
      );
      if (!existingProfile.rowCount) {
        await client.query(`INSERT INTO funnel_events (name, source_route) VALUES ('profile_created', '/konto')`);
      }
      await client.query("COMMIT");
      return NextResponse.json({ profileId, status: "draft" });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Profile update failed", error);
    const message = error instanceof Error && error.message.includes("Adresse") ? error.message : "Profil konnte nicht gespeichert werden";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
