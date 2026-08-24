"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import {
  Buildings,
  Check,
  Info,
  MagnifyingGlass,
  MapPin,
  SlidersHorizontal,
  SolarPanel,
  SpinnerGap,
  UserPlus,
  UsersThree,
  X
} from "@phosphor-icons/react";
import { findRegionForPoint } from "@/lib/geocoding";
import { buildRegionInterestHref } from "@/lib/region-interest-url";
import type { BuildingProperties, PublicProfile, Region } from "@/lib/types";

type LayerState = { roofs: boolean; profiles: boolean };
type SearchResult = {
  id: string;
  label: string;
  name: string;
  coordinates: [number, number];
  bbox: [number, number, number, number] | null;
  type: string;
};

const emptyFeatureCollection = { type: "FeatureCollection" as const, features: [] };

export function SolarMap({ initialRegions }: { initialRegions: Region[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const selectedRegionSlugRef = useRef<string | null>(null);
  const [selectedRegionSlug, setSelectedRegionSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingProperties | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  const [layers, setLayers] = useState<LayerState>({ roofs: true, profiles: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const region = useMemo(
    () => initialRegions.find((item) => item.slug === selectedRegionSlug) ?? null,
    [initialRegions, selectedRegionSlug]
  );
  const regionInterestHref = useMemo(
    () => buildRegionInterestHref(region ? null : selectedLocation),
    [region, selectedLocation]
  );

  const searchLocations = useCallback(async () => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setError("Bitte gib mindestens zwei Zeichen ein.");
      setSearchResults([]);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const response = await fetch(`/api/geocoding/search?q=${encodeURIComponent(query)}`);
      const data = await response.json() as { results?: SearchResult[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Orte konnten nicht gesucht werden");
      setSearchResults(data.results ?? []);
      if (!data.results?.length) setError("Kein passender Ort oder keine passende PLZ gefunden.");
    } catch (searchError) {
      setSearchResults([]);
      setError(searchError instanceof Error ? searchError.message : "Orte konnten nicht gesucht werden");
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const selectLocation = useCallback((result: SearchResult) => {
    const match = findRegionForPoint(result.coordinates, initialRegions);
    selectedRegionSlugRef.current = match?.slug ?? null;
    setSelectedRegionSlug(match?.slug ?? null);
    setSelectedLocation(result);
    setSearchQuery(result.name);
    setSearchResults([]);
    setSelectedBuilding(null);
    setSelectedProfile(null);
    setError(null);

    const map = mapRef.current;
    if (!map) return;
    (map.getSource("solar-buildings") as GeoJSONSource | undefined)?.setData(emptyFeatureCollection);
    (map.getSource("community-profiles") as GeoJSONSource | undefined)?.setData(emptyFeatureCollection);
    if (match) {
      map.flyTo({ center: result.coordinates, zoom: 14.2, duration: 900 });
    } else if (result.bbox) {
      map.fitBounds([[result.bbox[0], result.bbox[1]], [result.bbox[2], result.bbox[3]]], { padding: 54, maxZoom: 12.5, duration: 900 });
    } else {
      map.flyTo({ center: result.coordinates, zoom: match ? 14.2 : 11.5, duration: 900 });
    }
    if (!match) setLoading(false);
  }, [initialRegions]);

  const loadMapData = useCallback(async (map: MapLibreMap, slug: string) => {
    try {
      setLoading(true);
      setError(null);
      const bounds = map.getBounds();
      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",");
      const [buildingResponse, profileResponse] = await Promise.all([
        fetch(`/api/map/buildings?region=${encodeURIComponent(slug)}&bbox=${bbox}`),
        fetch(`/api/profiles?region=${encodeURIComponent(slug)}&bbox=${bbox}`)
      ]);
      if (!buildingResponse.ok || !profileResponse.ok) throw new Error("Kartendaten konnten nicht geladen werden");
      const buildingData = await buildingResponse.json();
      const profileData = await profileResponse.json() as { profiles: PublicProfile[] };
      if (mapRef.current !== map || !map.getStyle()) return;
      const buildingSource = map.getSource("solar-buildings") as GeoJSONSource | undefined;
      const profileSource = map.getSource("community-profiles") as GeoJSONSource | undefined;
      if (!buildingSource || !profileSource) return;
      const profileCollection = profilesToGeoJson(profileData.profiles);
      await Promise.all([
        buildingSource.setData(buildingData),
        profileSource.setData(profileCollection)
      ]);
      if (mapRef.current !== map) return;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Kartendaten konnten nicht geladen werden");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const key = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
    const developmentStyle: StyleSpecification = {
      version: 8,
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors"
        }
      },
      layers: [{ id: "osm", type: "raster", source: "osm" }]
    };
    const style = key
      ? `https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`
      : developmentStyle;
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style,
      center: [10.4515, 51.1657],
      zoom: 5.4,
      attributionControl: false
    });
    mapRef.current = map;
    map.on("error", (event) => {
      map.getContainer().dataset.mapError = event.error?.message ?? "unknown-map-error";
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

    map.on("load", () => {
      try {
        map.addSource("solar-buildings", { type: "geojson", data: emptyFeatureCollection });
        map.addLayer({
          id: "solar-buildings-fill",
          type: "fill",
          source: "solar-buildings",
          paint: {
            "fill-color": ["match", ["get", "potentialClass"], "high", "#168653", "medium", "#d39a2f", "#b8a34b"],
            "fill-opacity": 0.76,
            "fill-outline-color": "#ffffff"
          }
        });
        map.addLayer({
          id: "solar-buildings-line",
          type: "line",
          source: "solar-buildings",
          paint: { "line-color": "#17395f", "line-width": 1.1, "line-opacity": 0.52 }
        });
        map.addSource("community-profiles", {
          type: "geojson",
          data: emptyFeatureCollection,
          cluster: true,
          clusterRadius: 42
        });
        map.addLayer({
          id: "profile-clusters",
          type: "circle",
          source: "community-profiles",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#2568d8",
            "circle-radius": ["step", ["get", "point_count"], 17, 10, 21],
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff"
          }
        });
        map.addLayer({
          id: "profile-cluster-count",
          type: "symbol",
          source: "community-profiles",
          filter: ["has", "point_count"],
          layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
          paint: { "text-color": "#ffffff" }
        });
        map.addLayer({
          id: "profile-points",
          type: "circle",
          source: "community-profiles",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-color": "#2568d8",
            "circle-radius": 8,
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff"
          }
        });
        map.on("mouseenter", "solar-buildings-fill", () => { map.getCanvas().style.cursor = "pointer"; });
        map.on("mouseleave", "solar-buildings-fill", () => { map.getCanvas().style.cursor = ""; });
        map.on("click", async (event) => {
          const profileFeature = map.queryRenderedFeatures(event.point, { layers: ["profile-points"] })[0];
          if (profileFeature?.properties) {
            setSelectedBuilding(null);
            setSelectedProfile({
              id: String(profileFeature.id ?? ""),
              regionSlug: profileFeature.properties.regionSlug,
              role: profileFeature.properties.role,
              displayName: profileFeature.properties.displayName,
              description: profileFeature.properties.description || null,
              pvStatus: profileFeature.properties.pvStatus || null,
              capacityKwp: profileFeature.properties.capacityKwp == null ? null : Number(profileFeature.properties.capacityKwp),
              coordinates: event.lngLat.toArray() as [number, number]
            });
            return;
          }

          const buildingFeature = map.queryRenderedFeatures(event.point, { layers: ["solar-buildings-fill"] })[0];
          if (!buildingFeature?.properties?.id) return;
          const response = await fetch(`/api/buildings/${buildingFeature.properties.id}`);
          if (response.ok) {
            const data = await response.json();
            setSelectedProfile(null);
            setSelectedBuilding(data.building);
          }
        });
        setLoading(false);
        map.on("moveend", () => {
          const slug = selectedRegionSlugRef.current;
          if (slug) void loadMapData(map, slug);
        });
      } catch (loadError) {
        if (mapRef.current !== map) return;
        setError(loadError instanceof Error ? loadError.message : "Kartendaten konnten nicht geladen werden");
        setLoading(false);
      }
    });
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [loadMapData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    ["solar-buildings-fill", "solar-buildings-line"].forEach((id) => map.setLayoutProperty(id, "visibility", layers.roofs ? "visible" : "none"));
    ["profile-clusters", "profile-cluster-count", "profile-points"].forEach((id) => map.setLayoutProperty(id, "visibility", layers.profiles ? "visible" : "none"));
  }, [layers]);

  return (
    <main className="solar-map-layout">
      <aside className="map-sidebar">
        <div className="map-title">
          <p>Solar Map</p>
          <h1>Was steckt in deiner Region?</h1>
        </div>
        <label className="field-label" htmlFor="map-location-search">Ort oder PLZ</label>
        <div className="map-search">
          <form role="search" onSubmit={(event) => { event.preventDefault(); void searchLocations(); }}>
            <input
              id="map-location-search"
              type="search"
              role="combobox"
              value={searchQuery}
              onChange={(event) => { setSearchQuery(event.target.value); setSearchResults([]); setError(null); }}
              placeholder="Zum Beispiel 85586 oder Berlin"
              autoComplete="off"
              aria-expanded={searchResults.length > 0}
              aria-autocomplete="list"
              aria-controls="map-search-results"
            />
            <button type="submit" aria-label="Ort suchen" disabled={searching}>
              {searching ? <SpinnerGap size={20} className="spin" /> : <MagnifyingGlass size={20} />}
            </button>
          </form>
          {searchResults.length > 0 && (
            <div id="map-search-results" className="map-search-results" role="listbox" aria-label="Suchergebnisse">
              {searchResults.map((result) => (
                <button key={result.id} type="button" role="option" aria-selected="false" onClick={() => selectLocation(result)}>
                  <MapPin size={18} aria-hidden />
                  <span><strong>{result.name}</strong><small>{result.label}</small></span>
                </button>
              ))}
            </div>
          )}
        </div>
        {region ? (
          <>
            <p className="selected-map-region"><MapPin size={16} /> Pilotkarte {region.name}</p>
            <div className="region-metrics">
              <Metric icon={<Buildings />} label="Gebäude analysiert" value={formatNumber(region.summary.buildingsAnalyzed)} />
              <Metric icon={<SolarPanel />} label="Potenzial" value={formatEnergy(region.summary.estimatedCapacityKwp)} />
              <Metric icon={<UsersThree />} label="Profile" value={formatNumber(region.summary.publishedProfiles)} />
            </div>
            <fieldset className="layer-list">
              <legend>Kartenebenen</legend>
              <LayerToggle checked={layers.roofs} onChange={(checked) => setLayers((current) => ({ ...current, roofs: checked }))} label="Solarpotenzial" swatch="green" />
              <LayerToggle checked={layers.profiles} onChange={(checked) => setLayers((current) => ({ ...current, profiles: checked }))} label="Community-Profile" swatch="blue" />
            </fieldset>
            <div className="map-note"><Info size={18} /><p>Potenzialwerte sind eine erste Orientierung aus Gebäudedaten. Sie ersetzen keine Fachplanung.</p></div>
            <Link href="/region-wuenschen" className="button button-secondary map-region-interest">Andere Region wünschen</Link>
          </>
        ) : selectedLocation ? (
          <div className="map-unavailable">
            <p>Noch keine Pilotkarte</p>
            <h2>{selectedLocation.name}</h2>
            <span>Zeige uns dein Interesse. So erkennen wir, wo WattBund als Nächstes starten sollte.</span>
            <Link href={regionInterestHref} className="button button-primary">Region wünschen</Link>
          </div>
        ) : (
          <p className="map-search-hint">Suche deutschlandweit nach deinem Ort oder deiner Postleitzahl.</p>
        )}
      </aside>
      <section className="map-stage" aria-label={selectedLocation ? `Solar Map für ${selectedLocation.name}` : "Solar Map Deutschland"}>
        <div ref={mapContainer} className="map-canvas" />
        {loading && <div className="map-status"><SpinnerGap size={18} className="spin" />Kartendaten werden geladen</div>}
        {error && <div className="map-status map-error">{error}</div>}
        {region && <div className="map-legend"><span><i className="legend-high" />Hoch</span><span><i className="legend-medium" />Mittel</span><span><i className="legend-low" />Niedrig</span></div>}
        <nav className={`mobile-map-actions${region ? "" : " single"}`} aria-label="Kartenaktionen">
          {region && <details className="mobile-layer-menu">
            <summary><SlidersHorizontal size={20} />Ebenen</summary>
            <div className="mobile-layer-panel">
              <strong>Kartenebenen</strong>
              <LayerToggle checked={layers.roofs} onChange={(checked) => setLayers((current) => ({ ...current, roofs: checked }))} label="Solarpotenzial" swatch="green" />
              <LayerToggle checked={layers.profiles} onChange={(checked) => setLayers((current) => ({ ...current, profiles: checked }))} label="Community-Profile" swatch="blue" />
              <p>Potenzialwerte dienen als erste Orientierung und ersetzen keine Fachplanung.</p>
            </div>
          </details>}
          <Link href={regionInterestHref} className="mobile-profile-action"><UserPlus size={20} />Region wünschen</Link>
        </nav>
        {(selectedBuilding || selectedProfile) && (
          <DetailPanel building={selectedBuilding} profile={selectedProfile} onClose={() => { setSelectedBuilding(null); setSelectedProfile(null); }} />
        )}
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="metric"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

function LayerToggle({ checked, onChange, label, swatch }: { checked: boolean; onChange: (checked: boolean) => void; label: string; swatch: "green" | "blue" }) {
  return (
    <label className="layer-toggle">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="check-box">{checked && <Check size={13} weight="bold" />}</span>
      <i className={`layer-swatch ${swatch}`} />
      {label}
    </label>
  );
}

function DetailPanel({ building, profile, onClose }: { building: BuildingProperties | null; profile: PublicProfile | null; onClose: () => void }) {
  return (
    <article className="map-detail">
      <button className="icon-button" onClick={onClose} aria-label="Detailansicht schließen"><X size={19} /></button>
      {building ? (
        <>
          <p className="detail-kind"><SolarPanel size={18} />Solarpotenzial</p>
          <h2>{building.label}</h2>
          <div className="detail-numbers">
            <div><strong>{building.estimatedKwp.toLocaleString("de-DE")} kWp</strong><span>geschätzte Leistung</span></div>
            <div><strong>{building.annualYieldKwh.toLocaleString("de-DE")} kWh</strong><span>möglicher Jahresertrag</span></div>
            <div><strong>{building.suitableAreaM2.toLocaleString("de-DE")} m²</strong><span>geeignete Dachfläche</span></div>
          </div>
          <p className="detail-source">{building.sourceName}<br />Modell {building.modelVersion}</p>
        </>
      ) : profile ? (
        <>
          <p className="detail-kind"><MapPin size={18} />Ungefährer Standort</p>
          <h2>{profile.displayName}</h2>
          <p>{profile.description}</p>
          <div className="profile-facts"><span>{roleLabel(profile.role)}</span>{profile.capacityKwp && <span>{profile.capacityKwp.toLocaleString("de-DE")} kWp</span>}</div>
          <p className="detail-source">Freiwillig veröffentlichtes und moderiertes Community-Profil.</p>
        </>
      ) : null}
    </article>
  );
}

function profilesToGeoJson(profiles: PublicProfile[]) {
  return {
    type: "FeatureCollection" as const,
    features: profiles.map((profile) => ({
      type: "Feature" as const,
      id: profile.id,
      geometry: { type: "Point" as const, coordinates: profile.coordinates },
      properties: {
        id: profile.id,
        regionSlug: profile.regionSlug,
        role: profile.role,
        displayName: profile.displayName,
        description: profile.description,
        pvStatus: profile.pvStatus,
        capacityKwp: profile.capacityKwp
      }
    }))
  };
}

function formatNumber(value: number) { return Number.isFinite(value) ? value.toLocaleString("de-DE") : "-"; }
function formatEnergy(value: number) { return Number.isFinite(value) ? `${Math.round(value).toLocaleString("de-DE")} kWp` : "-"; }
function roleLabel(role: PublicProfile["role"]) {
  return { producer: "Erzeuger", consumer: "Verbraucher", business: "Unternehmen", partner: "Partner" }[role];
}
