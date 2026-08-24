import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { createOpaqueToken, hashToken, publicSiteUrl, sendRegionManageEmail } from "@/lib/region-interests";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!pool || !token || token.length < 32 || token.length > 100) {
    return NextResponse.redirect(`${publicSiteUrl()}/region-wuenschen/bestaetigt?status=invalid`);
  }
  const manageToken = createOpaqueToken();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE region_interests SET status = 'confirmed', confirmed_at = now(), updated_at = now(),
        verification_token_hash = NULL, verification_expires_at = NULL, manage_token_hash = $2,
        consent_expires_at = now() + interval '12 months'
       WHERE verification_token_hash = $1 AND status = 'pending' AND verification_expires_at > now()
       RETURNING email, postal_code`,
      [hashToken(token), hashToken(manageToken)]
    );
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.redirect(`${publicSiteUrl()}/region-wuenschen/bestaetigt?status=invalid`);
    }
    await client.query(
      `INSERT INTO funnel_events (name, source_route) VALUES ('email_confirmed', '/region-wuenschen')`
    );
    await client.query("COMMIT");
    const row = result.rows[0];
    try {
      await sendRegionManageEmail({ email: row.email, postalCode: row.postal_code, token: manageToken });
    } catch (error) {
      console.error("Region management email failed", { postalCode: row.postal_code, error });
    }
    return NextResponse.redirect(`${publicSiteUrl()}/region-wuenschen/bestaetigt?status=confirmed`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    console.error("Region interest confirmation failed", error);
    return NextResponse.redirect(`${publicSiteUrl()}/region-wuenschen/bestaetigt?status=error`);
  } finally {
    client.release();
  }
}
