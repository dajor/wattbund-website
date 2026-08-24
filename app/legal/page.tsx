import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "Impressum & Datenschutz" };

export default function LegalPage() {
  return (
    <div className="campaign-shell">
      <SiteHeader />
      <main className="legal-page">
        <h1>Impressum & Datenschutz</h1>
        <section>
          <h2>Verantwortlicher und Anbieter</h2>
          <p>WattBund befindet sich in der Gründungs- und Pilotvorbereitung. Vor der öffentlichen Bewerbung müssen Name beziehungsweise Firma, vertretungsberechtigte Person, ladungsfähige Anschrift, Kontaktadresse und gegebenenfalls Register- sowie Umsatzsteuerangaben ergänzt werden.</p>
          <p><strong>Wichtiger Pre-Launch-Hinweis:</strong> Diese Angaben sind noch nicht vollständig. Die Seite darf bis zur Ergänzung nicht als finales Impressum verwendet werden.</p>
        </section>
        <section>
          <h2>Regionswünsche</h2>
          <p>Für einen Regionswunsch verarbeiten wir E-Mail-Adresse, fünfstellige Postleitzahl, gewählte Rolle, Einwilligungszeitpunkt und optional einen aus der PLZ ermittelten Ortsnamen sowie eine ungefähre Koordinate. Zweck ist ausschließlich die Messung und manuelle Bewertung regionaler Nachfrage.</p>
          <p>Die Verarbeitung erfolgt auf Grundlage deiner Einwilligung. Erst nach Bestätigung per E-Mail zählt der Eintrag. Der Bestätigungslink ist 24 Stunden gültig und einmal verwendbar. Unbestätigte Einträge werden nach 7 Tagen gelöscht. Nach 12 Monaten zählt ein bestätigtes Interesse nicht mehr zur aktiven Nachfrage, bis die Einwilligung erneuert wurde.</p>
          <p>Mit dem Löschlink aus der Bestätigungs-E-Mail kannst du E-Mail, PLZ, Rolle und alle zugehörigen Tokens jederzeit vollständig löschen.</p>
        </section>
        <section>
          <h2>Verarbeitung von Profildaten</h2>
          <p>Für ein freiwilliges Community-Profil verarbeiten wir E-Mail-Adresse, Anzeigename, Rolle, optionale Anlagenangaben und die eingegebene Adresse. Die Adresse dient ausschließlich der Regionsprüfung und Erzeugung eines ungenauen Kartenpunkts. Sie wird verschlüsselt gespeichert und nicht öffentlich angezeigt.</p>
          <p>Ein Profil wird erst nach ausdrücklicher Einwilligung und manueller Prüfung veröffentlicht. Es kann jederzeit ausgeblendet oder zusammen mit dem Konto gelöscht werden.</p>
        </section>
        <section>
          <h2>Externe Dienste</h2>
          <p>Resend wird für Anmelde-, Bestätigungs- und Verwaltungs-E-Mails eingesetzt. MapTiler liefert Basiskarte, Adresssuche und optionale PLZ-Ortszuordnung. DigitalOcean betreibt Anwendung und PostgreSQL-Datenbank in der Region Frankfurt. Mit den eingesetzten Auftragsverarbeitern müssen vor dem öffentlichen Start die erforderlichen Verträge und Angaben zu möglichen Drittlandübermittlungen abschließend geprüft werden.</p>
        </section>
        <section>
          <h2>Eigene Reichweitenmessung</h2>
          <p>WattBund erfasst ausgewählte Funnel-Ereignisse wie Persona-Aufruf, Formularöffnung, Absenden, E-Mail-Bestätigung und Profilanlage. Dabei werden keine Werbeprofile erstellt und keine IP-Adressen in der Ereignistabelle gespeichert. Eine zufällige Sitzungskennung dient nur dazu, Mehrfachereignisse innerhalb kurzer Zeit zu begrenzen.</p>
        </section>
        <section>
          <h2>Deine Rechte</h2>
          <p>Du kannst Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch verlangen sowie eine Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen. Außerdem besteht ein Beschwerderecht bei einer zuständigen Datenschutzaufsichtsbehörde.</p>
          <p>Eine Datenschutz-Kontaktadresse muss zusammen mit den vollständigen Anbieterangaben vor der öffentlichen Bewerbung ergänzt werden.</p>
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
      <SiteFooter />
    </div>
  );
}
