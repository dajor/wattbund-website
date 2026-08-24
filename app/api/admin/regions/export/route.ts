import { auth } from "@/auth";
import { pool } from "@/lib/db";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "admin") return new Response("Nicht berechtigt", { status: 403 });
  if (!pool) return new Response("Datenbank ist nicht konfiguriert", { status: 503 });
  const result = await pool.query(
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
     GROUP BY i.postal_code, r.stage ORDER BY confirmed DESC, pending DESC`
  );
  const headers = ["PLZ", "Ort", "Bestätigt", "Unbestätigt", "Erzeuger", "Verbraucher", "Gewerbe", "Solarpartner", "Kommunen", "Initiatoren", "Status"];
  const keys = ["postal_code", "municipality", "confirmed", "pending", "producers", "consumers", "businesses", "solar_partners", "municipalities", "initiators", "stage"];
  const csv = [headers.map(csvCell).join(","), ...result.rows.map((row) => keys.map((key) => csvCell(row[key])).join(","))].join("\n");
  return new Response(`\uFEFF${csv}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="wattbund-regionen-${new Date().toISOString().slice(0, 10)}.csv"` }
  });
}
