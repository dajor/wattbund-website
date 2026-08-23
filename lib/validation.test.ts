import { describe, expect, it } from "vitest";
import { profileSchema } from "@/lib/validation";

describe("profileSchema", () => {
  const valid = {
    displayName: "Solarfreund aus Poing",
    role: "producer",
    regionSlug: "poing",
    description: "Ich möchte lokale Energie teilen.",
    pvStatus: "active",
    capacityKwp: 9.8,
    address: "Hauptstraße 10, 85586 Poing",
    publishConsent: true
  };

  it("accepts a complete voluntary profile", () => {
    expect(profileSchema.safeParse(valid).success).toBe(true);
  });

  it("requires explicit publication consent", () => {
    expect(profileSchema.safeParse({ ...valid, publishConsent: false }).success).toBe(false);
  });

  it("rejects oversized descriptions", () => {
    expect(profileSchema.safeParse({ ...valid, description: "x".repeat(501) }).success).toBe(false);
  });
});
