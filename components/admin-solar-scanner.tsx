"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";
import {
  ArrowClockwise,
  Check,
  MagnifyingGlass,
  MapPin,
  SolarPanel,
  SpinnerGap,
  Warning,
  X
} from "@phosphor-icons/react";

type Bounds = [number, number, number, number];
type SearchResult = {
  id: string;
  label: string;
  name: string;
  coordinates: [number, number];
  bbox: Bounds | null;
  type: string;
};
type ScanJob = {
  id: string;
  external_place_id: string | null;
  region_name: string;
  location_label: string;
  bounds: Bounds;
  scan_mode: "sample" | "full";
  status: "queued" | "running" | "review" | "completed" | "failed" | "cancelled";
  total_tiles: number;
  completed_tiles: number;
  failed_tiles: number;
  candidate_count: number;
  confirmed_count: number;
  created_at: string;
  longitude: string;
  latitude: string;
};
type Candidate = {
  id: string;
  kind: "pv" | "solar_thermal" | "uncertain";
  confidence: string;
  estimated_area_m2: string;
  estimated_kwp: string;
  annual_yield_kwh: string;
  review_status: "pending" | "confirmed" | "rejected";
  geometry: { type: "Polygon"; coordinates: number[][][] };
};
type JobDetail = { job: ScanJob; candidates: Candidate[]; failures: Array<{ id: string; tile_key: string; attempts: number; last_error: string }> };

const emptyCollection = { type: "FeatureCollection" as const, features: [] };
const statusLabels: Record<ScanJob["status"], string> = {
  queued: "Wartet",
  running: "Wird analysiert",
  review: "Prüfung offen",
  completed: "Abgeschlossen",
  failed: "Fehlgeschlagen",
  cancelled: "Abgebrochen"
};

