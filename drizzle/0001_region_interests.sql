DO $$ BEGIN CREATE TYPE region_interest_role AS ENUM ('producer', 'consumer', 'business', 'solar_partner', 'municipality', 'initiator'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE region_interest_status AS ENUM ('pending', 'confirmed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE region_demand_stage AS ENUM ('watch', 'contact', 'pilot'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS region_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  postal_code text NOT NULL CHECK (postal_code ~ '^[0-9]{5}$'),
  role region_interest_role NOT NULL,
  status region_interest_status NOT NULL DEFAULT 'pending',
  municipality text,
  longitude numeric(9,6),
  latitude numeric(9,6),
  consent_version text NOT NULL,
  consented_at timestamptz NOT NULL DEFAULT now(),
  verification_token_hash text,
  verification_expires_at timestamptz,
  manage_token_hash text,
  last_confirmation_sent_at timestamptz,
  send_attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  consent_expires_at timestamptz,
  UNIQUE (email, postal_code),
  UNIQUE (verification_token_hash),
  UNIQUE (manage_token_hash)
);
CREATE INDEX IF NOT EXISTS region_interests_status_postal_idx ON region_interests(status, postal_code);
ALTER TABLE region_interests ADD COLUMN IF NOT EXISTS consent_expires_at timestamptz;

CREATE TABLE IF NOT EXISTS region_demand_reviews (
  postal_code text PRIMARY KEY CHECK (postal_code ~ '^[0-9]{5}$'),
  stage region_demand_stage NOT NULL DEFAULT 'watch',
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS funnel_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_route text,
  persona text,
  anonymous_session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS funnel_events_name_created_idx ON funnel_events(name, created_at);
