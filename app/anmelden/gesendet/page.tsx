import Link from "next/link";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";

export default function VerifyRequestPage() {
  return (
    <>
      <SiteHeader />
      <main className="message-page">
        <CheckCircle size={48} weight="duotone" />
        <h1>Prüfe dein Postfach</h1>
        <p>Der Anmeldelink ist unterwegs. Er kann nur einmal verwendet werden und läuft automatisch ab.</p>
        <Link className="button button-secondary" href="/solar-map">Zur Solar Map</Link>
      </main>
    </>
  );
}
