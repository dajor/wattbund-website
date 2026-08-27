import type { Metadata } from "next";
import { LockKey, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signIn } from "@/auth";
import { AdminProfiles } from "@/components/admin-profiles";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Administration" };

type AdminPageProps = {
  searchParams: Promise<{ fehler?: string }>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const session = await auth();
  const params = await searchParams;

  async function adminPasswordSignIn(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    try {
      await signIn("admin-password", { email, password, redirectTo: "/admin" });
    } catch (error) {
      if (error instanceof AuthError) redirect("/admin?fehler=admin-zugang");
      throw error;
    }
  }

  if (session?.user?.role !== "admin") {
    return (
      <>
        <SiteHeader />
        <main className="auth-layout">
          <section className="auth-intro">
            <p>Administration</p>
            <h1>WattBund verwalten.</h1>
            <div className="auth-benefit"><ShieldCheck size={23} /><span>Dieser Bereich ist ausschließlich für freigegebene Administratoren bestimmt.</span></div>
          </section>
          <section className="auth-panel">
            <LockKey size={30} />
            <h2>Admin-Anmeldung</h2>
            <p>Melde dich mit deiner Admin-E-Mail-Adresse und deinem Passwort an.</p>
            {params.fehler === "admin-zugang" && <p className="form-feedback error" role="alert">E-Mail-Adresse oder Passwort ist nicht korrekt.</p>}
            <form action={adminPasswordSignIn} className="stack-form">
              <label htmlFor="admin-email">Admin-E-Mail</label>
              <input id="admin-email" name="email" type="email" autoComplete="username" required />
              <label htmlFor="admin-password">Passwort</label>
              <input id="admin-password" name="password" type="password" autoComplete="current-password" required />
              <button className="button button-primary" type="submit">Als Admin anmelden</button>
            </form>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="admin-layout">
        <header><p>Administration</p><h1>Community-Profile prüfen</h1><span>Nur freiwillige Angaben werden veröffentlicht. Adressen bleiben verschlüsselt.</span><nav className="admin-tabs"><Link href="/admin" aria-current="page">Profile</Link><Link href="/admin/regionen">Regionen</Link></nav></header>
        <AdminProfiles />
      </main>
    </>
  );
}
