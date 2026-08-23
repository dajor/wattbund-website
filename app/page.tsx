import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Buildings,
  Factory,
  HouseLine,
  MapTrifold,
  SolarPanel,
  UsersThree
} from "@phosphor-icons/react/dist/ssr";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import producerImage from "@/assets/world/hero-solar-community.png";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="home-hero">
          <div className="hero-copy">
            <p className="eyebrow">Lokale Energie wird sichtbar</p>
            <h1>Dein Dach.<br /><em>Unsere Energie.</em></h1>
            <p className="hero-lead">Entdecke Solarpotenzial und Menschen, die regionale Energie gemeinsam nutzen möchten.</p>
            <div className="hero-actions">
              <Link href="/solar-map" className="button button-primary">Solar Map öffnen<ArrowRight size={19} weight="bold" /></Link>
              <Link href="/konto" className="button button-secondary">Profil anlegen</Link>
            </div>
          </div>
          <div className="hero-media">
            <Image
              src={producerImage}
              alt="Haus mit Solaranlage in einer grünen Wohnumgebung"
              fill
              priority
              sizes="(max-width: 800px) 100vw, 48vw"
            />
            <div className="hero-media-caption">
              <SolarPanel size={23} weight="fill" />
              <span>Solarenergie aus der Nachbarschaft</span>
            </div>
          </div>
        </section>

        <section className="principle-section" id="prinzip">
          <div className="principle-heading">
            <h2>Eine Karte. Viele Regionen.</h2>
            <p>Poing und Vaterstetten starten den Pilot. Weitere Gemeinden kommen über denselben Datenimport hinzu.</p>
          </div>
          <div className="principle-grid">
            <article className="principle-map">
              <MapTrifold size={42} weight="duotone" />
              <div>
                <h3>Potenzial entdecken</h3>
                <p>Dachflächen werden aus offenen 3D-Gebäudedaten analysiert und als nachvollziehbarer Orientierungswert dargestellt.</p>
              </div>
              <Link href="/solar-map">Zur Karte<ArrowRight size={17} /></Link>
            </article>
            <article>
              <UsersThree size={34} weight="duotone" />
              <h3>Community finden</h3>
              <p>Freiwillige Profile zeigen, wo lokales Interesse entsteht. Private Adressen bleiben geschützt.</p>
            </article>
            <article className="principle-dark">
              <Buildings size={34} weight="duotone" />
              <h3>Regionen aktivieren</h3>
              <p>Kommunen und Partner erhalten eine belastbare Grundlage für den nächsten Pilot.</p>
            </article>
          </div>
        </section>

        <section className="flow-section">
          <h2>Vom Potenzial zur Community</h2>
          <div className="flow-list">
            <article><SolarPanel size={28} /><h3>Dächer verstehen</h3><p>Fläche, Ausrichtung und Neigung ergeben eine erste solare Einschätzung.</p></article>
            <article><HouseLine size={28} /><h3>Interesse zeigen</h3><p>Erzeuger und Verbraucher erstellen ein freiwilliges, moderiertes Profil.</p></article>
            <article><Factory size={28} /><h3>Lokal verbinden</h3><p>Haushalte, Gewerbe und Partner erkennen, wo eine Community tragfähig werden kann.</p></article>
          </div>
        </section>

        <section className="community-section" id="community">
          <div>
            <h2>Strom verbindet Menschen.</h2>
            <p>WattBund bringt Erzeugung, Verbrauch und regionales Interesse an einem Ort zusammen. Transparent, freiwillig und datensparsam.</p>
          </div>
          <blockquote>„Ich hab Solar. Wer will meinen Strom?“</blockquote>
        </section>

        <section className="home-cta">
          <div>
            <h2>Was steckt in deiner Region?</h2>
            <p>Öffne die Karte oder zeige mit einem Profil, dass du Teil einer lokalen Energy Community werden möchtest.</p>
          </div>
          <Link href="/solar-map" className="button button-light">Solar Map öffnen<ArrowRight size={19} /></Link>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
