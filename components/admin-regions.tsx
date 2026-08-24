"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowClockwise, DownloadSimple, MapPin } from "@phosphor-icons/react";

type RegionRow = {
  postal_code: string; municipality: string | null; confirmed: number; pending: number;
  producers: number; consumers: number; businesses: number; solar_partners: number;
  municipalities: number; initiators: number; stage: "watch" | "contact" | "pilot";
};
type Trend = { day: string; confirmed: number };
type Funnel = { name: string; count: number };

const stageLabels = { watch: "Beobachten", contact: "Kontakt aufnehmen", pilot: "Pilotkandidat" };
const funnelLabels: Record<string, string> = { persona_cta: "Persona-CTA", region_form_opened: "Formular geöffnet", region_form_submitted: "Formular abgesendet", email_confirmed: "E-Mail bestätigt", profile_created: "Profil angelegt" };

export function AdminRegions() {
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [trend, setTrend] = useState<Trend[]>([]);
  const [funnel, setFunnel] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    fetch("/api/admin/regions").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRegions(data.regions); setTrend(data.trend); setFunnel(data.funnel); setError(null);
    }).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);
  const totalConfirmed = useMemo(() => regions.reduce((sum, row) => sum + row.confirmed, 0), [regions]);
  const maxTrend = Math.max(1, ...trend.map((row) => row.confirmed));

  async function setStage(postalCode: string, stage: RegionRow["stage"]) {
    const response = await fetch("/api/admin/regions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postalCode, stage }) });
    if (!response.ok) setError((await response.json()).error ?? "Status konnte nicht geändert werden");
    else setRegions((current) => current.map((row) => row.postal_code === postalCode ? { ...row, stage } : row));
  }

  if (loading) return <div className="admin-empty">Regionale Nachfrage wird geladen.</div>;
  if (error && !regions.length) return <div className="admin-empty error">{error}<button className="button button-secondary" onClick={load}><ArrowClockwise />Erneut laden</button></div>;
  return <div className="region-dashboard">
    <div className="admin-summary">
      <article><strong>{totalConfirmed.toLocaleString("de-DE")}</strong><span>bestätigte Leads</span></article>
      <article><strong>{regions.length.toLocaleString("de-DE")}</strong><span>PLZ-Gebiete</span></article>
      <a className="button button-secondary" href="/api/admin/regions/export"><DownloadSimple />CSV exportieren</a>
    </div>
    <section className="admin-panel">
      <h2>Entwicklung, letzte 30 Tage</h2>
      <div className="demand-trend" aria-label="Bestätigungen pro Tag">
        {trend.map((row) => <span key={row.day} title={`${row.day}: ${row.confirmed}`} style={{ height: `${Math.max(4, row.confirmed / maxTrend * 100)}%` }} />)}
      </div>
    </section>
    <section className="admin-panel">
      <h2>Funnel, letzte 30 Tage</h2>
      <div className="funnel-metrics">{funnel.map((item) => <div key={item.name}><strong>{item.count}</strong><span>{funnelLabels[item.name] ?? item.name}</span></div>)}</div>
    </section>
    <section className="admin-panel region-ranking">
      <div className="admin-panel-heading"><div><h2>Regionsranking</h2><p>Nur bestätigte Einträge zählen in der Rangfolge.</p></div><button className="button button-secondary" onClick={load}><ArrowClockwise />Aktualisieren</button></div>
      {!regions.length ? <div className="admin-empty"><MapPin size={30} /><strong>Noch keine Regionswünsche</strong><span>Bestätigte Nachfrage erscheint hier automatisch.</span></div> : <div className="region-table-wrap"><table><thead><tr><th>Region</th><th>Bestätigt</th><th>Offen</th><th>Rollen</th><th>Bewertung</th></tr></thead><tbody>{regions.map((row) => <tr key={row.postal_code}><td><strong>{row.municipality || "Unbekannter Ort"}</strong><small>{row.postal_code}</small></td><td className="confirmed-count">{row.confirmed}</td><td>{row.pending}</td><td><div className="role-counts"><span>E {row.producers}</span><span>V {row.consumers}</span><span>G {row.businesses}</span><span>S {row.solar_partners}</span><span>K {row.municipalities}</span><span>I {row.initiators}</span></div></td><td><select value={row.stage} onChange={(event) => setStage(row.postal_code, event.target.value as RegionRow["stage"])}>{Object.entries(stageLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
