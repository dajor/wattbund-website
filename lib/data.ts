import { demoBuildings, demoProfiles, demoRegions } from "@/lib/demo-data";
import { pool } from "@/lib/db";
import type { BuildingProperties, PublicProfile, Region } from "@/lib/types";

export async function listRegions(): Promise<Region[]> {
  if (!pool) return demoRegions;
  try {
    const result = await pool.query(`
      SELECT r.id, r.slug, r.name, r.state, r.municipality_code,
        ST_X(r.center) AS longitude, ST_Y(r.center) AS latitude, r.bounds,
        r.status, r.model_version, r.specific_yield_kwh_per_kwp,
        COUNT(DISTINCT b.id)::int AS buildings_analyzed,
        COUNT(DISTINCT b.id) FILTER (WHERE se.estimated_kwp > 0)::int AS suitable_roofs,
        COALESCE(SUM(DISTINCT se.estimated_kwp), 0)::float AS estimated_capacity_kwp,
        COALESCE(SUM(DISTINCT se.annual_yield_kwh), 0)::float AS estimated_annual_yield_kwh,
        COALESCE((SELECT SUM(installed_capacity_kwp) FROM regional_solar_stats rss WHERE rss.region_id = r.id), 0)::float AS installed_capacity_kwp,
        COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'published')::int AS published_profiles
      FROM regions r
      LEFT JOIN buildings b ON b.region_id = r.id
      LEFT JOIN solar_estimates se ON se.building_id = b.id AND se.model_version = r.model_version
      LEFT JOIN profiles p ON p.region_id = r.id
      WHERE r.status = 'published'
      GROUP BY r.id
      ORDER BY r.name
    `);
    return result.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      state: row.state,
      municipalityCode: row.municipality_code,
      center: [Number(row.longitude), Number(row.latitude)],
      bounds: row.bounds,
      status: row.status,
      modelVersion: row.model_version,
      specificYieldKwhPerKwp: Number(row.specific_yield_kwh_per_kwp),
      summary: {
        buildingsAnalyzed: row.buildings_analyzed,
        suitableRoofs: row.suitable_roofs,
        estimatedCapacityKwp: row.estimated_capacity_kwp,
        estimatedAnnualYieldKwh: row.estimated_annual_yield_kwh,
        installedCapacityKwp: row.installed_capacity_kwp,
        publishedProfiles: row.published_profiles,
        dataAsOf: new Date().toISOString().slice(0, 10)
      }
    }));
  } catch (error) {
    console.error("Could not query regions, using demo data", error);
    return demoRegions;
  }
}

export async function getRegion(slug: string) {
  return (await listRegions()).find((region) => region.slug === slug) ?? null;
}

export async function getBuildingsGeoJson(regionSlug: string, bbox?: [number, number, number, number]) {
  if (!pool) return demoBuildingsGeoJson(regionSlug, bbox);
  try {
    const bounds = bbox ?? [-180, -90, 180, 90];
    const result = await pool.query(
      `SELECT b.id, b.label, r.slug AS region_slug, se.suitable_area_m2,
        se.estimated_kwp, se.annual_yield_kwh, se.potential_class, se.confidence,
        se.model_version, ds.name AS source_name, b.source_as_of,
        ST_AsGeoJSON(b.footprint)::json AS geometry
      FROM buildings b
      JOIN regions r ON r.id = b.region_id
      JOIN solar_estimates se ON se.building_id = b.id AND se.model_version = r.model_version
      JOIN data_sources ds ON ds.id = b.source_id
      WHERE r.slug = $1 AND r.status = 'published'
        AND b.footprint && ST_MakeEnvelope($2, $3, $4, $5, 4326)
      ORDER BY b.id LIMIT 5000`,
      [regionSlug, ...bounds]
    );
    return {
      type: "FeatureCollection" as const,
      features: result.rows.map((row) => ({
        type: "Feature" as const,
        id: row.id,
        geometry: row.geometry,
        properties: {
          id: row.id,
          regionSlug: row.region_slug,
          label: row.label,
          suitableAreaM2: Number(row.suitable_area_m2),
          estimatedKwp: Number(row.estimated_kwp),
          annualYieldKwh: Number(row.annual_yield_kwh),
          potentialClass: row.potential_class,
          confidence: row.confidence,
          modelVersion: row.model_version,
          sourceName: row.source_name,
          sourceAsOf: row.source_as_of
        } satisfies BuildingProperties
      }))
    };
  } catch (error) {
    console.error("Could not query buildings, using demo data", error);
    return demoBuildingsGeoJson(regionSlug, bbox);
  }
}

