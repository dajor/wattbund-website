import { describe, expect, it } from "vitest";
import { createOpaqueToken, hashToken, normalizeEmail } from "@/lib/region-interests";
import { funnelEventSchema, regionDemandStageSchema, regionInterestSchema } from "@/lib/validation";

describe("region interest validation", () => {
  const valid = { email: "  Solar@Beispiel.de ", postalCode: "85586", role: "producer", privacyConsent: true, website: "" };

  it("normalizes a valid nationwide interest", () => {
    const parsed = regionInterestSchema.parse(valid);
    expect(parsed.email).toBe("solar@beispiel.de");
    expect(parsed.postalCode).toBe("85586");
  });

  it.each([
    { ...valid, email: "keine-mail" },
    { ...valid, postalCode: "8558" },
    { ...valid, postalCode: "ABCDE" },
    { ...valid, role: "unknown" },
    { ...valid, privacyConsent: false }
  ])("rejects invalid or automated submissions", (input) => {
    expect(regionInterestSchema.safeParse(input).success).toBe(false);
  });

  it("accepts a bounded honeypot value so the API can silently discard bots", () => {
    expect(regionInterestSchema.safeParse({ ...valid, website: "bot.example" }).success).toBe(true);
    expect(regionInterestSchema.safeParse({ ...valid, website: "x".repeat(201) }).success).toBe(false);
  });

  it("only accepts known manual stages", () => {
    expect(regionDemandStageSchema.safeParse({ postalCode: "10115", stage: "pilot" }).success).toBe(true);
    expect(regionDemandStageSchema.safeParse({ postalCode: "10115", stage: "automatic" }).success).toBe(false);
  });

  it("only accepts privacy-friendly funnel fields", () => {
    expect(funnelEventSchema.safeParse({ name: "email_confirmed", sourceRoute: "/region-wuenschen" }).success).toBe(true);
    expect(funnelEventSchema.safeParse({ name: "page_view", email: "person@example.org" }).success).toBe(false);
  });
});

describe("region interest tokens", () => {
  it("creates opaque one-time token material and stores only stable hashes", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(40);
    expect(hashToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(first)).toBe(hashToken(first));
    expect(hashToken(first)).not.toContain(first);
  });

  it("normalizes email identity for idempotent keys", () => {
    expect(normalizeEmail(" Person@Example.ORG ")).toBe("person@example.org");
  });
});
