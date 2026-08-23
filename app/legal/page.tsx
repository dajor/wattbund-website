import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Impressum & Datenschutz" };

export default function LegalPage() {
  return (
    <>
      <SiteHeader />
      <main className="legal-page">
        <h1>Impressum & Datenschutz</h1>
        <section>
          <h2>Pre-Launch-Hinweis</h2>
          <p>WattBund befindet sich in der Gründungs- und Pilotvorbereitung. Vor der öffentlichen Freischaltung müssen die vollständigen Anbieterangaben nach § 5 DDG, die ladungsfähige Anschrift sowie Register- und Kontaktdaten ergänzt werden.</p>
        </section>
        <section>
          <h2>Verarbeitung von Profildaten</h2>
          <p>Für ein freiwilliges Community-Profil verarbeiten wir E-Mail-Adresse, Anzeigename, Rolle, optionale Anlagenangaben und die eingegebene Adresse. Die Adresse dient ausschließlich der Regionsprüfung und Erzeugung eines ungenauen Kartenpunkts. Sie wird verschlüsselt gespeichert und nicht öffentlich angezeigt.</p>
          <p>Ein Profil wird erst nach ausdrücklicher Einwilligung und manueller Prüfung veröffentlicht. Es kann jederzeit ausgeblendet oder zusammen mit dem Konto gelöscht werden.</p>
        </section>
        <section>
          <h2>Externe Dienste</h2>
          <p>Resend wird für Anmelde-E-Mails eingesetzt. MapTiler liefert Basiskarte und Adresssuche. DigitalOcean betreibt Anwendung und Datenbank in der Region Frankfurt. Vor dem öffentlichen Pilot müssen Verantwortlicher, Rechtsgrundlagen, Auftragsverarbeiter, Speicherdauern und Betroffenenrechte rechtlich abschließend dokumentiert werden.</p>
        </section>
        <section>
          <h2>Karten- und Solardaten</h2>
          <p>Solarpotenziale sind automatisierte Orientierungswerte aus Gebäudedaten. Sie ersetzen keine Vor-Ort-Prüfung, Statikprüfung, Verschattungsanalyse oder Fachplanung.</p>
          <p>Datenquellen werden direkt an der Karte ausgewiesen. Vorgesehen sind die offenen LoD2-Daten der Bayerischen Vermessungsverwaltung sowie aggregierte öffentliche Daten des Marktstammdatenregisters.</p>
        </section>
        <section>
          <h2>Produktstatus</h2>
          <p>Alle Angaben zum Energy Sharing betreffen ein Produkt in Vorbereitung. Ein Community-Profil oder eine Interessenbekundung stellt keinen Stromliefervertrag dar.</p>
        </section>
        <Link className="button button-secondary" href="/">Zur Startseite</Link>
      </main>
    </>
  );
}
