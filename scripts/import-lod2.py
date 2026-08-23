#!/usr/bin/env python3
"""Stream a Bavarian LoD2 CityGML file into WattBund's PostGIS schema.

Usage:
  pnpm import:lod2 -- --region poing --file data/poing.gml --source-version 2026-08-23

The importer uses only Python's standard library and the local psql client. Raw
coordinates are expected in EPSG:25832, the CRS used by Bavaria's LoD2 export.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import math
import os
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", required=True)
    parser.add_argument("--file", required=True, type=Path)
    parser.add_argument("--source-version", required=True)
    return parser.parse_args()


def points(element: ET.Element) -> list[tuple[float, float, float]]:
    pos_list = element.find(".//{*}posList")
    if pos_list is None or not pos_list.text:
        return []
    values = [float(value) for value in pos_list.text.split()]
    dimension = int(pos_list.attrib.get("srsDimension", "3"))
    if dimension not in (2, 3) or len(values) % dimension:
        return []
    result = []
    for index in range(0, len(values), dimension):
        x, y = values[index], values[index + 1]
        z = values[index + 2] if dimension == 3 else 0.0
        result.append((x, y, z))
    if result and result[0] != result[-1]:
        result.append(result[0])
    return result


def polygon_wkt(ring: list[tuple[float, float, float]]) -> str:
    return "POLYGON((" + ",".join(f"{x:.3f} {y:.3f}" for x, y, _ in ring) + "))"


def surface_metrics(ring: list[tuple[float, float, float]]) -> tuple[float, str, float]:
    if len(ring) < 4:
        return 0.0, "S", 0.0
    nx = ny = nz = area_twice = 0.0
    for first, second in zip(ring, ring[1:]):
        nx += (first[1] - second[1]) * (first[2] + second[2])
        ny += (first[2] - second[2]) * (first[0] + second[0])
        nz += (first[0] - second[0]) * (first[1] + second[1])
    area_twice = math.sqrt(nx * nx + ny * ny + nz * nz)
    area = area_twice / 2
    horizontal = math.sqrt(nx * nx + ny * ny)
    tilt = math.degrees(math.atan2(horizontal, abs(nz))) if area else 0
    azimuth = (math.degrees(math.atan2(nx, ny)) + 360) % 360
    directions = [(0, "N"), (45, "NE"), (90, "E"), (135, "SE"), (180, "S"), (225, "SW"), (270, "W"), (315, "NW")]
    orientation = min(directions, key=lambda item: min(abs(item[0] - azimuth), 360 - abs(item[0] - azimuth)))[1]
    return area, orientation, tilt


def factors(orientation: str, tilt: float) -> tuple[float, float]:
    orientation_factor = {"S": 1.0, "SE": 0.95, "SW": 0.95, "E": 0.85, "W": 0.85, "NE": 0.7, "NW": 0.7, "N": 0.6}[orientation]
    return orientation_factor, 1.0 if 10 <= tilt <= 45 else 0.9


def extract_buildings(path: Path, output: Path) -> tuple[int, int]:
    buildings = roofs = 0
    with output.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["source_feature_id", "footprint_wkt", "roof_area_m2", "estimated_kwp", "annual_yield_kwh", "potential_class"])
        for _, element in ET.iterparse(path, events=("end",)):
            if not element.tag.endswith("Building"):
                continue
            feature_id = next((value for key, value in element.attrib.items() if key.endswith("}id")), f"building-{buildings + 1}")
            ground = element.find(".//{*}GroundSurface") or element.find(".//{*}lod0FootPrint")
            ground_ring = points(ground) if ground is not None else []
            if len(ground_ring) < 4:
                element.clear()
                continue
            total_area = total_yield = 0.0
            for roof in element.findall(".//{*}RoofSurface"):
                ring = points(roof)
                area, orientation, tilt = surface_metrics(ring)
                if area <= 1:
                    continue
                orientation_factor, tilt_factor = factors(orientation, tilt)
                usable_area = area * 0.7
                kwp = usable_area * 0.2
                total_area += usable_area
                total_yield += kwp * 1000 * orientation_factor * tilt_factor
                roofs += 1
            if total_area <= 0:
                element.clear()
                continue
            kwp = total_area * 0.2
            potential_class = "high" if kwp >= 12 else "medium" if kwp >= 7 else "low"
            writer.writerow([feature_id, polygon_wkt(ground_ring), round(total_area, 2), round(kwp, 2), round(total_yield, 2), potential_class])
            buildings += 1
            element.clear()
    return buildings, roofs


def load_postgis(csv_path: Path, args: argparse.Namespace, checksum: str) -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured")
    if not args.region.replace("-", "").isalnum():
        raise RuntimeError("Invalid region slug")
    source_version = args.source_version.replace("'", "''")
    csv_literal = str(csv_path).replace("'", "''")
    sql = f"""
