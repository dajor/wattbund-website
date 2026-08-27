import type { Metadata } from "next";
import Link from "next/link";
import { EnvelopeSimple, LockKey, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Anmelden" };

type SignInPageProps = {
  searchParams: Promise<{ fehler?: string }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;

  async function requestMagicLink(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    if (!email) return;
    await signIn("resend", { email, redirectTo: "/konto" });
  }

  async function adminPasswordSignIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    try {
      await signIn("admin-password", { email, password, redirectTo: "/admin" });
    } catch (error) {
      if (error instanceof AuthError) redirect("/anmelden?fehler=admin-zugang");
      throw error;
    }
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
          <div className="auth-divider"><span>Admin</span></div>
          <div className="admin-sign-in-heading"><LockKey size={23} /><div><h3>Admin-Zugang</h3><p>Direkt mit Admin-E-Mail und Passwort anmelden.</p></div></div>
          {params.fehler === "admin-zugang" && <p className="form-feedback error" role="alert">E-Mail-Adresse oder Passwort ist nicht korrekt.</p>}
          <form action={adminPasswordSignIn} className="stack-form">
            <label htmlFor="admin-email">Admin-E-Mail</label>
            <input id="admin-email" name="email" type="email" autoComplete="username" required />
            <label htmlFor="admin-password">Passwort</label>
            <input id="admin-password" name="password" type="password" autoComplete="current-password" required />
            <button className="button button-secondary" type="submit">Als Admin anmelden</button>
          </form>
        </section>
      </main>
    </>
  );
}
