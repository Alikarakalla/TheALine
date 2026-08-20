// Lebanon-scoped address lookup on OpenStreetMap services (no API keys):
// - Photon (photon.komoot.io) powers as-you-type address suggestions
// - Nominatim (nominatim.openstreetmap.org) reverse-geocodes "use my location"
// Results are filtered to Lebanon and mapped onto the address form fields.

export type AddressSuggestion = {
  /** Human-readable display line for the dropdown. */
  label: string;
  line1: string;
  city: string;
  postcode: string;
  lat?: number;
  lng?: number;
};

const BEIRUT = { lat: 33.8938, lon: 35.5018 }; // bias searches toward Lebanon

export async function searchLebanon(
  q: string,
  signal?: AbortSignal
): Promise<AddressSuggestion[]> {
  const url =
    "https://photon.komoot.io/api/?q=" +
    encodeURIComponent(q) +
    `&lang=en&limit=8&lat=${BEIRUT.lat}&lon=${BEIRUT.lon}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Address search is unavailable right now");
  const json = await res.json();

  const out: AddressSuggestion[] = [];
  for (const f of json.features ?? []) {
    const p = f.properties ?? {};
    if (String(p.countrycode || "").toUpperCase() !== "LB") continue;
    const isArea = p.type === "city" || p.type === "district" || p.type === "state";
    const street = [p.street || (!isArea ? p.name : ""), p.housenumber]
      .filter(Boolean)
      .join(" ")
      .trim();
    const line1 = street || String(p.name || "");
    const city =
      p.city || p.county || p.district || p.state || (p.type === "city" ? p.name : "") || "";
    const postcode = String(p.postcode || "");
    const label = [
      line1,
      p.district && p.district !== line1 && p.district !== city ? p.district : "",
      city && city !== line1 ? city : "",
    ]
      .filter(Boolean)
      .join(", ");
    if (!label) continue;
    const [lng, lat] = f.geometry?.coordinates ?? [];
    out.push({
      label,
      line1,
      city: String(city),
      postcode,
      lat: typeof lat === "number" ? lat : undefined,
      lng: typeof lng === "number" ? lng : undefined,
    });
  }
  // de-duplicate identical display lines
  return out
    .filter((s, i) => out.findIndex((x) => x.label === s.label) === i)
    .slice(0, 6);
}

export async function reverseLebanon(
  lat: number,
  lon: number,
  signal?: AbortSignal
): Promise<AddressSuggestion & { inLebanon: boolean }> {
  const url =
    "https://nominatim.openstreetmap.org/reverse?format=jsonv2" +
    `&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1&accept-language=en`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Location lookup is unavailable right now");
  const json = await res.json();
  const a = json.address ?? {};
  const line1 = [a.road || a.pedestrian || a.neighbourhood || "", a.house_number || ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  const city = a.city || a.town || a.village || a.suburb || a.county || a.state || "";
  return {
    label: String(json.display_name || ""),
    line1,
    city: String(city),
    postcode: String(a.postcode || ""),
    inLebanon: String(a.country_code || "").toLowerCase() === "lb",
  };
}
