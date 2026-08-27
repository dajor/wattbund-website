import type { Metadata } from "next";
import Link from "next/link";
import { EnvelopeSimple, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { signIn } from "@/auth";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Anmelden" };

export default function SignInPage() {
  async function requestMagicLink(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email) return;
    await signIn("resend", { email, redirectTo: "/konto" });
  }

  return (
    <>
      <SiteHeader />
      <main className="auth-layout">
        <section className="auth-intro">
          <p>Dein WattBund-Konto</p>
          <h1>Zeig, dass deine Region bereit ist.</h1>
          <div className="auth-benefit"><ShieldCheck size={23} /><span>Deine genaue Adresse bleibt privat. Auf der Karte erscheint nur ein ungenauer Standort.</span></div>
        </section>
        <section className="auth-panel">
          <EnvelopeSimple size={30} />
          <h2>Per E-Mail anmelden</h2>
          <p>Wir senden dir einen sicheren Link. Du brauchst kein Passwort.</p>
          <form action={requestMagicLink} className="stack-form">
            <label htmlFor="email">E-Mail-Adresse</label>
            <input id="email" name="email" type="email" autoComplete="email" required placeholder="name@beispiel.de" />
            <button className="button button-primary" type="submit">Link senden</button>
          </form>
          <small>Mit der Anmeldung akzeptierst du die Hinweise in unserer <Link href="/legal">Datenschutzerklärung</Link>.</small>
        </section>
      </main>
    </>
  );
}
