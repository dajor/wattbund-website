import { describe, expect, it } from "vitest";
import { calculateSolarPotential } from "@/lib/solar";

describe("calculateSolarPotential", () => {
  it("calculates the documented south-facing reference case", () => {
    expect(calculateSolarPotential({ roofAreaM2: 100, orientation: "S", tiltDegrees: 30 })).toEqual({
      usableAreaM2: 70,
      estimatedKwp: 14,
      annualYieldKwh: 14000,
      orientationFactor: 1,
      tiltFactor: 1,
      modelVersion: "lod2-orientation-v1"
    });
  });

  it("applies orientation and tilt factors", () => {
    const result = calculateSolarPotential({ roofAreaM2: 50, orientation: "W", tiltDegrees: 5 });
    expect(result.estimatedKwp).toBe(7);
    expect(result.annualYieldKwh).toBe(5355);
  });

  it("rejects impossible values", () => {
    expect(() => calculateSolarPotential({ roofAreaM2: 0, orientation: "S", tiltDegrees: 30 })).toThrow();
    expect(() => calculateSolarPotential({ roofAreaM2: 10, orientation: "S", tiltDegrees: 95 })).toThrow();
  });
});
