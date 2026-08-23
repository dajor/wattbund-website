CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

DO $$ BEGIN CREATE TYPE region_status AS ENUM ('draft', 'published', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE profile_role AS ENUM ('producer', 'consumer', 'business', 'partner'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE profile_status AS ENUM ('draft', 'pending', 'published', 'rejected', 'hidden'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pv_status AS ENUM ('none', 'planned', 'active'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE import_status AS ENUM ('queued', 'running', 'completed', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, email text NOT NULL UNIQUE,
  email_verified timestamptz, image text, role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(), deleted_at timestamptz
);
CREATE TABLE IF NOT EXISTS accounts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, type text NOT NULL,
  provider text NOT NULL, provider_account_id text NOT NULL, refresh_token text,
  access_token text, expires_at integer, token_type text, scope text, id_token text,
  session_state text, PRIMARY KEY(provider, provider_account_id)
);
CREATE TABLE IF NOT EXISTS sessions (
  session_token text PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier text NOT NULL, token text NOT NULL, expires timestamptz NOT NULL,
  PRIMARY KEY(identifier, token)
);

CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, name text NOT NULL,
  state text NOT NULL DEFAULT 'Bayern', municipality_code text NOT NULL UNIQUE,
  boundary geometry(MultiPolygon,4326) NOT NULL, center geometry(Point,4326) NOT NULL,
  bounds jsonb NOT NULL, status region_status NOT NULL DEFAULT 'draft',
  model_version text NOT NULL DEFAULT 'lod2-orientation-v1',
  specific_yield_kwh_per_kwp numeric(8,2) NOT NULL DEFAULT 1000,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS regions_boundary_gix ON regions USING gist(boundary);

CREATE TABLE IF NOT EXISTS data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), key text NOT NULL UNIQUE, name text NOT NULL,
  provider text NOT NULL, license_name text NOT NULL, license_url text NOT NULL,
  source_url text NOT NULL, attribution text NOT NULL
);
CREATE TABLE IF NOT EXISTS imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), region_id uuid REFERENCES regions(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES data_sources(id), source_version text NOT NULL,
  checksum text NOT NULL, artifact_key text, status import_status NOT NULL DEFAULT 'queued',
  rows_read integer NOT NULL DEFAULT 0, rows_written integer NOT NULL DEFAULT 0,
  started_at timestamptz, completed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(source_id, checksum)
);
CREATE TABLE IF NOT EXISTS import_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), import_id uuid NOT NULL REFERENCES imports(id) ON DELETE CASCADE,
  source_feature_id text, message text NOT NULL, details jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS buildings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), region_id uuid NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES data_sources(id), source_feature_id text NOT NULL,
  label text NOT NULL DEFAULT 'Gebäude', footprint geometry(Polygon,4326) NOT NULL,
  centroid geometry(Point,4326) NOT NULL, building_type text, source_as_of text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(source_id, source_feature_id)
);
CREATE INDEX IF NOT EXISTS buildings_region_idx ON buildings(region_id);
CREATE INDEX IF NOT EXISTS buildings_footprint_gix ON buildings USING gist(footprint);
CREATE TABLE IF NOT EXISTS roof_surfaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  source_feature_id text NOT NULL, geometry geometry(PolygonZ,4326) NOT NULL,
  area_m2 numeric(12,2) NOT NULL, tilt_degrees numeric(5,2) NOT NULL,
  azimuth_degrees numeric(6,2) NOT NULL, orientation text NOT NULL, suitable boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS roof_surfaces_building_idx ON roof_surfaces(building_id);
CREATE TABLE IF NOT EXISTS solar_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), building_id uuid NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
  model_version text NOT NULL, suitable_area_m2 numeric(12,2) NOT NULL,
  estimated_kwp numeric(12,2) NOT NULL, annual_yield_kwh numeric(14,2) NOT NULL,
  potential_class text NOT NULL, confidence text NOT NULL DEFAULT 'indicative',
  calculated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(building_id, model_version)
);
CREATE TABLE IF NOT EXISTS regional_solar_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), region_id uuid NOT NULL REFERENCES regions(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES data_sources(id), source_version text NOT NULL,
  installations integer NOT NULL, installed_capacity_kwp numeric(14,2) NOT NULL,
  data_as_of timestamptz NOT NULL, UNIQUE(region_id, source_id, source_version)
);

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES regions(id), display_name text NOT NULL, role profile_role NOT NULL,
  description text, pv_status pv_status, capacity_kwp numeric(10,2),
  status profile_status NOT NULL DEFAULT 'draft', publish_consent boolean NOT NULL DEFAULT false,
  submitted_at timestamptz, published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_region_status_idx ON profiles(region_id,status);
CREATE TABLE IF NOT EXISTS profile_private_locations (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  address_ciphertext text NOT NULL, longitude_ciphertext text NOT NULL,
  latitude_ciphertext text NOT NULL, key_version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS profile_public_locations (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  point geometry(Point,4326) NOT NULL, displacement_meters integer NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profile_public_locations_point_gix ON profile_public_locations USING gist(point);
CREATE TABLE IF NOT EXISTS profile_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_user_id uuid NOT NULL REFERENCES users(id), decision text NOT NULL, reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL, version text NOT NULL, granted boolean NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL, target_type text NOT NULL, target_id text NOT NULL,
  metadata jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
