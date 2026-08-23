import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { ProfileEditor } from "@/components/profile-editor";
import { SiteHeader } from "@/components/site-header";
import { listRegions } from "@/lib/data";

export const metadata: Metadata = { title: "Mein Profil" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/anmelden");
  const regions = await listRegions();
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/" });
  }
  return (
    <>
      <SiteHeader />
      <main className="account-layout">
        <aside className="account-sidebar">
          <p>Konto</p>
          <h1>Dein Community-Profil</h1>
          <span>{session.user.email}</span>
          {session.user.role === "admin" && <a href="/admin">Administration öffnen</a>}
          <form action={logout}><button type="submit" className="text-button">Abmelden</button></form>
        </aside>
        <ProfileEditor regions={regions} />
      </main>
    </>
  );
}
