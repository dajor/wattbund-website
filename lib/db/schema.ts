import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

const geometry = customType<{ data: string }>({
  dataType(rawConfig) {
    const config = rawConfig as { type?: string; srid?: number } | undefined;
    const type = config?.type ?? "Geometry";
    const srid = config?.srid ?? 4326;
    return `geometry(${type},${srid})`;
  }
});

export const regionStatus = pgEnum("region_status", ["draft", "published", "archived"]);
export const profileRole = pgEnum("profile_role", ["producer", "consumer", "business", "partner"]);
export const profileStatus = pgEnum("profile_status", ["draft", "pending", "published", "rejected", "hidden"]);
export const pvStatus = pgEnum("pv_status", ["none", "planned", "active"]);
export const importStatus = pgEnum("import_status", ["queued", "running", "completed", "failed"]);
export const regionInterestRole = pgEnum("region_interest_role", ["producer", "consumer", "business", "solar_partner", "municipality", "initiator"]);
export const regionInterestStatus = pgEnum("region_interest_status", ["pending", "confirmed"]);
export const regionDemandStage = pgEnum("region_demand_stage", ["watch", "contact", "pilot"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { withTimezone: true, mode: "date" }),
  image: text("image"),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state")
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull()
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true, mode: "date" }).notNull()
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

export const regions = pgTable("regions", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  state: text("state").notNull().default("Bayern"),
  municipalityCode: text("municipality_code").notNull().unique(),
  boundary: geometry("boundary", { type: "MultiPolygon", srid: 4326 }).notNull(),
  center: geometry("center", { type: "Point", srid: 4326 }).notNull(),
  bounds: jsonb("bounds").notNull(),
  status: regionStatus("status").notNull().default("draft"),
  modelVersion: text("model_version").notNull().default("lod2-orientation-v1"),
  specificYieldKwhPerKwp: numeric("specific_yield_kwh_per_kwp", { precision: 8, scale: 2 }).notNull().default("1000"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("regions_boundary_gix").using("gist", table.boundary)]);

export const dataSources = pgTable("data_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  licenseName: text("license_name").notNull(),
  licenseUrl: text("license_url").notNull(),
  sourceUrl: text("source_url").notNull(),
  attribution: text("attribution").notNull()
});

export const imports = pgTable("imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  regionId: uuid("region_id").references(() => regions.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => dataSources.id),
  sourceVersion: text("source_version").notNull(),
  checksum: text("checksum").notNull(),
  artifactKey: text("artifact_key"),
  status: importStatus("status").notNull().default("queued"),
  rowsRead: integer("rows_read").notNull().default(0),
  rowsWritten: integer("rows_written").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [uniqueIndex("imports_source_checksum_uidx").on(table.sourceId, table.checksum)]);