BEGIN;
CREATE TEMP TABLE lod2_stage (
  source_feature_id text, footprint_wkt text, roof_area_m2 numeric,
  estimated_kwp numeric, annual_yield_kwh numeric, potential_class text
);
\\copy lod2_stage FROM '{csv_literal}' WITH (FORMAT csv, HEADER true)
INSERT INTO imports (region_id, source_id, source_version, checksum, status, rows_read, rows_written, started_at, completed_at)
SELECT r.id, ds.id, '{source_version}', '{checksum}', 'completed', (SELECT count(*) FROM lod2_stage),
  (SELECT count(*) FROM lod2_stage), now(), now()
FROM regions r CROSS JOIN data_sources ds WHERE r.slug = '{args.region}' AND ds.key = 'bayern-lod2'
ON CONFLICT (source_id, checksum) DO NOTHING;
WITH source AS (SELECT id FROM data_sources WHERE key = 'bayern-lod2'),
region AS (SELECT id FROM regions WHERE slug = '{args.region}')
INSERT INTO buildings (region_id, source_id, source_feature_id, label, footprint, centroid, source_as_of)
SELECT region.id, source.id, s.source_feature_id, 'Gebäude',
  ST_Transform(ST_SetSRID(ST_GeomFromText(s.footprint_wkt), 25832), 4326),
  ST_Centroid(ST_Transform(ST_SetSRID(ST_GeomFromText(s.footprint_wkt), 25832), 4326)),
  '{source_version}' FROM lod2_stage s CROSS JOIN source CROSS JOIN region
ON CONFLICT (source_id, source_feature_id) DO UPDATE SET footprint = EXCLUDED.footprint,
  centroid = EXCLUDED.centroid, source_as_of = EXCLUDED.source_as_of, updated_at = now();
INSERT INTO solar_estimates (building_id, model_version, suitable_area_m2, estimated_kwp, annual_yield_kwh, potential_class, confidence)
SELECT b.id, 'lod2-orientation-v1', s.roof_area_m2, s.estimated_kwp, s.annual_yield_kwh, s.potential_class, 'indicative'
FROM lod2_stage s JOIN data_sources ds ON ds.key = 'bayern-lod2'
JOIN buildings b ON b.source_id = ds.id AND b.source_feature_id = s.source_feature_id
ON CONFLICT (building_id, model_version) DO UPDATE SET suitable_area_m2 = EXCLUDED.suitable_area_m2,
  estimated_kwp = EXCLUDED.estimated_kwp, annual_yield_kwh = EXCLUDED.annual_yield_kwh,
  potential_class = EXCLUDED.potential_class, calculated_at = now();
COMMIT;
"""
    subprocess.run(["psql", database_url, "-v", "ON_ERROR_STOP=1"], input=sql, text=True, check=True)


def main() -> None:
    args = parse_args()
    checksum = hashlib.sha256(args.file.read_bytes()).hexdigest()
    with tempfile.TemporaryDirectory(prefix="wattbund-lod2-") as directory:
        csv_path = Path(directory) / "buildings.csv"
        building_count, roof_count = extract_buildings(args.file, csv_path)
        if building_count == 0:
            raise RuntimeError("No usable buildings were found in the CityGML file")
        load_postgis(csv_path, args, checksum)
        print(f"Imported {building_count} buildings and analyzed {roof_count} roof surfaces")


if __name__ == "__main__":
    main()
