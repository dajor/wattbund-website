import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminSolarScanner } from "@/components/admin-solar-scanner";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = { title: "Solar-Scan" };

export default async function AdminSolarScanPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/admin");
  return <><SiteHeader /><main className="admin-layout admin-scan-layout"><header><p>Administration</p><h1>Solar über Dächern erkennen</h1><span>Gemeinde auswählen, Luftbilder analysieren und jeden KI-Fund vor der Veröffentlichung prüfen.</span><nav className="admin-tabs"><Link href="/admin">Profile</Link><Link href="/admin/regionen">Nachfrage</Link><Link href="/admin/solar-scan" aria-current="page">Solar-Scan</Link></nav></header><AdminSolarScanner /></main></>;
}