export const importErrors = pgTable("import_errors", {
  id: uuid("id").defaultRandom().primaryKey(),
  importId: uuid("import_id").notNull().references(() => imports.id, { onDelete: "cascade" }),
  sourceFeatureId: text("source_feature_id"),
  message: text("message").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const buildings = pgTable("buildings", {
  id: uuid("id").defaultRandom().primaryKey(),
  regionId: uuid("region_id").notNull().references(() => regions.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => dataSources.id),
  sourceFeatureId: text("source_feature_id").notNull(),
  label: text("label").notNull().default("Gebäude"),
  footprint: geometry("footprint", { type: "Polygon", srid: 4326 }).notNull(),
  centroid: geometry("centroid", { type: "Point", srid: 4326 }).notNull(),
  buildingType: text("building_type"),
  sourceAsOf: text("source_as_of").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  uniqueIndex("buildings_source_feature_uidx").on(table.sourceId, table.sourceFeatureId),
  index("buildings_region_idx").on(table.regionId),
  index("buildings_footprint_gix").using("gist", table.footprint)
]);

export const roofSurfaces = pgTable("roof_surfaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  buildingId: uuid("building_id").notNull().references(() => buildings.id, { onDelete: "cascade" }),
  sourceFeatureId: text("source_feature_id").notNull(),
  geometry: geometry("geometry", { type: "PolygonZ", srid: 4326 }).notNull(),
  areaM2: numeric("area_m2", { precision: 12, scale: 2 }).notNull(),
  tiltDegrees: numeric("tilt_degrees", { precision: 5, scale: 2 }).notNull(),
  azimuthDegrees: numeric("azimuth_degrees", { precision: 6, scale: 2 }).notNull(),
  orientation: text("orientation").notNull(),
  suitable: boolean("suitable").notNull().default(true)
}, (table) => [index("roof_surfaces_building_idx").on(table.buildingId)]);

export const solarEstimates = pgTable("solar_estimates", {
  id: uuid("id").defaultRandom().primaryKey(),
  buildingId: uuid("building_id").notNull().references(() => buildings.id, { onDelete: "cascade" }),
  modelVersion: text("model_version").notNull(),
  suitableAreaM2: numeric("suitable_area_m2", { precision: 12, scale: 2 }).notNull(),
  estimatedKwp: numeric("estimated_kwp", { precision: 12, scale: 2 }).notNull(),
  annualYieldKwh: numeric("annual_yield_kwh", { precision: 14, scale: 2 }).notNull(),
  potentialClass: text("potential_class").notNull(),
  confidence: text("confidence").notNull().default("indicative"),
  calculatedAt: timestamp("calculated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [uniqueIndex("solar_estimates_building_model_uidx").on(table.buildingId, table.modelVersion)]);

export const regionalSolarStats = pgTable("regional_solar_stats", {
  id: uuid("id").defaultRandom().primaryKey(),
  regionId: uuid("region_id").notNull().references(() => regions.id, { onDelete: "cascade" }),
  sourceId: uuid("source_id").notNull().references(() => dataSources.id),
  sourceVersion: text("source_version").notNull(),
  installations: integer("installations").notNull(),
  installedCapacityKwp: numeric("installed_capacity_kwp", { precision: 14, scale: 2 }).notNull(),
  dataAsOf: timestamp("data_as_of", { withTimezone: true }).notNull()
}, (table) => [uniqueIndex("regional_stats_region_source_version_uidx").on(table.regionId, table.sourceId, table.sourceVersion)]);

export const profiles = pgTable("profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  regionId: uuid("region_id").notNull().references(() => regions.id),
  displayName: text("display_name").notNull(),
  role: profileRole("role").notNull(),
  description: text("description"),
  pvStatus: pvStatus("pv_status"),
  capacityKwp: numeric("capacity_kwp", { precision: 10, scale: 2 }),
  status: profileStatus("status").notNull().default("draft"),
  publishConsent: boolean("publish_consent").notNull().default(false),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("profiles_region_status_idx").on(table.regionId, table.status)]);

export const profilePrivateLocations = pgTable("profile_private_locations", {
  profileId: uuid("profile_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  addressCiphertext: text("address_ciphertext").notNull(),
  longitudeCiphertext: text("longitude_ciphertext").notNull(),
  latitudeCiphertext: text("latitude_ciphertext").notNull(),
  keyVersion: integer("key_version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const profilePublicLocations = pgTable("profile_public_locations", {
  profileId: uuid("profile_id").primaryKey().references(() => profiles.id, { onDelete: "cascade" }),
  point: geometry("point", { type: "Point", srid: 4326 }).notNull(),
  displacementMeters: integer("displacement_meters").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("profile_public_locations_point_gix").using("gist", table.point)]);

export const profileReviews = pgTable("profile_reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  reviewerUserId: uuid("reviewer_user_id").notNull().references(() => users.id),
  decision: text("decision").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const consents = pgTable("consents", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  version: text("version").notNull(),
  granted: boolean("granted").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow()
});

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const regionInterests = pgTable("region_interests", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  postalCode: text("postal_code").notNull(),
  role: regionInterestRole("role").notNull(),
  status: regionInterestStatus("status").notNull().default("pending"),
  municipality: text("municipality"),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  consentVersion: text("consent_version").notNull(),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
  verificationTokenHash: text("verification_token_hash"),
  verificationExpiresAt: timestamp("verification_expires_at", { withTimezone: true }),
  manageTokenHash: text("manage_token_hash"),
  lastConfirmationSentAt: timestamp("last_confirmation_sent_at", { withTimezone: true }),
  sendAttempts: integer("send_attempts").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  consentExpiresAt: timestamp("consent_expires_at", { withTimezone: true })
}, (table) => [
  uniqueIndex("region_interests_email_postal_uidx").on(table.email, table.postalCode),
  index("region_interests_status_postal_idx").on(table.status, table.postalCode),
  uniqueIndex("region_interests_verification_token_uidx").on(table.verificationTokenHash),
  uniqueIndex("region_interests_manage_token_uidx").on(table.manageTokenHash)
]);

export const regionDemandReviews = pgTable("region_demand_reviews", {
  postalCode: text("postal_code").primaryKey(),
  stage: regionDemandStage("stage").notNull().default("watch"),
  updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const funnelEvents = pgTable("funnel_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  sourceRoute: text("source_route"),
  persona: text("persona"),
  anonymousSessionId: uuid("anonymous_session_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [index("funnel_events_name_created_idx").on(table.name, table.createdAt)]);
