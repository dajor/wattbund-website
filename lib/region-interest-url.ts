type SearchLocation = { name: string; type: string };

export function buildRegionInterestHref(location: SearchLocation | null) {
  if (!location) return "/region-wuenschen";
  const params = new URLSearchParams();
  params.set("ort", location.name);
  if (location.type === "postal_code" && /^\d{5}$/.test(location.name)) params.set("plz", location.name);
  return `/region-wuenschen?${params.toString()}`;
}
