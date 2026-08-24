import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";

export const REGION_INTEREST_CONSENT_VERSION = "2026-08-24";
export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function publicSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? process.env.AUTH_URL ?? "https://wattbund.de").replace(/\/$/, "");
}

function mailer() {
  const key = process.env.AUTH_RESEND_KEY;
  if (!key) throw new Error("AUTH_RESEND_KEY is not configured");
  return new Resend(key);
}

function emailFrom() {
  return process.env.EMAIL_FROM ?? "WattBund <hallo@wattbund.de>";
}

export async function sendRegionConfirmationEmail(input: { email: string; postalCode: string; token: string }) {
  const confirmationUrl = `${publicSiteUrl()}/api/region-interests/confirm?token=${encodeURIComponent(input.token)}`;
  const result = await mailer().emails.send({
    from: emailFrom(),
    to: input.email,
    subject: `Regionswunsch für ${input.postalCode} bestätigen`,
    text: `Bestätige deinen Regionswunsch für ${input.postalCode}: ${confirmationUrl}\n\nDer Link ist 24 Stunden gültig und kann einmal verwendet werden.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#13243c"><h1>Deine Region hat Energie.</h1><p>Bitte bestätige deinen Regionswunsch für <strong>${input.postalCode}</strong>. Erst danach zählt dein Interesse für die regionale Auswertung.</p><p><a href="${confirmationUrl}" style="display:inline-block;padding:14px 20px;background:#f5bd2e;color:#10243b;border-radius:10px;text-decoration:none;font-weight:700">Regionswunsch bestätigen</a></p><p style="color:#65758a;font-size:14px">Der Link ist 24 Stunden gültig und kann einmal verwendet werden.</p></div>`
  });
  if (result.error) throw new Error(result.error.message);
}

export async function sendRegionManageEmail(input: { email: string; postalCode: string; token: string }) {
  const manageUrl = `${publicSiteUrl()}/region-wuenschen/loeschen?token=${encodeURIComponent(input.token)}`;
  const result = await mailer().emails.send({
    from: emailFrom(),
    to: input.email,
    subject: `Regionswunsch für ${input.postalCode} ist bestätigt`,
    text: `Dein Regionswunsch für ${input.postalCode} ist bestätigt. Du kannst ihn jederzeit löschen: ${manageUrl}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#13243c"><h1>Danke, dein Interesse zählt.</h1><p>Dein Regionswunsch für <strong>${input.postalCode}</strong> ist bestätigt.</p><p>Wir melden uns, wenn es in deiner Region einen konkreten nächsten Schritt gibt.</p><p style="color:#65758a;font-size:14px">Du kannst deinen Eintrag jederzeit <a href="${manageUrl}">vollständig löschen</a>.</p></div>`
  });
  if (result.error) throw new Error(result.error.message);
}

export async function purgeExpiredRegionInterests(query: (text: string, values?: unknown[]) => Promise<unknown>) {
  await query(
    `DELETE FROM region_interests
     WHERE status = 'pending' AND created_at < now() - interval '7 days'`
  );
}
