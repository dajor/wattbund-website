"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, X } from "@phosphor-icons/react";

interface ReviewProfile {
  id: string;
  display_name: string;
  role: string;
  description: string | null;
  pv_status: string | null;
  capacity_kwp: string | null;
  status: string;
  submitted_at: string | null;
  region_name: string;
  email: string;
}

export function AdminProfiles() {
  const [profiles, setProfiles] = useState<ReviewProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    fetch("/api/admin/profiles").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProfiles(data.profiles);
    }).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  async function review(profileId: string, decision: "approve" | "reject") {
    const reason = decision === "reject" ? window.prompt("Kurze Begründung für die Überarbeitung:") ?? "" : "";
    if (decision === "reject" && !reason) return;
    const response = await fetch("/api/admin/profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, decision, reason })
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Prüfung fehlgeschlagen");
    } else load();
  }

  if (loading) return <div className="admin-empty">Profile werden geladen.</div>;
  if (error) return <div className="admin-empty error">{error}</div>;
  if (!profiles.length) return <div className="admin-empty"><Check size={30} /><strong>Alles geprüft</strong><span>Aktuell warten keine Profile auf Freigabe.</span></div>;

  return <div className="review-list">{profiles.map((profile) => (
    <article key={profile.id}>
      <div className="review-heading"><div><span>{profile.region_name}</span><h2>{profile.display_name}</h2></div><small>{profile.email}</small></div>
      <p>{profile.description || "Keine Beschreibung hinterlegt."}</p>
      <div className="review-facts"><span>{profile.role}</span><span>{profile.pv_status || "ohne PV-Angabe"}</span>{profile.capacity_kwp && <span>{Number(profile.capacity_kwp).toLocaleString("de-DE")} kWp</span>}</div>
      <div className="review-actions"><button className="button button-primary" onClick={() => review(profile.id, "approve")}><Check size={18} />Freigeben</button><button className="button button-secondary" onClick={() => review(profile.id, "reject")}><X size={18} />Überarbeiten</button></div>
    </article>
  ))}</div>;
}
