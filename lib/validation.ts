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
