import type { Duration, Parking } from "./types.ts";

export type Price =
  | { kind: "published"; amount: number }
  /** Moins d’une heure sans tarif publié : prorata au quart d’heure du tarif 1 h. */
  | { kind: "estimated"; amount: number; ceiling: number }
  | { kind: "free" }
  | { kind: "unknown" };

/**
 * Prix pour une durée donnée, à partir des seuls tarifs publiés.
 *
 * Les parkings publics facturent au quart d’heure (ou à la minute) pour les
 * séjours courts (code de la consommation, art. L. 113-7). Quand la source ne
 * publie pas le prix d’un quart d’heure ou d’une demi-heure, on affiche donc
 * un prorata du tarif 1 h, marqué comme estimation, avec le tarif 1 h comme
 * plafond. Au-delà d’une heure, on n’extrapole jamais : sans tarif publié,
 * le prix reste « non publié ».
 */
export function priceFor(parking: Parking, duration: Duration): Price {
  if (parking.free) return { kind: "free" };
  const published = parking.tariffs[String(duration) as keyof Parking["tariffs"]];
  if (published !== undefined) return { kind: "published", amount: published };
  if (duration < 60) {
    const hour = parking.tariffs["60"];
    if (hour !== undefined) {
      return {
        kind: "estimated",
        amount: roundCents((hour * duration) / 60),
        ceiling: hour,
      };
    }
  }
  return { kind: "unknown" };
}

export function priceAmount(price: Price): number | undefined {
  if (price.kind === "free") return 0;
  if (price.kind === "unknown") return undefined;
  return price.amount;
}

function roundCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatEuros(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function durationLabel(duration: Duration): string {
  if (duration === 1440) return "Journée";
  if (duration < 60) return `${duration} min`;
  return `${duration / 60} h`;
}

/**
 * Stationnement en voirie à Paris, tarif visiteur d’un véhicule standard.
 * Zone 1 : arrondissements 1 à 11, zone 2 : 12 à 20. Payant du lundi au samedi
 * de 9 h à 20 h, limité à 6 h consécutives, tarif progressif au-delà de 2 h.
 * paris.fr publie en texte la grille des deux-roues motorisés (moitié du tarif
 * voiture) ; la grille voiture n’y figure qu’en infographie. À revérifier à
 * chaque délibération municipale.
 */
export const PARIS_STREET = {
  /** Prix cumulés en euros par durée (minutes), zone 1 puis zone 2. */
  zone1: { 15: 1.5, 30: 3, 60: 6, 120: 12, 180: 24, 240: 39 } as Record<number, number>,
  zone2: { 15: 1, 30: 2, 60: 4, 120: 8, 180: 16, 240: 26 } as Record<number, number>,
  maxMinutes: 360,
  checkedOn: "2026-10-08",
  sourceUrl: "https://www.paris.fr/pages/payer-son-stationnement-2129",
} as const;

export function parisStreetPrice(
  citycode: string | undefined,
  duration: Duration,
): { zone: 1 | 2; amount: number } | { zone: 1 | 2; tooLong: true } | undefined {
  const match = citycode?.match(/^751(\d{2})$/);
  if (!match) return undefined;
  const arrondissement = Number(match[1]);
  if (arrondissement < 1 || arrondissement > 20) return undefined;
  const zone = arrondissement <= 11 ? 1 : 2;
  if (duration > PARIS_STREET.maxMinutes) return { zone, tooLong: true };
  const amount = (zone === 1 ? PARIS_STREET.zone1 : PARIS_STREET.zone2)[duration];
  return amount === undefined ? undefined : { zone, amount };
}
