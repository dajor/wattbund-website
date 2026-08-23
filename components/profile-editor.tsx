"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, EyeSlash, FloppyDisk, Info, PaperPlaneTilt, Trash } from "@phosphor-icons/react";
import type { ProfileRole, ProfileStatus, Region } from "@/lib/types";

interface FormState {
  displayName: string;
  role: ProfileRole;
  regionSlug: string;
  description: string;
  pvStatus: "none" | "planned" | "active";
  capacityKwp: string;
  address: string;
  publishConsent: boolean;
  status: ProfileStatus | "new";
}

const emptyForm: FormState = {
  displayName: "",
  role: "consumer",
  regionSlug: "",
  description: "",
  pvStatus: "none",
  capacityKwp: "",
  address: "",
  publishConsent: false,
  status: "new"
};

export function ProfileEditor({ regions }: { regions: Region[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({ ...emptyForm, regionSlug: regions[0]?.slug ?? "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/profile").then(async (response) => {
      const data = await response.json();
      if (data.profile) setForm({ ...data.profile, capacityKwp: String(data.profile.capacityKwp ?? "") });
      if (data.configured === false) setError("Die Datenbank wird noch eingerichtet. Das Profilformular ist bereits vorbereitet.");
    }).catch(() => setError("Profil konnte nicht geladen werden")).finally(() => setLoading(false));
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError(null); setMessage(null);
    const response = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, capacityKwp: form.capacityKwp ? Number(form.capacityKwp) : undefined })
    });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Profil konnte nicht gespeichert werden");
    else { setForm((current) => ({ ...current, status: "draft" })); setMessage("Profil gespeichert. Du kannst es jetzt zur Prüfung einreichen."); }
    setSaving(false);
  }

  async function perform(url: string, success: string) {
    setError(null); setMessage(null);
    const response = await fetch(url, { method: "POST" });
    const data = await response.json();
    if (!response.ok) setError(data.error ?? "Aktion fehlgeschlagen");
    else { setForm((current) => ({ ...current, status: data.status })); setMessage(success); }
  }

  async function deleteAccount() {
    if (!window.confirm("Konto und Profil endgültig löschen?")) return;
    const response = await fetch("/api/me/account", { method: "DELETE" });
    if (response.ok) router.push("/");
    else setError("Konto konnte nicht gelöscht werden");
  }

  if (loading) return <section className="account-panel"><div className="form-skeleton" aria-label="Profil wird geladen" /></section>;

  return (
    <section className="account-panel">
      <div className="profile-status-row">
        <div><span>Status</span><strong>{statusLabel(form.status)}</strong></div>
        {form.status === "published" && <CheckCircle size={27} weight="fill" />}
      </div>
      <form onSubmit={save} className="profile-form">
        <div className="form-grid">
          <Field label="Öffentlicher Anzeigename" htmlFor="displayName">
            <input id="displayName" value={form.displayName} onChange={(event) => update("displayName", event.target.value)} required minLength={2} maxLength={80} />
          </Field>
          <Field label="Rolle" htmlFor="role">
            <select id="role" value={form.role} onChange={(event) => update("role", event.target.value as ProfileRole)}>
              <option value="producer">PV-Erzeuger</option><option value="consumer">Verbraucher</option><option value="business">Unternehmen</option><option value="partner">Partner</option>
            </select>
          </Field>
          <Field label="Region" htmlFor="regionSlug">
            <select id="regionSlug" value={form.regionSlug} onChange={(event) => update("regionSlug", event.target.value)}>
              {regions.map((region) => <option key={region.id} value={region.slug}>{region.name}</option>)}
            </select>
          </Field>
          <Field label="PV-Status" htmlFor="pvStatus">
            <select id="pvStatus" value={form.pvStatus} onChange={(event) => update("pvStatus", event.target.value as FormState["pvStatus"])}>
              <option value="none">Keine Anlage</option><option value="planned">Anlage geplant</option><option value="active">Anlage in Betrieb</option>
            </select>
          </Field>
          <Field label="Leistung in kWp, optional" htmlFor="capacityKwp">
            <input id="capacityKwp" type="number" min="0" max="100000" step="0.1" value={form.capacityKwp} onChange={(event) => update("capacityKwp", event.target.value)} />
          </Field>
          <Field label="Private Adresse" htmlFor="address" helper="Nur zur Regionsprüfung. Sie wird verschlüsselt und niemals öffentlich angezeigt.">
            <input id="address" autoComplete="street-address" value={form.address} onChange={(event) => update("address", event.target.value)} required />
          </Field>
        </div>
        <Field label="Kurzbeschreibung" htmlFor="description" helper="Maximal 500 Zeichen. Keine Adresse oder Kontaktdaten eintragen.">
          <textarea id="description" rows={4} maxLength={500} value={form.description} onChange={(event) => update("description", event.target.value)} />
        </Field>
        <label className="consent-check">
          <input type="checkbox" checked={form.publishConsent} onChange={(event) => update("publishConsent", event.target.checked)} required />
          <span>Ich möchte dieses Profil nach Prüfung öffentlich anzeigen. Der Kartenpunkt wird um 250 bis 500 Meter versetzt.</span>
        </label>
        {error && <p className="form-feedback error" role="alert">{error}</p>}
        {message && <p className="form-feedback success">{message}</p>}
        <div className="form-actions">
          <button type="submit" className="button button-primary" disabled={saving}><FloppyDisk size={18} />{saving ? "Speichert" : "Speichern"}</button>
          {(form.status === "draft" || form.status === "rejected" || form.status === "hidden") && <button type="button" className="button button-secondary" onClick={() => perform("/api/me/profile/submit", "Profil wurde zur Prüfung eingereicht.")}><PaperPlaneTilt size={18} />Zur Prüfung</button>}
          {form.status === "published" && <button type="button" className="button button-secondary" onClick={() => perform("/api/me/profile/unpublish", "Profil ist nicht mehr öffentlich sichtbar.")}><EyeSlash size={18} />Ausblenden</button>}
        </div>
      </form>
      <div className="privacy-note"><Info size={20} /><p>Öffentlich erscheinen nur dein Anzeigename, deine freiwilligen Angaben und ein ungenauer Kartenpunkt.</p></div>
      <button type="button" className="delete-account" onClick={deleteAccount}><Trash size={17} />Konto und Daten löschen</button>
    </section>
  );
}

function Field({ label, htmlFor, helper, children }: { label: string; htmlFor: string; helper?: string; children: React.ReactNode }) {
  return <div className="form-field"><label htmlFor={htmlFor}>{label}</label>{children}{helper && <small>{helper}</small>}</div>;
}

function statusLabel(status: FormState["status"]) {
  return { new: "Noch nicht angelegt", draft: "Entwurf", pending: "In Prüfung", published: "Veröffentlicht", rejected: "Überarbeitung nötig", hidden: "Ausgeblendet" }[status];
}
