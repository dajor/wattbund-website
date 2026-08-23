import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle, MapTrifold } from "@phosphor-icons/react/dist/ssr";
import type { Persona } from "@/lib/personas";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export function PersonaLanding({ persona }: { persona: Persona }) {
  return (
    <div className="campaign-shell">
      <SiteHeader />
      <main>
        <section className="persona-hero campaign-frame">
          <div className="persona-hero-copy campaign-enter">
            <p className="campaign-kicker">{persona.audience}</p>
            <h1>{persona.headline}</h1>
            <p className="campaign-lead">{persona.lead}</p>
            <div className="campaign-actions">
              <Link href={persona.primaryHref} className="campaign-button campaign-button-primary">
                {persona.primaryLabel}
                <ArrowRight size={19} weight="bold" aria-hidden="true" />
              </Link>
              <Link href="/solar-map" className="campaign-button campaign-button-secondary">
                <MapTrifold size={19} weight="bold" aria-hidden="true" />
                Solar Map
              </Link>
            </div>
          </div>
          <figure className="persona-hero-media">
            <Image
              src={persona.image}
              alt={persona.imageAlt}
              priority
              sizes="(max-width: 860px) 100vw, 46vw"
            />
          </figure>
        </section>

        <section className="persona-value campaign-frame" aria-labelledby="persona-value-title">
          <div className="persona-value-intro">
            <h2 id="persona-value-title">{persona.valueHeadline}</h2>
            <p>{persona.valueLead}</p>
          </div>
          <ol className="persona-step-list">
            {persona.steps.map((step, index) => (
              <li key={step.title}>
                <span className="persona-step-number">0{index + 1}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                <CheckCircle size={25} weight="duotone" aria-hidden="true" />
              </li>
            ))}
          </ol>
        </section>

        <section className="persona-closing campaign-frame">
          <div>
            <h2>{persona.closingHeadline}</h2>
            <p>{persona.closingText}</p>
          </div>
          <Link href={persona.primaryHref} className="campaign-button campaign-button-primary">
            {persona.primaryLabel}
            <ArrowRight size={19} weight="bold" aria-hidden="true" />
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
