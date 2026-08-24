import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapTrifold } from "@phosphor-icons/react/dist/ssr";
import regionImage from "@/assets/personas/region-offen.jpg";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { FunnelLink } from "@/components/funnel-link";
import { personas } from "@/lib/personas";

export const metadata: Metadata = {
  title: "WattBund | Lokale Energie verbindet",
  description:
    "WattBund macht regionales Solarpotenzial sichtbar und verbindet Erzeuger, Verbraucher, Betriebe, Solarpartner und Kommunen.",
};

export default function HomePage() {
  return (
    <div className="campaign-shell">
      <SiteHeader />
      <main>
        <section className="campaign-hero campaign-frame">
          <div className="campaign-hero-copy campaign-enter">
            <p className="campaign-kicker">Lokal erzeugt. Lokal genutzt.</p>
            <h1>Deine Region hat Energie.</h1>
            <p className="campaign-lead">
              WattBund macht Solarpotenzial sichtbar und bringt die Menschen zusammen, die lokale Energie voranbringen.
            </p>
            <div className="campaign-actions">
              <FunnelLink href="/region-wuenschen" sourceRoute="/" className="campaign-button campaign-button-primary">
                Region wünschen
                <ArrowRight size={19} weight="bold" aria-hidden="true" />
              </FunnelLink>
              <Link href="/solar-map" className="campaign-button campaign-button-secondary">
                <MapTrifold size={19} weight="bold" aria-hidden="true" />
                Solar Map
              </Link>
            </div>
          </div>
          <figure className="campaign-hero-media">
            <Image
              src={regionImage}
              alt="Menschen und Solardächer in einer regionalen Energie-Community"
              priority
              sizes="(max-width: 860px) 100vw, 48vw"
            />
          </figure>
        </section>

        <section id="personas" className="persona-picker campaign-frame" aria-labelledby="persona-picker-title">
          <div className="persona-picker-intro">
            <h2 id="persona-picker-title">Wo willst du einsteigen?</h2>
            <p>
              Lokale Energie braucht unterschiedliche Rollen. Wähle den Einstieg, der zu dir passt.
            </p>
          </div>
          <div className="persona-grid">
            {personas.map((persona) => (
              <Link
                href={`/fuer/${persona.slug}`}
                className={`persona-card persona-card-${persona.slug}`}
                key={persona.slug}
              >
                <span className="persona-card-media">
                  <Image
                    src={persona.image}
                    alt=""
                    sizes="(max-width: 620px) 44vw, (max-width: 1000px) 50vw, 33vw"
                  />
                </span>
                <span className="persona-card-copy">
                  <span className="persona-card-audience">{persona.audience}</span>
                  <strong>{persona.cardTitle}</strong>
                  <span>{persona.cardText}</span>
                  <span className="persona-card-link">
                    Mehr erfahren
                    <ArrowRight size={18} weight="bold" aria-hidden="true" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="campaign-closing campaign-frame">
          <div>
            <p className="campaign-kicker">Der gemeinsame Anfang</p>
            <h2>Zeig deiner Region, dass du dabei bist.</h2>
            <p>E-Mail, PLZ und Rolle reichen. Erst deine Bestätigung zählt als regionales Signal.</p>
          </div>
          <FunnelLink href="/region-wuenschen" sourceRoute="/" className="campaign-button campaign-button-primary">
            Region wünschen
            <ArrowRight size={19} weight="bold" aria-hidden="true" />
          </FunnelLink>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
