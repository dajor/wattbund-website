import type { BuildingProperties, PublicProfile, Region } from "@/lib/types";

export const demoRegions: Region[] = [
  {
    id: "4bd1665e-7394-4a36-9d9e-83bba13228a1",
    slug: "poing",
    name: "Poing",
    state: "Bayern",
    municipalityCode: "09175135",
    center: [11.8182, 48.1717],
    bounds: [[11.77, 48.14], [11.87, 48.20]],
    status: "published",
    modelVersion: "lod2-orientation-v1",
    specificYieldKwhPerKwp: 1000,
    summary: {
      buildingsAnalyzed: 0,
      suitableRoofs: 0,
      estimatedCapacityKwp: 0,
      estimatedAnnualYieldKwh: 0,
      installedCapacityKwp: 0,
      publishedProfiles: 2,
      dataAsOf: "Demo-Daten"
    }
  },
  {
    id: "bcfd19d6-2023-423e-b9cf-ced9320cd850",
    slug: "vaterstetten",
    name: "Vaterstetten",
    state: "Bayern",
    municipalityCode: "09175132",
    center: [11.7836, 48.1052],
    bounds: [[11.70, 48.06], [11.88, 48.15]],
    status: "published",
    modelVersion: "lod2-orientation-v1",
    specificYieldKwhPerKwp: 1000,
    summary: {
      buildingsAnalyzed: 0,
      suitableRoofs: 0,
      estimatedCapacityKwp: 0,
      estimatedAnnualYieldKwh: 0,
      installedCapacityKwp: 0,
      publishedProfiles: 1,
      dataAsOf: "Demo-Daten"
    }
  }
];

type DemoBuilding = BuildingProperties & { polygon: number[][][] };

export const demoBuildings: DemoBuilding[] = [
  makeBuilding("poing-a", "poing", "Beispieldach Poing", 11.8175, 48.1714, 86, 17.2, 15480, "high"),
  makeBuilding("poing-b", "poing", "Beispieldach Poing", 11.8201, 48.1725, 52, 10.4, 8840, "medium"),
  makeBuilding("poing-c", "poing", "Beispieldach Poing", 11.8148, 48.1699, 31, 6.2, 5270, "low"),
  makeBuilding("poing-d", "poing", "Beispieldach Poing", 11.8231, 48.1705, 110, 22, 20900, "high"),
  makeBuilding("vaterstetten-a", "vaterstetten", "Beispieldach Vaterstetten", 11.7834, 48.105, 74, 14.8, 14060, "high"),
  makeBuilding("vaterstetten-b", "vaterstetten", "Beispieldach Vaterstetten", 11.786, 48.106, 44, 8.8, 7480, "medium"),
  makeBuilding("vaterstetten-c", "vaterstetten", "Beispieldach Vaterstetten", 11.7809, 48.1037, 28, 5.6, 4760, "low")
];

export const demoProfiles: PublicProfile[] = [
  {
    id: "demo-profile-1",
    regionSlug: "poing",
    role: "producer",
    displayName: "PV-Erzeuger in Poing",
    description: "Möchte Solarüberschuss künftig lokal teilen.",
    pvStatus: "active",
    capacityKwp: 12.4,
    coordinates: [11.8119, 48.1734]
  },
  {
    id: "demo-profile-2",
    regionSlug: "poing",
    role: "consumer",
    displayName: "Haushalt in Poing",
    description: "Interessiert an lokal erzeugter Energie.",
    pvStatus: "none",
    capacityKwp: null,
    coordinates: [11.8261, 48.1692]
  },
  {
    id: "demo-profile-3",
    regionSlug: "vaterstetten",
    role: "business",
    displayName: "Gewerbe in Vaterstetten",
    description: "Tagesverbrauch soll mit regionaler PV-Erzeugung zusammenfinden.",
    pvStatus: "none",
    capacityKwp: null,
    coordinates: [11.7798, 48.1082]
  }
];

function makeBuilding(
  id: string,
  regionSlug: string,
  label: string,
  longitude: number,
  latitude: number,
  suitableAreaM2: number,
  estimatedKwp: number,
  annualYieldKwh: number,
  potentialClass: BuildingProperties["potentialClass"]
): DemoBuilding {
  const dx = 0.00034;
  const dy = 0.00022;
  return {
    id,
    regionSlug,
    label,
    suitableAreaM2,
    estimatedKwp,
    annualYieldKwh,
    potentialClass,
    confidence: "indicative",
    modelVersion: "lod2-orientation-v1",
    sourceName: "WattBund Beispieldaten",
    sourceAsOf: "Nicht für Planung verwenden",
    polygon: [[
      [longitude - dx, latitude - dy],
      [longitude + dx, latitude - dy],
      [longitude + dx, latitude + dy],
      [longitude - dx, latitude + dy],
      [longitude - dx, latitude - dy]
    ]]
  };
}
