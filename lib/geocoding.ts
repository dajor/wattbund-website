import type { Coordinates, Region } from "@/lib/types";

export async function geocodeAddress(address: string): Promise<Coordinates> {
  const key = process.env.MAPTILER_API_KEY;
  if (!key) throw new Error("MAPTILER_API_KEY is not configured");
  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(address)}.json`);
  url.searchParams.set("key", key);
  url.searchParams.set("country", "de");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Adresse konnte nicht geprüft werden");
  const data = await response.json() as { features?: Array<{ center?: Coordinates }> };
  const coordinates = data.features?.[0]?.center;
  if (!coordinates) throw new Error("Adresse wurde nicht gefunden");
  return coordinates;
}

export async function geocodePostalCode(postalCode: string): Promise<{ municipality: string | null; coordinates: Coordinates | null }> {
  const key = process.env.MAPTILER_API_KEY;
  if (!key) return { municipality: null, coordinates: null };
  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(`${postalCode}, Deutschland`)}.json`);
  url.searchParams.set("key", key);
  url.searchParams.set("country", "de");
  url.searchParams.set("limit", "1");
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { municipality: null, coordinates: null };
    const data = await response.json() as {
      features?: Array<{ center?: Coordinates; text?: string; place_name?: string; context?: Array<{ id?: string; text?: string }> }>;
    };
    const feature = data.features?.[0];
    const municipality = feature?.context?.find((item) => item.id?.startsWith("place."))?.text
      ?? feature?.text
      ?? feature?.place_name?.split(",")[0]
      ?? null;
    return { municipality, coordinates: feature?.center ?? null };
  } catch (error) {
    console.error("Postal code geocoding failed", { postalCode, error });
    return { municipality: null, coordinates: null };
  }
}

export function pointWithinRegionBounds([longitude, latitude]: Coordinates, region: Region) {
  const [[west, south], [east, north]] = region.bounds;
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north;
}

export function findRegionForPoint(coordinates: Coordinates, regions: Region[]) {
  return regions.find((region) => pointWithinRegionBounds(coordinates, region)) ?? null;
}
