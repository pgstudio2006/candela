import locationsData from "@/data/india-locations.json";

export const INDIA_COUNTRY = locationsData.country;

export const INDIAN_STATES = locationsData.states.map((name) => ({
  value: name,
  label: name,
}));

export const APPOINTMENT_CENTRES = [
  { value: "Navayu Gurgaon", label: "Navayu Gurgaon" },
  { value: "Navayu Spine — Gurgaon", label: "Navayu Spine — Gurgaon" },
  { value: "Navayu Spine — Ahmedabad", label: "Navayu Spine — Ahmedabad" },
  { value: "Navayu Spine — Mumbai", label: "Navayu Spine — Mumbai" },
  { value: "Navayu Wellness — Delhi NCR", label: "Navayu Wellness — Delhi NCR" },
  { value: "Gurgaon Center", label: "Gurgaon Center" },
  { value: "Pataudi Center", label: "Pataudi Center" },
];

export const HEAR_ABOUT_OPTIONS = [
  { value: "walkin", label: "Walk-in" },
  { value: "google", label: "Google / Online search" },
  { value: "social", label: "Social media" },
  { value: "doctor", label: "Doctor referral" },
  { value: "patient", label: "Friend / patient referral" },
  { value: "corporate", label: "Corporate / insurance" },
  { value: "camp", label: "Health camp" },
  { value: "newspaper", label: "Newspaper / TV / Radio" },
  { value: "other", label: "Other" },
];

type LocationMap = Record<string, Record<string, string[]>>;

const locations = locationsData.locations as LocationMap;

export function getDistrictsForState(state: string): { value: string; label: string }[] {
  const districts = locations[state];
  if (!districts) return [];
  return Object.keys(districts)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name }));
}

export function getCitiesForDistrict(state: string, district: string): { value: string; label: string }[] {
  const cities = locations[state]?.[district] ?? [];
  return [...cities]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ value: name, label: name }));
}

export function resolveIndiaLocationOptions(
  fieldId: string,
  values: Record<string, string | number | boolean>,
): { value: string; label: string }[] | null {
  if (fieldId === "country") {
    return [{ value: INDIA_COUNTRY, label: INDIA_COUNTRY }];
  }
  if (fieldId === "state") return INDIAN_STATES;
  if (fieldId === "district") {
    const state = String(values.state ?? "");
    return state ? getDistrictsForState(state) : [];
  }
  if (fieldId === "city") {
    const state = String(values.state ?? "");
    const district = String(values.district ?? "");
    return state && district ? getCitiesForDistrict(state, district) : [];
  }
  return null;
}

/** Clear dependent location fields when parent changes. */
export function cascadeIndiaLocationChange(
  fieldId: string,
  next: Record<string, string | number | boolean>,
): Record<string, string | number | boolean> {
  if (fieldId === "state") {
    return { ...next, district: "", city: "" };
  }
  if (fieldId === "district") {
    return { ...next, city: "" };
  }
  return next;
}