export function AdminSolarScanner() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null);
  const [scanMode, setScanMode] = useState<"sample" | "full">("full");
  const [jobs, setJobs] = useState<ScanJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const estimatedTiles = useMemo(() => selectedLocation?.bbox ? estimateTiles(selectedLocation.bbox, selectedLocation.coordinates) : 0, [selectedLocation]);
  const activeJob = detail?.job ?? jobs.find(({ id }) => id === selectedJobId) ?? null;
  const progress = activeJob ? Math.round(((activeJob.completed_tiles + activeJob.failed_tiles) / Math.max(1, activeJob.total_tiles)) * 100) : 0;

  const loadJobs = useCallback(async () => {
    const response = await fetch("/api/admin/solar-analysis/jobs", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Scans konnten nicht geladen werden");
    setJobs(data.jobs ?? []);
    setConfigured(data.configured !== false);
    setSelectedJobId((current) => current ?? data.jobs?.[0]?.id ?? null);
  }, []);

  const loadDetail = useCallback(async (jobId: string) => {
    const response = await fetch(`/api/admin/solar-analysis/jobs/${jobId}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Scan konnte nicht geladen werden");
    setDetail(data);
    setJobs((current) => current.map((job) => job.id === jobId ? data.job : job));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadJobs().catch((loadError) => setError(loadError.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadJobs]);

  useEffect(() => {
    if (!selectedJobId) return;
    const timer = window.setTimeout(() => {
      void loadDetail(selectedJobId).catch((loadError) => setError(loadError.message));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadDetail, selectedJobId]);

  useEffect(() => {
    if (!selectedJobId || !activeJob || !["queued", "running"].includes(activeJob.status)) return;
    const timer = window.setInterval(() => {
      void Promise.all([loadJobs(), loadDetail(selectedJobId)]).catch((loadError) => setError(loadError.message));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [activeJob, loadDetail, loadJobs, selectedJobId]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const key = process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
    const fallbackStyle: StyleSpecification = {
      version: 8,
      sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
      layers: [{ id: "osm", type: "raster", source: "osm" }]
    };
    maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: key ? `https://api.maptiler.com/maps/hybrid/style.json?key=${key}` : fallbackStyle,
      center: [11.8, 48.17],
      zoom: 11.5,
      attributionControl: false
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    map.on("load", () => {
      map.addSource("scan-area", { type: "geojson", data: emptyCollection });
      map.addLayer({ id: "scan-area-fill", type: "fill", source: "scan-area", paint: { "fill-color": "#2568d8", "fill-opacity": 0.08 } });
      map.addLayer({ id: "scan-area-line", type: "line", source: "scan-area", paint: { "line-color": "#2568d8", "line-width": 2, "line-dasharray": [3, 2] } });
      map.addSource("scan-candidates", { type: "geojson", data: emptyCollection });
      map.addLayer({
        id: "scan-candidates-fill",
        type: "fill",
        source: "scan-candidates",
        paint: {
          "fill-color": ["match", ["get", "reviewStatus"], "confirmed", "#168653", "rejected", "#8f2e35", "#f5bd2e"],
          "fill-opacity": ["match", ["get", "reviewStatus"], "rejected", 0.25, 0.78],
          "fill-outline-color": "#ffffff"
        }
      });
    });
    return () => { map.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded()) return;
    const bounds = detail?.job.bounds ?? selectedLocation?.bbox;
    const areaSource = map.getSource("scan-area") as GeoJSONSource | undefined;
    if (bounds && areaSource) {
      areaSource.setData(boundsFeature(bounds));
      map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 44, maxZoom: 15, duration: 700 });
    }
    const candidateSource = map.getSource("scan-candidates") as GeoJSONSource | undefined;
    if (candidateSource) candidateSource.setData(candidatesFeatureCollection(detail?.candidates ?? []));
  }, [detail, selectedLocation]);

  async function searchLocations(event: React.FormEvent) {
    event.preventDefault();
    if (query.trim().length < 2) return setError("Bitte gib mindestens zwei Zeichen ein.");
    setSearching(true);
    setError(null);
    try {
      const response = await fetch(`/api/geocoding/search?q=${encodeURIComponent(query.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Ortssuche fehlgeschlagen");
      const supported = (data.results ?? []).filter((result: SearchResult) => result.bbox && result.type === "municipality");
      setResults(supported);
      if (!supported.length) setError("Kein passendes Gemeindegebiet mit Grenzen gefunden.");
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Ortssuche fehlgeschlagen");
    } finally {
      setSearching(false);
    }
  }

  function chooseLocation(location: SearchResult) {
    setSelectedLocation(location);
    setQuery(location.name);
    setResults([]);
    setDetail(null);
    setSelectedJobId(null);
    setError(null);
  }

  async function startScan() {
    if (!selectedLocation?.bbox) return;
    setStarting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/solar-analysis/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          externalPlaceId: selectedLocation.id,
          regionName: selectedLocation.name,
          locationLabel: selectedLocation.label,
          center: selectedLocation.coordinates,
          bbox: selectedLocation.bbox,
          scanMode
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Scan konnte nicht gestartet werden");
      await loadJobs();
      setSelectedJobId(data.jobId);
      await loadDetail(data.jobId);
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : "Scan konnte nicht gestartet werden");
    } finally {
      setStarting(false);
    }
  }

  async function reviewCandidate(candidateId: string, decision: "confirm" | "reject") {
    if (!selectedJobId) return;
    setReviewingId(candidateId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/solar-analysis/candidates/${candidateId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Prüfung fehlgeschlagen");
      await Promise.all([loadDetail(selectedJobId), loadJobs()]);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Prüfung fehlgeschlagen");
    } finally {
      setReviewingId(null);
    }
  }

  async function retryFailed() {
    if (!selectedJobId) return;
    const response = await fetch(`/api/admin/solar-analysis/jobs/${selectedJobId}/retry`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) return setError(data.error ?? "Wiederholung fehlgeschlagen");
    await Promise.all([loadDetail(selectedJobId), loadJobs()]);
  }

  return (
    <div className="solar-scanner-dashboard">
      {!configured && <div className="scan-alert error"><Warning size={20} /><span>Die Solar-Scan-Funktion ist noch nicht verbunden. Neue Scans können gespeichert, aber nicht analysiert werden.</span></div>}
      {error && <div className="scan-alert error" role="alert"><Warning size={20} /><span>{error}</span></div>}

      <section className="scan-workspace">
        <div className="scan-controls">
          <div className="admin-panel-heading"><div><h2>Region auswählen</h2><p>Aktuell unterstützt der Bildscanner bayerische Gemeinden.</p></div></div>
          <form className="scan-location-search" role="search" onSubmit={searchLocations}>
            <input value={query} onChange={(event) => { setQuery(event.target.value); setResults([]); }} type="search" placeholder="Poing oder Markt Schwaben" aria-label="Gemeinde suchen" />
            <button type="submit" aria-label="Suchen">{searching ? <SpinnerGap className="spin" /> : <MagnifyingGlass />}</button>
          </form>
          {results.length > 0 && <div className="scan-search-results">{results.map((result) => (
            <button key={result.id} type="button" onClick={() => chooseLocation(result)}><MapPin size={18} /><span><strong>{result.name}</strong><small>{result.label}</small></span></button>
          ))}</div>}

          {selectedLocation?.bbox && <div className="scan-selection">
            <div className="scan-place"><MapPin size={20} /><div><strong>{selectedLocation.name}</strong><span>{selectedLocation.label}</span></div></div>
            <fieldset>
              <legend>Umfang</legend>
              <label><input type="radio" checked={scanMode === "sample"} onChange={() => setScanMode("sample")} /><span><strong>9-Kacheln-Test</strong><small>Schneller Qualitätscheck rund um die Ortsmitte</small></span></label>
              <label><input type="radio" checked={scanMode === "full"} onChange={() => setScanMode("full")} /><span><strong>Gesamte Region</strong><small>Etwa {estimatedTiles.toLocaleString("de-DE")} Luftbild-Kacheln</small></span></label>
            </fieldset>
            <div className="scan-calculation-note"><SolarPanel size={19} /><p>Die KI schätzt sichtbare Modulfläche, Leistung in kWp und Jahresertrag. Die Werte sind eine Orientierung und werden erst nach deiner Prüfung veröffentlicht.</p></div>
            <button className="button button-primary" type="button" disabled={starting || !configured} onClick={startScan}>{starting ? <><SpinnerGap className="spin" />Scan wird angelegt</> : <><SolarPanel />Solar-Scan starten</>}</button>
          </div>}
        </div>
        <div ref={mapContainer} className="scan-map" aria-label="Ausgewähltes Scan-Gebiet und Solar-Funde" />
      </section>

      <section className="scan-results-grid">
        <aside className="scan-job-list admin-panel">
          <div className="admin-panel-heading"><div><h2>Scans</h2><p>Zuletzt gestartete Regionen</p></div></div>
          {jobs.length ? jobs.map((job) => (
            <button key={job.id} type="button" className={selectedJobId === job.id ? "active" : ""} onClick={() => { setSelectedJobId(job.id); setSelectedLocation(null); }}>
              <span><strong>{job.region_name}</strong><small>{job.scan_mode === "sample" ? "9-Kacheln-Test" : "Gesamte Region"}</small></span>
              <i className={`scan-status ${job.status}`}>{statusLabels[job.status]}</i>
            </button>
          )) : <p className="scan-empty-copy">Noch kein Solar-Scan gestartet.</p>}
        </aside>

        <div className="scan-detail admin-panel">
          {activeJob ? <>
            <div className="scan-detail-heading">
              <div><span>Solar-Scan</span><h2>{activeJob.region_name}</h2><p>{activeJob.location_label}</p></div>
              <i className={`scan-status ${activeJob.status}`}>{statusLabels[activeJob.status]}</i>
            </div>
            <div className="scan-progress"><span style={{ width: `${progress}%` }} /></div>
            <div className="scan-metrics">
              <div><strong>{progress}%</strong><span>analysiert</span></div>
              <div><strong>{activeJob.candidate_count}</strong><span>Solar-Funde</span></div>
              <div><strong>{activeJob.confirmed_count}</strong><span>bestätigt</span></div>
              <div><strong>{activeJob.failed_tiles}</strong><span>Fehler</span></div>
            </div>
            {activeJob.failed_tiles > 0 && <button className="button button-secondary scan-retry" type="button" onClick={() => void retryFailed()}><ArrowClockwise />Fehlerhafte Kacheln wiederholen</button>}

            <div className="candidate-list">
              {detail?.candidates.length ? detail.candidates.map((candidate) => (
                <article key={candidate.id} className={`candidate-card ${candidate.review_status}`}>
                  <div className="candidate-heading"><div><span>{kindLabel(candidate.kind)}</span><strong>{Math.round(Number(candidate.confidence) * 100)}% Sicherheit</strong></div><i>{reviewLabel(candidate.review_status)}</i></div>
                  <div className="candidate-values"><span><strong>{Number(candidate.estimated_area_m2).toLocaleString("de-DE", { maximumFractionDigits: 1 })} m²</strong>Modulfläche</span><span><strong>{Number(candidate.estimated_kwp).toLocaleString("de-DE", { maximumFractionDigits: 1 })} kWp</strong>Leistung</span><span><strong>{Number(candidate.annual_yield_kwh).toLocaleString("de-DE", { maximumFractionDigits: 0 })} kWh</strong>pro Jahr</span></div>
                  {candidate.review_status === "pending" && <div className="candidate-actions"><button type="button" className="button button-primary" disabled={reviewingId === candidate.id} onClick={() => void reviewCandidate(candidate.id, "confirm")}><Check />Bestätigen</button><button type="button" className="button button-secondary" disabled={reviewingId === candidate.id} onClick={() => void reviewCandidate(candidate.id, "reject")}><X />Kein Solar</button></div>}
                </article>
              )) : <div className="scan-empty-result">{["queued", "running"].includes(activeJob.status) ? <><SpinnerGap className="spin" /><strong>Analyse läuft</strong><span>Erste Solar-Funde erscheinen automatisch.</span></> : <><Check /><strong>Keine offenen Funde</strong><span>Für diesen Scan sind aktuell keine Anlagen zu prüfen.</span></>}</div>}
            </div>
          </> : <div className="scan-empty-result"><SolarPanel /><strong>Region auswählen</strong><span>Suche links nach Poing oder Markt Schwaben und starte den ersten Scan.</span></div>}
        </div>
      </section>
    </div>
  );
}

function estimateTiles([west, south, east, north]: Bounds, center: [number, number]) {
  const latitudeStep = 320 / 111_320;
  const longitudeStep = 320 / (111_320 * Math.max(0.2, Math.cos(center[1] * Math.PI / 180)));
  return Math.ceil((east - west) / longitudeStep) * Math.ceil((north - south) / latitudeStep);
}

function boundsFeature([west, south, east, north]: Bounds) {
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [[[west, south], [east, south], [east, north], [west, north], [west, south]]] } };
}

function candidatesFeatureCollection(candidates: Candidate[]) {
  return { type: "FeatureCollection" as const, features: candidates.map((candidate) => ({ type: "Feature" as const, id: candidate.id, geometry: candidate.geometry, properties: { reviewStatus: candidate.review_status } })) };
}

function kindLabel(kind: Candidate["kind"]) {
  return kind === "pv" ? "Photovoltaik" : kind === "solar_thermal" ? "Solarthermie" : "Unklarer Solar-Fund";
}

function reviewLabel(status: Candidate["review_status"]) {
  return status === "confirmed" ? "Bestätigt" : status === "rejected" ? "Abgelehnt" : "Zu prüfen";
}
