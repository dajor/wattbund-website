DO $$ BEGIN CREATE TYPE solar_analysis_job_status AS ENUM ('queued', 'running', 'review', 'completed', 'failed', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE solar_analysis_tile_status AS ENUM ('queued', 'running', 'completed', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE solar_detection_type AS ENUM ('pv', 'solar_thermal', 'uncertain'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE solar_candidate_review_status AS ENUM ('pending', 'confirmed', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS solar_analysis_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_place_id text,
  region_name text NOT NULL,
  location_label text NOT NULL,
  center geometry(Point,4326) NOT NULL,
  bounds jsonb NOT NULL,
  scan_mode text NOT NULL DEFAULT 'full' CHECK (scan_mode IN ('sample', 'full')),
  source_key text NOT NULL DEFAULT 'bayern-dop20',
  model text NOT NULL DEFAULT 'qwen3.8-max',
  status solar_analysis_job_status NOT NULL DEFAULT 'queued',
  total_tiles integer NOT NULL DEFAULT 0,
  completed_tiles integer NOT NULL DEFAULT 0,
  failed_tiles integer NOT NULL DEFAULT 0,
  candidate_count integer NOT NULL DEFAULT 0,
  confirmed_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS solar_analysis_jobs_status_created_idx ON solar_analysis_jobs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS solar_analysis_jobs_center_gix ON solar_analysis_jobs USING gist(center);

CREATE TABLE IF NOT EXISTS solar_analysis_tiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES solar_analysis_jobs(id) ON DELETE CASCADE,
  tile_key text NOT NULL,
  bounds jsonb NOT NULL,
  status solar_analysis_tile_status NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  UNIQUE(job_id, tile_key)
);
CREATE INDEX IF NOT EXISTS solar_analysis_tiles_job_status_idx ON solar_analysis_tiles(job_id, status);

CREATE TABLE IF NOT EXISTS solar_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES solar_analysis_jobs(id) ON DELETE CASCADE,
  tile_id uuid NOT NULL REFERENCES solar_analysis_tiles(id) ON DELETE CASCADE,
  detection_index integer NOT NULL,
  kind solar_detection_type NOT NULL,
  confidence numeric(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  geometry geometry(Polygon,4326) NOT NULL,
  estimated_area_m2 numeric(12,2) NOT NULL CHECK (estimated_area_m2 >= 0),
  estimated_kwp numeric(12,2) NOT NULL CHECK (estimated_kwp >= 0),
  annual_yield_kwh numeric(14,2) NOT NULL CHECK (annual_yield_kwh >= 0),
  raw_result jsonb,
  review_status solar_candidate_review_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tile_id, detection_index)
);
CREATE INDEX IF NOT EXISTS solar_candidates_job_review_idx ON solar_candidates(job_id, review_status);
CREATE INDEX IF NOT EXISTS solar_candidates_geometry_gix ON solar_candidates USING gist(geometry);

CREATE TABLE IF NOT EXISTS solar_installations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL UNIQUE REFERENCES solar_candidates(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES solar_analysis_jobs(id) ON DELETE CASCADE,
  region_name text NOT NULL,
  kind solar_detection_type NOT NULL,
  geometry geometry(Polygon,4326) NOT NULL,
  estimated_area_m2 numeric(12,2) NOT NULL,
  capacity_kwp numeric(12,2) NOT NULL,
  annual_yield_kwh numeric(14,2) NOT NULL,
  source_name text NOT NULL DEFAULT 'Bayern DOP20',
  source_as_of text NOT NULL,
  model text NOT NULL,
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS solar_installations_geometry_gix ON solar_installations USING gist(geometry);
CREATE INDEX IF NOT EXISTS solar_installations_published_idx ON solar_installations(published);

INSERT INTO data_sources (key, name, provider, license_name, license_url, source_url, attribution)
VALUES (
  'bayern-dop20',
  'Digitale Orthophotos DOP20',
  'Bayerische Vermessungsverwaltung',
  'CC BY 4.0',
  'https://creativecommons.org/licenses/by/4.0/',
  'https://geoservices.bayern.de/od/wms/dop/v1/dop20',
  'Datenquelle: Bayerische Vermessungsverwaltung – DOP20'
)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  provider = EXCLUDED.provider,
  license_name = EXCLUDED.license_name,
  license_url = EXCLUDED.license_url,
  source_url = EXCLUDED.source_url,
  attribution = EXCLUDED.attribution;
