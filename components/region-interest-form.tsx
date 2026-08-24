"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, EnvelopeSimple, MapPin, SpinnerGap } from "@phosphor-icons/react";
import { trackFunnelEvent } from "@/lib/funnel-client";
import { REGION_INTEREST_ROLES } from "@/lib/region-interest-options";

type Role = keyof typeof REGION_INTEREST_ROLES;

export function RegionInterestForm({ initialRole }: { initialRole?: string }) {
  const role = initialRole && initialRole in REGION_INTEREST_ROLES ? initialRole as Role : "consumer";
  const [state, setState] = useState<"idle" | "submitting" | "sent" | "confirmed">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    trackFunnelEvent("region_form_opened", { sourceRoute: "/region-wuenschen", persona: role });
  }, [role]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("submitting");
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const body = {
      email: form.get("email"),
      postalCode: form.get("postalCode"),
      role: form.get("role"),
      privacyConsent: form.get("privacyConsent") === "on",
      website: form.get("website"),
      sourceRoute: "/region-wuenschen"
    };
    try {
      const response = await fetch("/api/region-interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Der Regionswunsch konnte nicht gespeichert werden.");
      trackFunnelEvent("region_form_submitted", { sourceRoute: "/region-wuenschen", persona: String(body.role) });
      setState(data.alreadyConfirmed ? "confirmed" : "sent");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Der Regionswunsch konnte nicht gespeichert werden.");
      setState("idle");
    }
  }

  if (state === "sent" || state === "confirmed") {
    return (
      <section className="region-form-success" aria-live="polite">
        <CheckCircle size={42} weight="duotone" />
        <h2>{state === "confirmed" ? "Dein Interesse zählt bereits." : "Prüfe dein Postfach."}</h2>
        <p>{state === "confirmed" ? "Wir haben Rolle und Einwilligung aktualisiert. Eine neue E-Mail enthält deinen Löschlink." : "Klicke innerhalb von 24 Stunden auf den Bestätigungslink. Erst dann zählt dein Regionswunsch."}</p>
        <Link href="/solar-map" className="button button-secondary">Solar Map ansehen</Link>
      </section>
    );
  }

  return (
    <form className="region-interest-form" onSubmit={submit} noValidate>
      <div className="region-form-heading">
        <EnvelopeSimple size={28} />
        <h2>Interesse eintragen</h2>
        <p>Keine Anmeldung und keine vollständige Adresse nötig.</p>
      </div>
      <div className="form-field">
        <label htmlFor="region-email">E-Mail-Adresse</label>
        <input id="region-email" name="email" type="email" autoComplete="email" placeholder="name@beispiel.de" required />
      </div>
      <div className="region-form-row">
        <div className="form-field">
          <label htmlFor="region-postal-code">Postleitzahl</label>
          <input id="region-postal-code" name="postalCode" type="text" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" maxLength={5} placeholder="85586" required />
        </div>
        <div className="form-field">
          <label htmlFor="region-role">Deine Rolle</label>
          <select id="region-role" name="role" defaultValue={role} required>
            {Object.entries(REGION_INTEREST_ROLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="region-website">Website</label>
        <input id="region-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="region-consent">
        <input name="privacyConsent" type="checkbox" required />
        <span>Ich willige ein, dass WattBund E-Mail, PLZ und Rolle zur Messung regionaler Nachfrage verarbeitet. Die <Link href="/legal">Datenschutzhinweise</Link> habe ich gelesen.</span>
      </label>
      {message && <p className="form-feedback error" role="alert">{message}</p>}
      <button className="campaign-button campaign-button-primary" type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? <><SpinnerGap className="spin" />Wird gespeichert</> : <><MapPin />Region wünschen</>}
      </button>
      <small>Unbestätigte Einträge löschen wir nach 7 Tagen. Wir melden uns erst wieder, wenn es einen konkreten nächsten Schritt gibt.</small>
    </form>
  );
}
