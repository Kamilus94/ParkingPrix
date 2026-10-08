import { distanceMeters, rankParkings, type RankedParking } from "./ranking.ts";
import { formatEuros } from "./pricing.ts";
import type { Duration, Parking } from "./types.ts";

export const SITE_URL = "https://parkingprix.com";

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function parkingSlug(parking: Parking): string {
  const suffix = parking.ref ? slugify(parking.ref) : slugify(`${parking.lat.toFixed(4)}-${parking.lon.toFixed(4)}`);
  return `${slugify(parking.name)}-${suffix}`;
}

export function findParking(parkings: Parking[], slug: string): Parking | undefined {
  return parkings.find((parking) => parkingSlug(parking) === slug);
}

export const SEO_DURATIONS: Duration[] = [60, 120, 1440];

export type AreaSummary = {
  ranked: RankedParking[];
  cheapest?: { name: string; amount: number }[];
  /** Prix publié le plus bas par durée. */
  lowest: Partial<Record<Duration, { amount: number; name: string }>>;
};

function summarize(ranked: RankedParking[]): AreaSummary {
  const lowest: AreaSummary["lowest"] = {};
  for (const duration of SEO_DURATIONS) {
    for (const entry of ranked) {
      const amount = entry.parking.tariffs[String(duration) as keyof Parking["tariffs"]];
      if (amount === undefined || entry.parking.free) continue;
      if (!lowest[duration] || amount < lowest[duration]!.amount) lowest[duration] = { amount, name: entry.parking.name };
    }
  }
  return { ranked, lowest };
}

/** Parkings autour d’un point, classés par distance (plus de 8 résultats inutiles pour une page). */
export function aroundPoint(parkings: Parking[], point: { lat: number; lon: number }, limit = 12): AreaSummary {
  let ranked = rankParkings(parkings, point, 120, "closest", 1000);
  if (ranked.length < 3) ranked = rankParkings(parkings, point, 120, "closest", 2000);
  return summarize(ranked.slice(0, limit));
}

export function inArrondissement(parkings: Parking[], citycode: string): AreaSummary {
  const list = parkings.filter((parking) => parking.citycode === citycode);
  const center = list.length ? { lat: list.reduce((s, p) => s + p.lat, 0) / list.length, lon: list.reduce((s, p) => s + p.lon, 0) / list.length } : { lat: 0, lon: 0 };
  const ranked = list
    .map((parking) => ({ parking, price: { kind: "unknown" as const }, walkMeters: Math.round(distanceMeters(center.lat, center.lon, parking.lat, parking.lon)), walkMinutes: 0 }))
    .sort((a, b) => a.parking.name.localeCompare(b.parking.name, "fr"));
  return summarize(ranked as RankedParking[]);
}

export function priceLine(summary: AreaSummary): string | undefined {
  const hour = summary.lowest[60];
  const day = summary.lowest[1440];
  if (!hour && !day) return undefined;
  const parts = [];
  if (hour) parts.push(`dès ${formatEuros(hour.amount)} pour 1 h`);
  if (summary.lowest[120]) parts.push(`${formatEuros(summary.lowest[120]!.amount)} pour 2 h`);
  if (day) parts.push(`${formatEuros(day.amount)} la journée`);
  return parts.join(", ");
}

export function faqFor(place: string, summary: AreaSummary): { q: string; a: string }[] {
  const faq: { q: string; a: string }[] = [];
  const hour = summary.lowest[60];
  const day = summary.lowest[1440];
  if (hour) faq.push({ q: `Quel est le prix d’un parking près de ${place} pour 1 h ?`, a: `D’après les tarifs publics publiés, le parking le moins cher près de ${place} est ${hour.name}, à ${formatEuros(hour.amount)} pour 1 h.` });
  if (day) faq.push({ q: `Combien coûte un parking à la journée près de ${place} ?`, a: `Le tarif 24 h le plus bas publié près de ${place} est de ${formatEuros(day.amount)} (${day.name}).` });
  faq.push({ q: "D’où viennent ces tarifs ?", a: "Des données ouvertes publiées par la Ville de Paris et les exploitants de parkings, pour un usager sans abonnement. Vérifiez toujours le tarif affiché à l’entrée du parking." });
  return faq;
}
