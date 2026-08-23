export const SOLAR_MODEL_VERSION = "lod2-orientation-v1";

export type Orientation = "S" | "SE" | "SW" | "E" | "W" | "NE" | "NW" | "N";

export interface SolarInput {
  roofAreaM2: number;
  orientation: Orientation;
  tiltDegrees: number;
  usableAreaFactor?: number;
  moduleDensityKwpPerM2?: number;
  specificYieldKwhPerKwp?: number;
}

const orientationFactors: Record<Orientation, number> = {
  S: 1,
  SE: 0.95,
  SW: 0.95,
  E: 0.85,
  W: 0.85,
  NE: 0.7,
  NW: 0.7,
  N: 0.6
};

export function calculateSolarPotential(input: SolarInput) {
  if (!Number.isFinite(input.roofAreaM2) || input.roofAreaM2 <= 0) {
    throw new Error("roofAreaM2 must be greater than zero");
  }
  if (!Number.isFinite(input.tiltDegrees) || input.tiltDegrees < 0 || input.tiltDegrees > 90) {
    throw new Error("tiltDegrees must be between zero and 90");
  }

  const usableAreaFactor = input.usableAreaFactor ?? 0.7;
  const moduleDensity = input.moduleDensityKwpPerM2 ?? 0.2;
  const specificYield = input.specificYieldKwhPerKwp ?? 1000;
  const tiltFactor = input.tiltDegrees >= 10 && input.tiltDegrees <= 45 ? 1 : 0.9;
  const usableAreaM2 = input.roofAreaM2 * usableAreaFactor;
  const estimatedKwp = usableAreaM2 * moduleDensity;
  const annualYieldKwh = estimatedKwp * specificYield * orientationFactors[input.orientation] * tiltFactor;

  return {
    usableAreaM2: round(usableAreaM2, 1),
    estimatedKwp: round(estimatedKwp, 1),
    annualYieldKwh: Math.round(annualYieldKwh),
    orientationFactor: orientationFactors[input.orientation],
    tiltFactor,
    modelVersion: SOLAR_MODEL_VERSION
  };
}

function round(value: number, decimals: number) {
  const power = 10 ** decimals;
  return Math.round(value * power) / power;
}
