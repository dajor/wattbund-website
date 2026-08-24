import { describe, expect, it } from "vitest";
import { buildRegionInterestHref } from "@/lib/region-interest-url";

describe("buildRegionInterestHref", () => {
  it("prefills a postal code result", () => {
    expect(buildRegionInterestHref({ name: "85586", type: "postal_code" }))
      .toBe("/region-wuenschen?ort=85586&plz=85586");
  });

  it("keeps a city as context without inventing a postal code", () => {
    expect(buildRegionInterestHref({ name: "Berlin", type: "region" }))
      .toBe("/region-wuenschen?ort=Berlin");
  });

  it("returns the plain funnel URL without a search result", () => {
    expect(buildRegionInterestHref(null)).toBe("/region-wuenschen");
  });
});
