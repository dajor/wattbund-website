import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { geocodePostalCode } from "@/lib/geocoding";
import {
  createOpaqueToken,
  hashToken,
  normalizeEmail,
  purgeExpiredRegionInterests,
  REGION_INTEREST_CONSENT_VERSION,
  sendRegionConfirmationEmail,
  sendRegionManageEmail
} from "@/lib/region-interests";
import { regionInterestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!pool) return NextResponse.json({ error: "Der Regionswunsch ist gerade nicht verfügbar." }, { status: 503 });
  const parsed = regionInterestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bitte prüfe E-Mail, PLZ, Rolle und Einwilligung.", details: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ accepted: true });

  const email = normalizeEmail(parsed.data.email);
  const { postalCode, role } = parsed.data;
  const token = createOpaqueToken();
  const tokenHash = hashToken(token);
  const location = await geocodePostalCode(postalCode);
  const client = await pool.connect();
  let alreadyConfirmed = false;
  try {
    await purgeExpiredRegionInterests(client.query.bind(client));
    await client.query("BEGIN");
    const abuseCheck = await client.query(
      `SELECT count(*)::int AS count,
        bool_or(updated_at > now() - interval '1 hour' AND send_attempts >= 5) AS repeated_too_often
       FROM region_interests WHERE email = $1 AND created_at > now() - interval '1 hour'`,
      [email]
    );
    if (abuseCheck.rows[0].count >= 5 || abuseCheck.rows[0].repeated_too_often) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Zu viele Anfragen. Bitte versuche es später erneut." }, { status: 429 });
    }
    const existing = await client.query(
      `SELECT id, status, last_confirmation_sent_at FROM region_interests WHERE email = $1 AND postal_code = $2 FOR UPDATE`,
      [email, postalCode]
    );
    const row = existing.rows[0];
    if (row?.last_confirmation_sent_at && Date.now() - new Date(row.last_confirmation_sent_at).getTime() < 5 * 60 * 1000) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Die E-Mail wurde bereits versendet. Bitte prüfe auch den Spam-Ordner." }, { status: 429 });
    }
    if (row?.status === "confirmed") {
      alreadyConfirmed = true;
      await client.query(
        `UPDATE region_interests SET role = $1, consent_version = $2, consented_at = now(),
          municipality = COALESCE($3, municipality), longitude = COALESCE($4, longitude),
          latitude = COALESCE($5, latitude), manage_token_hash = $6,
          consent_expires_at = now() + interval '12 months', last_confirmation_sent_at = now(),
          send_attempts = send_attempts + 1, updated_at = now() WHERE id = $7`,
        [role, REGION_INTEREST_CONSENT_VERSION, location.municipality, location.coordinates?.[0] ?? null, location.coordinates?.[1] ?? null, tokenHash, row.id]
      );
    } else {
      await client.query(
        `INSERT INTO region_interests
          (email, postal_code, role, status, municipality, longitude, latitude, consent_version,
           verification_token_hash, verification_expires_at, last_confirmation_sent_at, send_attempts)
         VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, now() + interval '24 hours', now(), 1)
         ON CONFLICT (email, postal_code) DO UPDATE SET role = EXCLUDED.role, status = 'pending',
           municipality = COALESCE(EXCLUDED.municipality, region_interests.municipality),
           longitude = COALESCE(EXCLUDED.longitude, region_interests.longitude),
           latitude = COALESCE(EXCLUDED.latitude, region_interests.latitude),
           consent_version = EXCLUDED.consent_version, consented_at = now(),
           verification_token_hash = EXCLUDED.verification_token_hash,
           verification_expires_at = EXCLUDED.verification_expires_at,
           last_confirmation_sent_at = now(), send_attempts = region_interests.send_attempts + 1, updated_at = now()`,
        [email, postalCode, role, location.municipality, location.coordinates?.[0] ?? null, location.coordinates?.[1] ?? null, REGION_INTEREST_CONSENT_VERSION, tokenHash]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Region interest storage failed", { postalCode, error });
    return NextResponse.json({ error: "Dein Regionswunsch konnte nicht gespeichert werden." }, { status: 500 });
  } finally {
    client.release();
  }

  try {
    if (alreadyConfirmed) {
      await sendRegionManageEmail({ email, postalCode, token });
    } else {
      await sendRegionConfirmationEmail({ email, postalCode, token });
    }
  } catch (error) {
    console.error("Region interest email failed", { postalCode, error });
    return NextResponse.json({ error: "Gespeichert, aber die E-Mail konnte nicht versendet werden. Bitte versuche es später erneut." }, { status: 502 });
  }
  return NextResponse.json({ accepted: true, alreadyConfirmed });
}

export async function DELETE(request: Request) {
  if (!pool) return NextResponse.json({ error: "Der Regionswunsch ist gerade nicht verfügbar." }, { status: 503 });
  const body = await request.json().catch(() => null) as { token?: unknown } | null;
  if (typeof body?.token !== "string" || body.token.length < 32 || body.token.length > 100) {
    return NextResponse.json({ error: "Der Löschlink ist ungültig." }, { status: 400 });
  }
  const result = await pool.query(
    `DELETE FROM region_interests WHERE manage_token_hash = $1 RETURNING id`,
    [hashToken(body.token)]
  );
  if (!result.rowCount) return NextResponse.json({ error: "Der Löschlink ist ungültig oder wurde bereits verwendet." }, { status: 404 });
  return NextResponse.json({ deleted: true });
}
