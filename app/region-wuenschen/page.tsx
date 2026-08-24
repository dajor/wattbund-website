import type { Metadata } from "next";
import { CheckCircle, MapPin, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { RegionInterestForm } from "@/components/region-interest-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Region wünschen",
  description: "Zeige WattBund, wo in Deutschland Interesse an einer lokalen Energie-Community besteht."
};

export default async function RegionInterestPage({ searchParams }: { searchParams: Promise<{ rolle?: string; plz?: string; ort?: string }> }) {
  const { rolle, plz, ort } = await searchParams;
  const postalCode = plz && /^\d{5}$/.test(plz) ? plz : undefined;
  const location = ort?.trim().slice(0, 100) || undefined;
  return (
    <div className="campaign-shell">
      <SiteHeader />
      <main className="region-interest-layout campaign-frame">
        <section className="region-interest-intro campaign-enter">
          <p className="campaign-kicker">Deutschlandweit offen</p>
          <h1>Bring deine Region auf die Karte.</h1>
          <p className="campaign-lead">Mit E-Mail, PLZ und Rolle zeigst du, wo lokale Energie gefragt ist.</p>
          <div className="region-interest-facts">
            <span><MapPin size={21} />Fünfstellige PLZ reicht</span>
            <span><ShieldCheck size={21} />Keine Adresse auf der Karte</span>
            <span><CheckCircle size={21} />Nur bestätigt zählt</span>
          </div>
        </section>
        <RegionInterestForm initialRole={rolle} initialPostalCode={postalCode} initialLocation={location} />
      </main>
      <SiteFooter />
    </div>
  );
}
