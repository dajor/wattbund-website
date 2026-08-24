import Link from "next/link";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";

export default async function RegionConfirmedPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const confirmed = status === "confirmed";
  return (
    <>
      <SiteHeader />
      <main className="message-page">
        {confirmed ? <CheckCircle size={48} weight="duotone" /> : <WarningCircle size={48} weight="duotone" />}
        <h1>{confirmed ? "Dein Interesse zählt." : "Der Link ist nicht mehr gültig."}</h1>
        <p>{confirmed ? "Danke. Wir melden uns, wenn in deiner Region ein konkreter nächster Schritt entsteht. Eine separate E-Mail enthält deinen Löschlink." : "Bestätigungslinks gelten 24 Stunden und nur einmal. Du kannst deinen Regionswunsch erneut absenden."}</p>
        <Link className="button button-primary" href={confirmed ? "/solar-map" : "/region-wuenschen"}>{confirmed ? "Solar Map ansehen" : "Erneut eintragen"}</Link>
      </main>
    </>
  );
}
