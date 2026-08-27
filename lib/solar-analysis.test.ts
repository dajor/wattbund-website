import { describe, expect, it } from "vitest";
import { createSolarScanTiles, estimateSolarScanTiles, safeSecretMatches } from "@/lib/solar-analysis";

describe("solar analysis tiling", () => {
  const poing: [number, number, number, number] = [11.7694, 48.1501, 11.8417, 48.1860];
  const center: [number, number] = [11.8037, 48.1667];

  it("creates a nine-tile sample inside the selected bounds", () => {
    const tiles = createSolarScanTiles(poing, "sample", center);
    expect(tiles).toHaveLength(9);
    expect(tiles.every(({ bounds }) => bounds[0] >= poing[0] && bounds[2] <= poing[2])).toBe(true);
  });

  it("covers a municipality with stable unique tile keys", () => {
    const tiles = createSolarScanTiles(poing, "full", center);
    expect(tiles.length).toBeGreaterThan(100);
    expect(new Set(tiles.map(({ key }) => key)).size).toBe(tiles.length);
    expect(estimateSolarScanTiles(poing, center)).toBe(tiles.length);
  });
});

describe("solar scan callback secret", () => {
  it("only accepts the exact configured value", () => {
    expect(safeSecretMatches("secret", "secret")).toBe(true);
    expect(safeSecretMatches("wrong", "secret")).toBe(false);
    expect(safeSecretMatches(null, "secret")).toBe(false);
  });
});
