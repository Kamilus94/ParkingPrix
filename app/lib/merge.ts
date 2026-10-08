import { distanceMeters } from "./ranking.ts";
import type { Parking } from "./types.ts";

/**
 * Un même parking peut figurer chez la Ville et chez son exploitant (Saemes
 * publie aussi les parcs qu’elle exploite pour la Ville de Paris). On fusionne
 * deux fiches qui portent le même identifiant national, ou dont les entrées sont à
 * moins de 60 m et dont les noms partagent un mot significatif. La première source garde la priorité ; la seconde
 * complète les champs manquants.
 */
export function mergeParkings(lists: Parking[][]): Parking[] {
  const merged: Parking[] = [];
  for (const list of lists) {
    for (const candidate of list) {
      const twin = merged.find(
        (existing) =>
          (existing.ref !== undefined && existing.ref === candidate.ref) ||
          (distanceMeters(existing.lat, existing.lon, candidate.lat, candidate.lon) < 60 &&
            sharesNameWord(existing.name, candidate.name)),
      );
      if (!twin) {
        merged.push({ ...candidate, tariffs: { ...candidate.tariffs } });
        continue;
      }
      twin.tariffs = { ...candidate.tariffs, ...twin.tariffs };
      twin.operator ??= candidate.operator;
      twin.citycode ??= candidate.citycode;
      twin.arrondissement ??= candidate.arrondissement;
      twin.url ??= candidate.url;
      twin.capacity ??= candidate.capacity;
      twin.pmrPlaces ??= candidate.pmrPlaces;
      twin.evPlaces ??= candidate.evPlaces;
      twin.maxHeightCm ??= candidate.maxHeightCm;
      twin.hours ??= candidate.hours;
      twin.info ??= candidate.info;
      twin.availability ??= candidate.availability;
      for (const source of candidate.sources) {
        if (!twin.sources.includes(source)) twin.sources.push(source);
      }
    }
  }
  return merged;
}

const STOP_WORDS = new Set(["parking", "parc", "de", "du", "des", "la", "le", "les", "saint", "st", "paris", "place", "rue", "avenue", "boulevard"]);

function words(name: string): Set<string> {
  return new Set(
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
  );
}

function sharesNameWord(a: string, b: string): boolean {
  const left = words(a);
  for (const word of words(b)) if (left.has(word)) return true;
  return false;
}
