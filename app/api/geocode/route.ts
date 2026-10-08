/**
 * Recherche de destination via le service de géocodage de la Géoplateforme
 * (IGN), comme EssencePrix. On interroge adresses et lieux (POI) pour qu’une
 * recherche comme « Louvre » trouve le musée et pas seulement la rue.
 */
type Place = { label: string; detail: string; lat: number; lon: number; citycode?: string; kind: "poi" | "address" };

const PARIS_CENTER = { lat: 48.8566, lon: 2.3522 };

function first(value: unknown): string | undefined {
  if (Array.isArray(value)) return first(value[0]);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function toPlace(feature: unknown): Place | undefined {
  if (!feature || typeof feature !== "object") return undefined;
  const { geometry, properties } = feature as {
    geometry?: { coordinates?: unknown };
    properties?: Record<string, unknown>;
  };
  const coordinates = geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2 || !properties) return undefined;
  const [lon, lat] = coordinates.map(Number);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;

  const isPoi = properties._type === "poi" || "toponym" in properties;
  const city = first(properties.city);
  const postcode = first(properties.postcode);
  const citycode = first(properties.citycode);
  if (isPoi) {
    const label = first(properties.toponym) ?? first(properties.name);
    if (!label) return undefined;
    return { label, detail: [postcode, city].filter(Boolean).join(" "), lat, lon, citycode, kind: "poi" };
  }
  const label = first(properties.label);
  if (!label) return undefined;
  return { label, detail: "", lat, lon, citycode, kind: "address" };
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (query.length < 2 || query.length > 120 || /[\u0000-\u001F\u007F]/.test(query)) {
    return Response.json({ error: "Recherche invalide" }, { status: 400 });
  }

  const search = (index: "address" | "poi") => {
    const url = new URL("https://data.geopf.fr/geocodage/search");
    url.searchParams.set("q", query);
    url.searchParams.set("index", index);
    url.searchParams.set("limit", "5");
    url.searchParams.set("lat", String(PARIS_CENTER.lat));
    url.searchParams.set("lon", String(PARIS_CENTER.lon));
    return fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    }).then(async (response) => {
      if (!response.ok) throw new Error("Service d’adresse indisponible");
      const body = (await response.json()) as { features?: unknown[] };
      return (body.features ?? []).map(toPlace).filter((place): place is Place => Boolean(place));
    });
  };

  const [pois, addresses] = await Promise.allSettled([search("poi"), search("address")]);
  if (pois.status === "rejected" && addresses.status === "rejected") {
    return Response.json({ error: "Recherche d’adresse indisponible" }, { status: 502 });
  }
  const places = [
    ...(pois.status === "fulfilled" ? pois.value.slice(0, 3) : []),
    ...(addresses.status === "fulfilled" ? addresses.value : []),
  ];
  const unique = places.filter(
    (place, index) =>
      places.findIndex((other) => other.label.toLowerCase() === place.label.toLowerCase()) === index,
  );
  return Response.json(
    { places: unique.slice(0, 6) },
    { headers: { "Cache-Control": "public, s-maxage=86400" } },
  );
}
