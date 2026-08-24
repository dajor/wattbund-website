import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { AdminProfiles } from "@/components/admin-profiles";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/anmelden");
  if (session.user.role !== "admin") redirect("/konto");
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
