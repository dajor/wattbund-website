import type { StaticImageData } from "next/image";
import erzeugerImage from "@/assets/personas/erzeuger.jpg";
import gewerbeImage from "@/assets/personas/gewerbe.jpg";
import kommunenImage from "@/assets/personas/kommunen.jpg";
import solarpartnerImage from "@/assets/personas/solarpartner.jpg";
import verbraucherImage from "@/assets/personas/verbraucher.jpg";

export type PersonaSlug =
  | "erzeuger"
  | "verbraucher"
  | "gewerbe"
  | "solarpartner"
  | "kommunen";

export type Persona = {
  slug: PersonaSlug;
  audience: string;
  cardTitle: string;
  cardText: string;
  headline: string;
  lead: string;
  image: StaticImageData;
  imageAlt: string;
  primaryLabel: string;
  primaryHref: string;
  valueHeadline: string;
  valueLead: string;
  steps: Array<{ title: string; text: string }>;
  closingHeadline: string;
  closingText: string;
};

export const personas: Persona[] = [
  {
    slug: "erzeuger",
    audience: "Für PV-Eigentümer",
    cardTitle: "Solarstrom in der Nachbarschaft sichtbar machen",
    cardText: "Zeige dein Potenzial und finde Menschen, die lokale Energie mittragen.",
    headline: "Dein Dach kann mehr.",
    lead: "Mach deine Solaranlage zum Ausgangspunkt einer lokalen Energie-Community und bündle echtes Interesse in deiner Region.",
    image: erzeugerImage,
    imageAlt: "Eigentümer vor einem Haus mit Solaranlage in einer vernetzten Nachbarschaft",
    primaryLabel: "Region wünschen",
    primaryHref: "/region-wuenschen?rolle=producer",
    valueHeadline: "Vom einzelnen Dach zur lokalen Initiative",
    valueLead: "WattBund schafft zunächst Transparenz und Kontakte. So wird sichtbar, wo eine Community entstehen kann.",
    steps: [
      {
        title: "Anlage sichtbar machen",
        text: "Zeige freiwillig, in welcher Region bereits Solarstrom entsteht, ohne deine genaue Adresse öffentlich zu machen.",
      },
      {
        title: "Interesse bündeln",
        text: "Finde Haushalte, Betriebe und weitere Erzeuger aus derselben Umgebung.",
      },
      {
        title: "Community vorbereiten",
        text: "Schaffe eine belastbare Grundlage für Gespräche und einen möglichen lokalen Pilot.",
      },
    ],
    closingHeadline: "Deine Region wartet nicht auf Perfektion.",
    closingText: "Ein erstes Profil reicht, damit andere sehen: Hier bewegt sich etwas.",
  },
  {
    slug: "verbraucher",
    audience: "Für Haushalte",
    cardTitle: "Lokale Energie finden, auch ohne eigenes Dach",
    cardText: "Entdecke Solarpotenzial und zeige dein Interesse an einer Community vor Ort.",
    headline: "Kein Dach? Kein Problem.",
    lead: "Auch als Mieter oder Haushalt ohne PV-Anlage kannst du Teil einer lokalen Energie-Community werden.",
    image: verbraucherImage,
    imageAlt: "Paar in einer Wohnsiedlung mit Solaranlagen in der Nachbarschaft",
    primaryLabel: "Interesse zeigen",
    primaryHref: "/region-wuenschen?rolle=consumer",
    valueHeadline: "Dein Interesse macht Bedarf sichtbar",
    valueLead: "Die Solar Map zeigt Potenziale. Dein freiwilliges Profil zeigt, wo Menschen lokale Energie wirklich nutzen möchten.",
    steps: [
      {
        title: "Region prüfen",
        text: "Sieh auf der Karte, wie viel Solarpotenzial und Aktivität es in deiner Umgebung gibt.",
      },
      {
        title: "Bedarf zeigen",
        text: "Lege ein Verbraucherprofil an und signalisiere dein Interesse an lokaler Energie.",
      },
      {
        title: "Kontakte ermöglichen",
        text: "WattBund bündelt regionale Signale und schützt dabei deine genaue Wohnadresse.",
      },
    ],
    closingHeadline: "Lokale Energie braucht nicht nur Dächer.",
    closingText: "Sie braucht Menschen, die sie vor Ort nutzen wollen.",
  },
  {
    slug: "gewerbe",
    audience: "Für Gewerbe",
    cardTitle: "Energie und Standort regional zusammendenken",
    cardText: "Mach Bedarf, Erzeugung und Kooperationsbereitschaft deines Betriebs sichtbar.",
    headline: "Die Sonne arbeitet. Du auch.",
    lead: "Verbinde deinen Betriebsstandort mit regionalem Solarpotenzial und werde Teil einer lokalen Energie-Community.",
    image: gewerbeImage,
    imageAlt: "Bäcker vor seinem Betrieb mit Solaranlagen in der Umgebung",
    primaryLabel: "Region wünschen",
    primaryHref: "/region-wuenschen?rolle=business",
    valueHeadline: "Ein Standort kann eine Region aktivieren",
    valueLead: "Betriebe bringen Verbrauch, Flächen und Reichweite zusammen. WattBund macht diese Rolle für regionale Initiativen sichtbar.",
    steps: [
      {
        title: "Standort einordnen",
        text: "Erfasse deinen Betrieb und zeige, ob du Energie erzeugst, nutzen möchtest oder beides.",
      },
      {
        title: "Potenziale verbinden",
        text: "Entdecke weitere Anlagen, Interessenten und Initiativen in deiner Region.",
      },
      {
        title: "Regional sichtbar werden",
        text: "Positioniere deinen Betrieb als aktiven Teil der lokalen Energiewende.",
      },
    ],
    closingHeadline: "Regionalität endet nicht an der Ladentür.",
    closingText: "Zeige, dass dein Betrieb lokale Energie mitgestalten will.",
  },
  {
    slug: "solarpartner",
    audience: "Für Solarpartner",
    cardTitle: "Aus PV-Projekten werden Communities",
    cardText: "Begleite Kunden über die Installation hinaus und entwickle regionale Netzwerke.",
    headline: "Jede Anlage startet eine Community.",
    lead: "Mach aus einzelnen PV-Kunden ein regionales Netzwerk und erschließe langfristige Beziehungen rund um lokale Energie.",
    image: solarpartnerImage,
    imageAlt: "Solarinstallateur vor einem Haus mit Photovoltaikanlage",
    primaryLabel: "Interesse zeigen",
    primaryHref: "/region-wuenschen?rolle=solar_partner",
    valueHeadline: "Nach der Installation beginnt das Netzwerk",
    valueLead: "WattBund ergänzt dein Kerngeschäft um einen regionalen Community-Einstieg, ohne bestehende Kundenbeziehungen zu ersetzen.",
    steps: [
      {
        title: "Projekte erweitern",
        text: "Lade Anlagenbesitzer ein, ihr regionales Potenzial freiwillig sichtbar zu machen.",
      },
      {
        title: "Kunden aktivieren",
        text: "Gib deinen Kunden einen klaren nächsten Schritt nach der technischen Inbetriebnahme.",
      },
      {
        title: "Regionen entwickeln",
        text: "Erkenne, wo sich Nachfrage und bestehende Anlagen zu einer Initiative verdichten.",
      },
    ],
    closingHeadline: "Die nächste Anlage ist mehr als ein Auftrag.",
    closingText: "Sie kann der Anfang einer aktiven Region sein.",
  },
  {
    slug: "kommunen",
    audience: "Für Kommunen und Initiatoren",
    cardTitle: "Regionale Energie gemeinsam in Bewegung bringen",
    cardText: "Verstehe lokale Potenziale und verbinde Anlagen, Haushalte und Betriebe.",
    headline: "Energie wird regional.",
    lead: "Schaffe einen sichtbaren Treffpunkt für Erzeuger, Verbraucher, Betriebe und Partner in deiner Kommune oder Region.",
    image: kommunenImage,
    imageAlt: "Menschen aus einer Gemeinde vor einem Ort mit Solaranlagen",
    primaryLabel: "Region aktivieren",
    primaryHref: "/region-wuenschen?rolle=municipality",
    valueHeadline: "Eine gemeinsame Sicht auf das, was möglich ist",
    valueLead: "WattBund verbindet räumliche Orientierung mit freiwilligen Interessenprofilen und liefert eine verständliche Basis für den Dialog.",
    steps: [
      {
        title: "Potenziale verstehen",
        text: "Nutze die Solar Map als niedrigschwelligen Einstieg in die regionale Bestandsaufnahme.",
      },
      {
        title: "Interesse messen",
        text: "Sammle freiwillige Signale von Bürgern, Betrieben, Anlagenbesitzern und Partnern.",
      },
      {
        title: "Pilot vorbereiten",
        text: "Erkenne Schwerpunktgebiete und bringe die passenden Akteure an einen Tisch.",
      },
    ],
    closingHeadline: "Eine Region beginnt mit einem gemeinsamen Bild.",
    closingText: "Mach Potenziale und Menschen sichtbar, bevor der erste Pilot geplant wird.",
  },
];

export function getPersona(slug: string) {
  return personas.find((persona) => persona.slug === slug);
}
