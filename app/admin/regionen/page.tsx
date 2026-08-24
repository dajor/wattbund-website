import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminRegions } from "@/components/admin-regions";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Regionale Nachfrage" };

export default async function AdminRegionsPage() {
  const session = await auth();
  if (!session?.user) redirect("/anmelden");
  if (session.user.role !== "admin") redirect("/konto");
  return <><SiteHeader /><main className="admin-layout"><header><p>Administration</p><h1>Regionale Nachfrage</h1><span>Bestätigte Signale ranken Regionen. Die Pilotentscheidung bleibt manuell.</span><nav className="admin-tabs"><Link href="/admin">Profile</Link><Link href="/admin/regionen" aria-current="page">Regionen</Link></nav></header><AdminRegions /></main></>;
}
