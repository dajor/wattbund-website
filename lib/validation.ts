import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  role: z.enum(["producer", "consumer", "business", "partner"]),
  regionSlug: z.string().trim().min(2).max(80).regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(500).optional().default(""),
  pvStatus: z.enum(["none", "planned", "active"]).optional(),
  capacityKwp: z.coerce.number().min(0).max(100000).optional(),
  address: z.string().trim().min(5).max(200),
  publishConsent: z.literal(true)
});

export const reviewSchema = z.object({
  profileId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(500).optional().default("")
});

export const regionInterestSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  postalCode: z.string().trim().regex(/^\d{5}$/),
  role: z.enum(["producer", "consumer", "business", "solar_partner", "municipality", "initiator"]),
  privacyConsent: z.literal(true),
  website: z.string().max(200).optional().default(""),
  sourceRoute: z.string().trim().max(120).optional()
}).strict();

export const regionDemandStageSchema = z.object({
  postalCode: z.string().regex(/^\d{5}$/),
  stage: z.enum(["watch", "contact", "pilot"])
}).strict();

export const funnelEventSchema = z.object({
  name: z.enum(["persona_cta", "region_form_opened", "region_form_submitted", "email_confirmed", "profile_created"]),
  sourceRoute: z.string().trim().max(120).optional(),
  persona: z.string().trim().max(40).regex(/^[a-z0-9_-]+$/).optional(),
  anonymousSessionId: z.string().uuid().optional()
}).strict();

export const locationSearchSchema = z.string().trim().min(2).max(100);

const longitudeSchema = z.number().finite().min(-180).max(180);
const latitudeSchema = z.number().finite().min(-90).max(90);

export const solarScanJobSchema = z.object({
  externalPlaceId: z.string().trim().max(200).optional(),
  regionName: z.string().trim().min(2).max(120),
  locationLabel: z.string().trim().min(2).max(240),
  center: z.tuple([longitudeSchema, latitudeSchema]),
  bbox: z.tuple([longitudeSchema, latitudeSchema, longitudeSchema, latitudeSchema]),
  scanMode: z.enum(["sample", "full"])
}).strict().refine(({ bbox }) => bbox[0] < bbox[2] && bbox[1] < bbox[3], {
  message: "Ungültiger Kartenausschnitt",
  path: ["bbox"]
});

export const solarCandidateReviewSchema = z.object({
  decision: z.enum(["confirm", "reject"])
}).strict();

const polygonSchema = z.object({
  type: z.literal("Polygon"),
  coordinates: z.array(z.array(z.tuple([longitudeSchema, latitudeSchema])).min(4)).min(1)
}).strict();

export const solarScanCallbackSchema = z.object({
  jobId: z.string().uuid(),
  tileId: z.string().uuid(),
  success: z.boolean(),
  retrievedAt: z.string().datetime().optional(),
  detections: z.array(z.object({
    detectionIndex: z.number().int().min(0).max(500),
    kind: z.enum(["pv", "solar_thermal", "uncertain"]),
    confidence: z.number().finite().min(0).max(1),
    geometry: polygonSchema,
    estimatedAreaM2: z.number().finite().min(0).max(100000),
    estimatedKwp: z.number().finite().min(0).max(50000),
    annualYieldKwh: z.number().finite().min(0).max(100000000),
    raw: z.unknown().optional()
  }).strict()).max(500).optional().default([]),
  error: z.string().trim().max(2000).optional()
}).strict();
