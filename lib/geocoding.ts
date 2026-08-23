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

export function pointWithinRegionBounds([longitude, latitude]: Coordinates, region: Region) {
  const [[west, south], [east, north]] = region.bounds;
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north;
}
