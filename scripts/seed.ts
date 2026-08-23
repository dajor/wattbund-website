import { demoBuildings, demoRegions } from "@/lib/demo-data";
import { requirePool } from "@/lib/db";

async function main() {
  const pool = requirePool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const source = await client.query(
      `INSERT INTO data_sources (key, name, provider, license_name, license_url, source_url, attribution)
       VALUES ('wattbund-demo', 'WattBund Beispieldaten', 'WattBund', 'Nur Entwicklung',
         'https://wattbund.de/legal', 'https://wattbund.de', 'WattBund Beispieldaten')
       ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name RETURNING id`
    );
    await client.query(
      `INSERT INTO data_sources (key, name, provider, license_name, license_url, source_url, attribution)
       VALUES ('bayern-lod2', '3D-Gebäudemodelle LoD2', 'Bayerische Vermessungsverwaltung', 'CC BY 4.0',
         'https://creativecommons.org/licenses/by/4.0/', 'https://geodaten.bayern.de/opengeodata/OpenDataDetail.html?pn=lod2',
         'Datenquelle: Bayerische Vermessungsverwaltung')
       ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name`
    );
    await client.query(
      `INSERT INTO data_sources (key, name, provider, license_name, license_url, source_url, attribution)
       VALUES ('mastr', 'Marktstammdatenregister', 'Bundesnetzagentur', 'Datenlizenz Deutschland Namensnennung 2.0',
         'https://www.govdata.de/dl-de/by-2-0', 'https://www.marktstammdatenregister.de/MaStR/Datendownload',
         'Datenquelle: Marktstammdatenregister der Bundesnetzagentur')
       ON CONFLICT (key) DO UPDATE SET name = EXCLUDED.name`
    );

    for (const region of demoRegions) {
      const [[west, south], [east, north]] = region.bounds;
      await client.query(
        `INSERT INTO regions (id, slug, name, state, municipality_code, boundary, center, bounds, status, model_version, specific_yield_kwh_per_kwp)
         VALUES ($1, $2, $3, $4, $5,
           ST_Multi(ST_MakeEnvelope($6, $7, $8, $9, 4326)), ST_SetSRID(ST_MakePoint($10, $11), 4326),
           $12::jsonb, 'published', $13, $14)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, boundary = EXCLUDED.boundary,
           center = EXCLUDED.center, bounds = EXCLUDED.bounds, model_version = EXCLUDED.model_version,
           specific_yield_kwh_per_kwp = EXCLUDED.specific_yield_kwh_per_kwp, updated_at = now()`,
        [region.id, region.slug, region.name, region.state, region.municipalityCode, west, south, east, north, region.center[0], region.center[1], JSON.stringify(region.bounds), region.modelVersion, region.specificYieldKwhPerKwp]
      );
    }

    const sourceId = source.rows[0].id;
    for (const building of demoBuildings) {
      const region = demoRegions.find((item) => item.slug === building.regionSlug)!;
      const geometry = JSON.stringify({ type: "Polygon", coordinates: building.polygon });
      const inserted = await client.query(
        `INSERT INTO buildings (region_id, source_id, source_feature_id, label, footprint, centroid, source_as_of)
         VALUES ($1, $2, $3, $4, ST_SetSRID(ST_GeomFromGeoJSON($5), 4326),
           ST_Centroid(ST_SetSRID(ST_GeomFromGeoJSON($5), 4326)), $6)
         ON CONFLICT (source_id, source_feature_id) DO UPDATE SET footprint = EXCLUDED.footprint,
           centroid = EXCLUDED.centroid, updated_at = now() RETURNING id`,
        [region.id, sourceId, building.id, building.label, geometry, building.sourceAsOf]
      );
      await client.query(
        `INSERT INTO solar_estimates (building_id, model_version, suitable_area_m2, estimated_kwp, annual_yield_kwh, potential_class, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, 'indicative')
         ON CONFLICT (building_id, model_version) DO UPDATE SET suitable_area_m2 = EXCLUDED.suitable_area_m2,
           estimated_kwp = EXCLUDED.estimated_kwp, annual_yield_kwh = EXCLUDED.annual_yield_kwh,
           potential_class = EXCLUDED.potential_class, calculated_at = now()`,
        [inserted.rows[0].id, building.modelVersion, building.suitableAreaM2, building.estimatedKwp, building.annualYieldKwh, building.potentialClass]
      );
    }
    await client.query("COMMIT");
    console.log("Seeded Poing and Vaterstetten with clearly labelled example data");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
