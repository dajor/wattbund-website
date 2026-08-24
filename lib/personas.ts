import type { StaticImageData } from "next/image";
import erzeugerImage from "@/assets/personas/erzeuger.jpg";
import erzeugerCardImage from "@/assets/personas/erzeuger-card.jpg";
import gewerbeImage from "@/assets/personas/gewerbe.jpg";
import gewerbeCardImage from "@/assets/personas/gewerbe-card.jpg";
import kommunenImage from "@/assets/personas/kommunen.jpg";
import kommunenCardImage from "@/assets/personas/kommunen-card.jpg";
import solarpartnerImage from "@/assets/personas/solarpartner.jpg";
import solarpartnerCardImage from "@/assets/personas/solarpartner-card.jpg";
import verbraucherImage from "@/assets/personas/verbraucher.jpg";
import verbraucherCardImage from "@/assets/personas/verbraucher-card.jpg";

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
  cardImage: StaticImageData;
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
    cardImage: erzeugerCardImage,
    imageAlt: "Eigentümer vor einem Haus mit Solaranlage in einer vernetzten Nachbarschaft",
    primaryLabel: "Region wünschen",
    primaryHref: "/region-wuenschen?rolle=producer",
    valueHeadline: "Vom einzelnen Dach zur lokalen Initiative",
    valueLead: "WattBund bündelt bestätigte regionale Interessen. So wird sichtbar, wo ein Pilot sinnvoll sein kann.",
    steps: [
      {
        title: "Region eintragen",
        text: "Zeige mit PLZ und Rolle, dass in deiner Region Solarstrom entsteht. Eine genaue Adresse ist nicht nötig.",
      },
      {
        title: "Interesse bündeln",
        text: "WattBund zählt nur bestätigte Signale von Haushalten, Betrieben und weiteren Erzeugern.",
      },
      {
        title: "Pilot prüfen",
        text: "WattBund bewertet starke Regionen manuell und bereitet bei Bedarf erste Gespräche vor.",
      },
    ],
    closingHeadline: "Deine Region wartet nicht auf Perfektion.",
    closingText: "Ein bestätigter Regionswunsch reicht, damit lokale Nachfrage sichtbar wird.",
  },
  {
    slug: "verbraucher",
    audience: "Für Haushalte",
    cardTitle: "Lokale Energie finden, auch ohne eigenes Dach",
    cardText: "Entdecke Solarpotenzial und zeige dein Interesse an einer Community vor Ort.",
    headline: "Kein Dach? Kein Problem.",
    lead: "Auch als Mieter oder Haushalt ohne PV-Anlage kannst du Teil einer lokalen Energie-Community werden.",
    image: verbraucherImage,
    cardImage: verbraucherCardImage,
    imageAlt: "Paar in einer Wohnsiedlung mit Solaranlagen in der Nachbarschaft",
    primaryLabel: "Region wünschen",
    primaryHref: "/region-wuenschen?rolle=consumer",
    valueHeadline: "Dein Interesse macht Bedarf sichtbar",
    valueLead: "Die Solar Map zeigt Potenziale. Dein bestätigter Regionswunsch zeigt, wo Menschen lokale Energie wirklich nutzen möchten.",
    steps: [
      {
        title: "Region prüfen",
        text: "Sieh auf der Karte, wie viel Solarpotenzial und Aktivität es in deiner Umgebung gibt.",
      },
      {
        title: "Bedarf zeigen",
        text: "Trage E-Mail, PLZ und Rolle ein und bestätige dein Interesse über den sicheren Link.",
      },
      {
        title: "Nachfrage bündeln",
        text: "WattBund wertet bestätigte Signale regional aus. Deine genaue Wohnadresse wird nicht benötigt.",
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
    cardImage: gewerbeCardImage,
    imageAlt: "Bäcker vor seinem Betrieb mit Solaranlagen in der Umgebung",
    primaryLabel: "Region wünschen",
    primaryHref: "/region-wuenschen?rolle=business",
    valueHeadline: "Ein Standort kann eine Region aktivieren",
    valueLead: "Betriebe bringen Verbrauch, Flächen und Reichweite zusammen. WattBund macht diese Rolle für regionale Initiativen sichtbar.",
    steps: [
      {
        title: "Standort einordnen",
        text: "Trage PLZ und Rolle ein und zeige, dass dein Betrieb regionale Energie mitgestalten möchte.",
      },
      {
        title: "Potenziale verbinden",
        text: "WattBund bündelt bestätigte Signale von Anlagen, Haushalten und Initiativen in deiner Region.",
      },
      {
        title: "Regional sichtbar werden",
        text: "Starke Regionen werden manuell bewertet und für mögliche Pilotgespräche vorbereitet.",
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
    cardImage: solarpartnerCardImage,
    imageAlt: "Solarinstallateur vor einem Haus mit Photovoltaikanlage",
    primaryLabel: "Region wünschen",
    primaryHref: "/region-wuenschen?rolle=solar_partner",
    valueHeadline: "Nach der Installation beginnt das Netzwerk",
    valueLead: "WattBund zeigt anhand bestätigter Regionswünsche, wo Kunden und Partner Interesse an einem lokalen Pilot haben.",
    steps: [
      {
        title: "Projekte erweitern",
        text: "Lade Anlagenbesitzer ein, ihren Regionswunsch mit PLZ und Rolle zu bestätigen.",
      },
      {
        title: "Kunden aktivieren",
        text: "Gib deinen Kunden einen einfachen nächsten Schritt, ohne Vertrag oder vollständiges Profil.",
      },
      {
        title: "Regionen entwickeln",
        text: "Erkenne anhand bestätigter Signale, wo ein gemeinsamer Pilot geprüft werden sollte.",
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
    cardImage: kommunenCardImage,
    imageAlt: "Menschen aus einer Gemeinde vor einem Ort mit Solaranlagen",
    primaryLabel: "Region wünschen",
    primaryHref: "/region-wuenschen?rolle=municipality",
    valueHeadline: "Eine gemeinsame Sicht auf das, was möglich ist",
    valueLead: "WattBund verbindet räumliche Orientierung mit bestätigten Regionswünschen und liefert eine verständliche Basis für den Dialog.",
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
