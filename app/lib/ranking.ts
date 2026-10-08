import { priceAmount, priceFor, type Price } from "./pricing.ts";
import type { Duration, Parking } from "./types.ts";

export type SortMode = "best" | "cheapest" | "closest";

/** Vitesse de marche urbaine (4,5 km/h) et détour moyen par rapport au vol d’oiseau. */
const WALK_METERS_PER_MINUTE = 75;
const DETOUR_FACTOR = 1.3;
/**
 * « Meilleur choix » = prix + marche aller-retour valorisée à 0,10 € la minute.
 * Un parking 1 € moins cher l’emporte s’il ne demande pas plus de 5 minutes de
 * marche en plus dans chaque sens.
 */
export const WALK_COST_PER_MINUTE = 0.1;

export type RankedParking = {
  parking: Parking;
  price: Price;
  amount?: number;
  walkMeters: number;
  walkMinutes: number;
  score?: number;
};

export function distanceMeters(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLon = (bLon - aLon) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

export function rankParkings(
  parkings: Parking[],
  destination: { lat: number; lon: number },
  duration: Duration,
  mode: SortMode,
  maxWalkMeters = 1500,
): RankedParking[] {
  const ranked = parkings
    .map((parking): RankedParking => {
      const walkMeters = Math.round(
        distanceMeters(destination.lat, destination.lon, parking.lat, parking.lon) * DETOUR_FACTOR,
      );
      const walkMinutes = Math.max(1, Math.round(walkMeters / WALK_METERS_PER_MINUTE));
      const price = priceFor(parking, duration);
      const amount = priceAmount(price);
      const score =
        amount === undefined ? undefined : amount + 2 * walkMinutes * WALK_COST_PER_MINUTE;
      return { parking, price, amount, walkMeters, walkMinutes, score };
    })
    .filter((entry) => entry.walkMeters <= maxWalkMeters);

  const byDistance = (a: RankedParking, b: RankedParking) => a.walkMeters - b.walkMeters;
  // Les parkings sans tarif publié restent visibles, mais toujours après les autres.
  const knownFirst = (a?: number, b?: number) =>
    a === undefined ? (b === undefined ? 0 : 1) : b === undefined ? -1 : a - b;

  if (mode === "closest") return ranked.sort(byDistance);
  if (mode === "cheapest") {
    return ranked.sort((a, b) => knownFirst(a.amount, b.amount) || byDistance(a, b));
  }
  return ranked.sort((a, b) => knownFirst(a.score, b.score) || byDistance(a, b));
}
