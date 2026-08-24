import { describe, expect, it } from "vitest";
import { findRegionForPoint, pointWithinRegionBounds } from "@/lib/geocoding";
import type { Region } from "@/lib/types";

const region = {
  id: "test", slug: "test", name: "Test", state: "Bayern", municipalityCode: "1",
  center: [11.8, 48.1], bounds: [[11.7, 48.0], [11.9, 48.2]], status: "published",
  modelVersion: "test", specificYieldKwhPerKwp: 1000,
  summary: { buildingsAnalyzed: 0, suitableRoofs: 0, estimatedCapacityKwp: 0, estimatedAnnualYieldKwh: 0, installedCapacityKwp: 0, publishedProfiles: 0, dataAsOf: "2026-08-24" }
} satisfies Region;

describe("nationwide map search", () => {
  it("matches a search point to an available pilot region", () => {
    expect(pointWithinRegionBounds([11.8, 48.1], region)).toBe(true);
    expect(findRegionForPoint([11.8, 48.1], [region])?.slug).toBe("test");
  });

  it("keeps locations outside pilot bounds searchable without assigning a region", () => {
    expect(findRegionForPoint([13.405, 52.52], [region])).toBeNull();
  });
});
