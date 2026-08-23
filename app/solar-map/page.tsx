import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SolarMap } from "@/components/solar-map";
import { listRegions } from "@/lib/data";

export const metadata: Metadata = {
  title: "Solar Map",
  description: "Entdecke Solarpotenzial und lokale Energy Communities in teilnehmenden Regionen."
};

export default async function SolarMapPage() {
  const regions = await listRegions();
  return (
    <div className="map-page-shell">
      <SiteHeader compact />
      <SolarMap initialRegions={regions} />
    </div>
  );
}
