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
