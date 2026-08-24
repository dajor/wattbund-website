import { NextResponse } from "next/server";
import { locationSearchSchema } from "@/lib/validation";
import type { Coordinates } from "@/lib/types";

type MapTilerFeature = {
  id?: string;
  text?: string;
  place_name?: string;
  center?: Coordinates;
  bbox?: [number, number, number, number];
  place_type?: string[];
};

export async function GET(request: Request) {
  const query = locationSearchSchema.safeParse(new URL(request.url).searchParams.get("q") ?? "");
  if (!query.success) return NextResponse.json({ error: "Bitte gib mindestens zwei Zeichen ein." }, { status: 400 });
  const key = process.env.MAPTILER_API_KEY;
  if (!key) return NextResponse.json({ error: "Die Ortssuche ist gerade nicht verfügbar." }, { status: 503 });

  const url = new URL(`https://api.maptiler.com/geocoding/${encodeURIComponent(query.data)}.json`);
  url.searchParams.set("key", key);
  url.searchParams.set("country", "de");
  url.searchParams.set("language", "de");
  url.searchParams.set("types", "region,county,municipality,municipal_district,locality,place,postal_code");
  url.searchParams.set("limit", "6");
  url.searchParams.set("autocomplete", "false");

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!response.ok) throw new Error(`MapTiler returned ${response.status}`);
    const data = await response.json() as { features?: MapTilerFeature[] };
    const results = (data.features ?? []).flatMap((feature, index) => {
      if (!feature.center || !Number.isFinite(feature.center[0]) || !Number.isFinite(feature.center[1])) return [];
      return [{
        id: feature.id ?? `${feature.center.join(",")}-${index}`,
        label: feature.place_name ?? feature.text ?? query.data,
        name: feature.text ?? feature.place_name ?? query.data,
        coordinates: feature.center,
        bbox: feature.bbox ?? null,
        type: feature.place_type?.[0] ?? "place"
      }];
    });
    return NextResponse.json({ results }, {
      headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=86400" }
    });
  } catch (error) {
    console.error("Location search failed", { query: query.data, error });
    return NextResponse.json({ error: "Orte konnten gerade nicht gesucht werden." }, { status: 502 });
  }
}
