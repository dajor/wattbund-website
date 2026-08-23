import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PersonaLanding } from "@/components/persona-landing";
import { getPersona, personas } from "@/lib/personas";

type PersonaPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return personas.map((persona) => ({ slug: persona.slug }));
}

export async function generateMetadata({ params }: PersonaPageProps): Promise<Metadata> {
  const { slug } = await params;
  const persona = getPersona(slug);

  if (!persona) {
    return {};
  }

  return {
    title: `${persona.audience} | WattBund`,
    description: persona.lead,
  };
}

export default async function PersonaPage({ params }: PersonaPageProps) {
  const { slug } = await params;
  const persona = getPersona(slug);

  if (!persona) {
    notFound();
  }

  return <PersonaLanding persona={persona} />;
}
