export type RegionStatus = "draft" | "published" | "archived";
export type ProfileRole = "producer" | "consumer" | "business" | "partner";
export type ProfileStatus = "draft" | "pending" | "published" | "rejected" | "hidden";

export type Coordinates = [number, number];

export interface Region {
  id: string;
  slug: string;
  name: string;
  state: string;
  municipalityCode: string;
  center: Coordinates;
  bounds: [Coordinates, Coordinates];
  status: RegionStatus;
  modelVersion: string;
  specificYieldKwhPerKwp: number;
  summary: RegionSummary;
}

export interface RegionSummary {
  buildingsAnalyzed: number;
  suitableRoofs: number;
  estimatedCapacityKwp: number;
  estimatedAnnualYieldKwh: number;
  installedCapacityKwp: number;
  publishedProfiles: number;
  dataAsOf: string;
}

export interface BuildingProperties {
  id: string;
  regionSlug: string;
  label: string;
  suitableAreaM2: number;
  estimatedKwp: number;
  annualYieldKwh: number;
  potentialClass: "low" | "medium" | "high";
  confidence: "indicative";
  modelVersion: string;
  sourceName: string;
  sourceAsOf: string;
}

export interface PublicProfile {
  id: string;
  regionSlug: string;
  role: ProfileRole;
  displayName: string;
  description: string | null;
  pvStatus: "none" | "planned" | "active" | null;
  capacityKwp: number | null;
  coordinates: Coordinates;
}

export interface ProfileDraft {
  displayName: string;
  role: ProfileRole;
  regionSlug: string;
  description?: string;
  pvStatus?: "none" | "planned" | "active";
  capacityKwp?: number;
  address: string;
  publishConsent: boolean;
}