export async function getBuilding(id: string): Promise<BuildingProperties | null> {
  const fallback = demoBuildings.find((building) => building.id === id) ?? null;
  if (!pool) return fallback;
  try {
    const result = await pool.query(
      `SELECT b.id, b.label, r.slug AS region_slug, se.suitable_area_m2,
        se.estimated_kwp, se.annual_yield_kwh, se.potential_class, se.confidence,
        se.model_version, ds.name AS source_name, b.source_as_of
      FROM buildings b JOIN regions r ON r.id = b.region_id
      JOIN solar_estimates se ON se.building_id = b.id AND se.model_version = r.model_version
      JOIN data_sources ds ON ds.id = b.source_id
      WHERE b.id = $1 AND r.status = 'published' LIMIT 1`,
      [id]
    );
    const row = result.rows[0];
    return row ? {
      id: row.id,
      regionSlug: row.region_slug,
      label: row.label,
      suitableAreaM2: Number(row.suitable_area_m2),
      estimatedKwp: Number(row.estimated_kwp),
      annualYieldKwh: Number(row.annual_yield_kwh),
      potentialClass: row.potential_class,
      confidence: row.confidence,
      modelVersion: row.model_version,
      sourceName: row.source_name,
      sourceAsOf: row.source_as_of
    } : fallback;
  } catch {
    return fallback;
  }
}

export async function listPublicProfiles(regionSlug: string, bbox?: [number, number, number, number]): Promise<PublicProfile[]> {
  if (!pool) return filterDemoProfiles(regionSlug, bbox);
  try {
    const bounds = bbox ?? [-180, -90, 180, 90];
    const result = await pool.query(
      `SELECT p.id, r.slug AS region_slug, p.role, p.display_name, p.description,
        p.pv_status, p.capacity_kwp, ST_X(pl.point) AS longitude, ST_Y(pl.point) AS latitude
      FROM profiles p
      JOIN regions r ON r.id = p.region_id
      JOIN profile_public_locations pl ON pl.profile_id = p.id
      WHERE p.status = 'published' AND p.publish_consent = true AND r.slug = $1
        AND pl.point && ST_MakeEnvelope($2, $3, $4, $5, 4326)
      ORDER BY p.published_at DESC LIMIT 1000`,
      [regionSlug, ...bounds]
    );
    return result.rows.map((row) => ({
      id: row.id,
      regionSlug: row.region_slug,
      role: row.role,
      displayName: row.display_name,
      description: row.description,
      pvStatus: row.pv_status,
      capacityKwp: row.capacity_kwp == null ? null : Number(row.capacity_kwp),
      coordinates: [Number(row.longitude), Number(row.latitude)]
    }));
  } catch {
    return filterDemoProfiles(regionSlug, bbox);
  }
}

function demoBuildingsGeoJson(regionSlug: string, bbox?: [number, number, number, number]) {
  return {
    type: "FeatureCollection" as const,
    features: demoBuildings
      .filter((building) => building.regionSlug === regionSlug)
      .filter((building) => !bbox || pointInBbox(building.polygon[0][0] as [number, number], bbox))
      .map(({ polygon, ...properties }) => ({
        type: "Feature" as const,
        id: properties.id,
        geometry: { type: "Polygon" as const, coordinates: polygon },
        properties
      }))
  };
}

function filterDemoProfiles(regionSlug: string, bbox?: [number, number, number, number]) {
  return demoProfiles.filter((profile) => profile.regionSlug === regionSlug && (!bbox || pointInBbox(profile.coordinates, bbox)));
}

function pointInBbox([longitude, latitude]: [number, number], [west, south, east, north]: [number, number, number, number]) {
  return longitude >= west && longitude <= east && latitude >= south && latitude <= north;
}
