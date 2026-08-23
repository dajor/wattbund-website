import { SiteHeader } from "@/components/site-header";
import { SolarMap } from "@/components/solar-map";
import { listRegions } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const regions = await listRegions();

  return (
    <div className="map-page-shell compact-solar-site">
      <SiteHeader compact />
      <SolarMap initialRegions={regions} />
    </div>
  );
}
