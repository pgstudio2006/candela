import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sourcePath = path.join(root, "src/data/countries-states-cities.json");
const outPath = path.join(root, "src/data/india-locations.json");

/** Official districts per state/UT (766 districts). Cities are mapped to the best-matching district. */
const DISTRICTS_BY_STATE = JSON.parse(
  fs.readFileSync(path.join(root, "src/data/india-districts-raw.json"), "utf8"),
);

const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const india = raw.find((c) => c.name === "India");
if (!india) throw new Error("India not found in source dataset");

function normalize(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function matchDistrict(stateName, cityName, districts) {
  const city = normalize(cityName);
  let best = null;
  let bestScore = 0;
  for (const district of districts) {
    const d = normalize(district);
    if (city === d) return district;
    if (city.startsWith(d) || d.startsWith(city)) {
      const score = Math.min(city.length, d.length);
      if (score > bestScore) {
        best = district;
        bestScore = score;
      }
    }
  }
  return best;
}

const states = india.states.map((s) => s.name).sort((a, b) => a.localeCompare(b));
const citiesByState = {};
const locations = {};

for (const state of india.states) {
  const cities = [...new Set(state.cities.map((c) => c.name))].sort((a, b) => a.localeCompare(b));
  citiesByState[state.name] = cities;

  const districts = DISTRICTS_BY_STATE[state.name] ?? [];
  const buckets = Object.fromEntries(districts.map((d) => [d, []]));

  for (const city of cities) {
    const district = matchDistrict(state.name, city, districts) ?? districts[0] ?? city;
    if (!buckets[district]) buckets[district] = [];
    if (!buckets[district].includes(city)) buckets[district].push(city);
  }

  for (const district of districts) {
    if (!buckets[district]?.length) buckets[district] = [district];
    else if (!buckets[district].includes(district)) buckets[district].unshift(district);
    buckets[district].sort((a, b) => a.localeCompare(b));
  }

  locations[state.name] = buckets;
}

const out = { country: "India", states, citiesByState, locations };
fs.writeFileSync(outPath, JSON.stringify(out));

const stats = fs.statSync(outPath);
console.log(`Wrote ${outPath} (${stats.size} bytes)`);
console.log(`States: ${states.length}, cities: ${Object.values(citiesByState).flat().length}`);

if (fs.existsSync(sourcePath)) {
  fs.unlinkSync(sourcePath);
  console.log("Removed large source file");
}
