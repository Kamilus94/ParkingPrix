import type { Parking, SourceId, Tariffs } from "./types.ts";

type Raw = Record<string, unknown>;

/**
 * Les sources suivent le schéma national « stationnement » (BNLS, Etalab), mais
 * leurs exports OpenDataSoft passent les noms de colonnes en minuscules et
 * ajoutent parfois des champs propres (arrondissement, délégataire, horaires).
 * On lit donc les clés sans tenir compte de la casse, avec quelques alias.
 */
function lowerKeys(raw: Raw): Raw {
  const out: Raw = {};
  for (const [key, value] of Object.entries(raw)) out[key.toLowerCase()] = value;
  return out;
}

function pick(raw: Raw, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = raw[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

export function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\s|€/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return undefined;
  return Number(cleaned);
}

function toText(value: unknown): string | undefined {
  if (typeof value === "string") return value.trim() || undefined;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(toText).filter(Boolean);
    return parts.length ? parts.join(" · ") : undefined;
  }
  return undefined;
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase();
  if (["true", "oui", "1", "vrai", "yes"].includes(v)) return true;
  if (["false", "non", "0", "faux", "no"].includes(v)) return false;
  return undefined;
}

function coordinates(raw: Raw): { lat: number; lon: number } | undefined {
  const point = raw.geo_point_2d;
  let lat: number | undefined;
  let lon: number | undefined;
  if (point && typeof point === "object" && !Array.isArray(point)) {
    lat = toNumber((point as Raw).lat);
    lon = toNumber((point as Raw).lon);
  } else if (Array.isArray(point) && point.length === 2) {
    lat = toNumber(point[0]);
    lon = toNumber(point[1]);
  }
  lat ??= toNumber(pick(raw, "ylat", "lat", "latitude"));
  lon ??= toNumber(pick(raw, "xlong", "lon", "lng", "longitude"));
  if (lat === undefined || lon === undefined) return undefined;
  // Garde-fou : coordonnées inversées ou hors France métropolitaine.
  if (lat < 41 || lat > 51.5 || lon < -5.5 || lon > 10) return undefined;
  return { lat, lon };
}

const TARIFF_KEYS: Record<keyof Tariffs, string[]> = {
  "15": ["tf_15mn_e", "tarif_15min", "tarif_15mn"],
  "30": ["tf_30mn_e", "tarif_30min", "tarif_30mn"],
  "60": ["tarif_1h"],
  "120": ["tarif_2h"],
  "180": ["tarif_3h"],
  "240": ["tarif_4h"],
  "1440": ["tarif_24h"],
};

/**
 * Accès réservé : abonnés, résidents, clients d’un hôtel ou d’une entreprise.
 * Ces parkings sortent du comparateur, qui ne garde que les parkings ouverts à tous
 * (champ type_usagers = « tous »).
 */
export function isPublicAccess(raw: Raw): boolean {
  const usage = toText(pick(lowerKeys(raw), "type_usagers"))?.toLowerCase();
  // Accès non renseigné : on exclut plutôt que de risquer un parking réservé.
  if (!usage) return false;
  return usage.normalize("NFD").replace(/[̀-ͯ]/g, "").includes("tous");
}

export function normalizeRecord(input: Raw, source: SourceId): Parking | undefined {
  const raw = lowerKeys(input);
  if (!isPublicAccess(raw)) return undefined;
  const position = coordinates(raw);
  if (!position) return undefined;

  const name = toText(pick(raw, "nom", "name", "nom_parking"));
  if (!name) return undefined;

  const free = toBoolean(pick(raw, "gratuit")) === true;
  const tariffs: Tariffs = {};
  for (const [duration, keys] of Object.entries(TARIFF_KEYS) as [keyof Tariffs, string[]][]) {
    const price = toNumber(pick(raw, ...keys));
    // Un 0 € sur un parking payant signifie presque toujours « non renseigné ».
    if (price === undefined || price < 0 || (price === 0 && !free)) continue;
    tariffs[duration] = price;
  }

  const rawUrl = toText(pick(raw, "url"));
  const capacity = toNumber(pick(raw, "nb_places"));
  const evPlaces = toNumber(pick(raw, "nb_voitures_electriques"));
  const hours = toText(
    pick(raw, "horaires", "horaire", "horaires_ouverture", "horaire_na", "horaires_na", "ouverture"),
  );
  const maxHeight = toNumber(pick(raw, "hauteur_max"));

  return {
    id: `${source}:${toText(pick(raw, "id", "identifiant", "id_parking")) ?? `${name}-${position.lat}`}`,
    ref: toText(pick(raw, "id", "identifiant", "id_parking")),
    citycode: toText(pick(raw, "insee")) ?.replace(/\.0$/, ""),
    arrondissement: toText(pick(raw, "arrdt")),
    name: prettyName(name),
    address: toText(pick(raw, "adresse", "address")) ?? "",
    lat: position.lat,
    lon: position.lon,
    operator: operatorName(
      toText(pick(raw, "deleg", "delegataire", "exploitant", "gestionnaire", "operateur")) ??
        (source === "saemes-bnls" ? "Saemes" : undefined),
    ),
    url: rawUrl && /^https?:\/\//.test(rawUrl) ? rawUrl : undefined,
    free,
    tariffs,
    capacity,
    pmrPlaces: toNumber(pick(raw, "nb_pmr")),
    // Saemes recopie parfois le nombre total de places dans ce champ : valeur écartée.
    evPlaces: evPlaces && evPlaces !== capacity ? evPlaces : undefined,
    maxHeightCm: maxHeight && maxHeight > 100 && maxHeight < 600 ? maxHeight : undefined,
    hours,
    info: toText(pick(raw, "info")),
    sources: [source],
  };
}

/** Le schéma demande des noms en majuscules sans accents : on les rend lisibles. */
export function prettyName(name: string): string {
  if (name !== name.toUpperCase()) return name.trim();
  return name
    .trim()
    .toLowerCase()
    .replace(/(^|[\s\-'’(/])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase())
    .replace(/\b(De|Du|Des|La|Le|Les|Et|D|L|Sur|Aux?)\b/g, (word) => word.toLowerCase())
    .replace(/^(\p{L})/u, (letter) => letter.toUpperCase());
}

const OPERATORS: Record<string, string> = {
  INDIGO: "Indigo",
  SAEMES: "Saemes",
  "Q PARK": "Q-Park",
  "Q-PARK": "Q-Park",
  INTERPARKING: "Interparking",
  EFFIA: "Effia",
};

function operatorName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return OPERATORS[value.trim().toUpperCase()] ?? prettyName(value);
}
