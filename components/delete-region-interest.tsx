"use client";

import { useState } from "react";
import Link from "next/link";

export function DeleteRegionInterest({ token }: { token?: string }) {
  const [state, setState] = useState<"idle" | "deleting" | "deleted" | "error">("idle");
  const [message, setMessage] = useState("Der Löschlink ist ungültig.");
  async function remove() {
    if (!token) return setState("error");
    setState("deleting");
    const response = await fetch("/api/region-interests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "Der Regionswunsch konnte nicht gelöscht werden.");
      setState("error");
    } else setState("deleted");
  }
  if (state === "deleted") return <><h1>Regionswunsch gelöscht.</h1><p>E-Mail, PLZ, Rolle und alle zugehörigen Tokens wurden vollständig entfernt.</p><Link href="/" className="button button-secondary">Zur Startseite</Link></>;
  return <><h1>Regionswunsch löschen?</h1><p>Damit entfernst du deinen bestätigten Eintrag vollständig. Diese Aktion kann nicht rückgängig gemacht werden.</p>{state === "error" && <p className="form-feedback error">{message}</p>}<button className="button button-danger" onClick={remove} disabled={state === "deleting"}>{state === "deleting" ? "Wird gelöscht" : "Vollständig löschen"}</button></>;
}
