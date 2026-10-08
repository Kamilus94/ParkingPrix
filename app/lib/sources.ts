import { mergeParkings } from "./merge.ts";
import { normalizeRecord } from "./normalize.ts";
import type { Parking, ParkingsResponse, SourceId, SourceStatus } from "./types.ts";

type SourceDefinition = { id: SourceId; label: string; url: string; page: string };

/**
 * Sources ouvertes lues en direct, dans l’ordre de priorité de fusion.
 * Toutes deux suivent le schéma national des lieux de stationnement.
 */
export const SOURCES: SourceDefinition[] = [
  {
    id: "paris-ouvrages",
    label: "Ville de Paris · Stationnement en ouvrage",
    url: "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/stationnement-en-ouvrage/exports/json",
    page: "https://opendata.paris.fr/explore/dataset/stationnement-en-ouvrage/",
  },
  {
    id: "saemes-bnls",
    label: "Saemes · Lieux de stationnement",
    url: "https://opendata.saemes.fr/api/explore/v2.1/catalog/datasets/donnees-saemes-pour-base-nationale-des-lieux-de-stationnement-data-gouv/exports/json",
    page: "https://www.data.gouv.fr/datasets/donnees-saemes-pour-base-nationale-des-lieux-de-stationnement-data-gouv/",
  },
];

const CACHE_SECONDS = 6 * 60 * 60;
let memory: { at: number; value: ParkingsResponse } | undefined;

export async function loadParkings(fetcher: typeof fetch = fetch): Promise<ParkingsResponse> {
  if (memory && Date.now() - memory.at < CACHE_SECONDS * 1000) return memory.value;

  const results = await Promise.all(
    SOURCES.map(async (source): Promise<{ status: SourceStatus; parkings: Parking[] }> => {
      try {
        const response = await fetcher(source.url, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(15_000),
          // Cache Cloudflare : les jeux de données changent au plus une fois par jour.
          cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true },
        } as RequestInit);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const rows = (await response.json()) as unknown;
        if (!Array.isArray(rows)) throw new Error("Format inattendu");
        const parkings = rows
          .map((row) => (row && typeof row === "object" ? normalizeRecord(row as Record<string, unknown>, source.id) : undefined))
          .filter((parking): parking is Parking => parking !== undefined);
        return {
          status: { id: source.id, label: source.label, url: source.page, ok: true, count: parkings.length },
          parkings,
        };
      } catch (error) {
        return {
          status: {
            id: source.id,
            label: source.label,
            url: source.page,
            ok: false,
            count: 0,
            error: error instanceof Error ? error.message : "Source indisponible",
          },
          parkings: [],
        };
      }
    }),
  );

  const value: ParkingsResponse = {
    parkings: mergeParkings(results.map((result) => result.parkings)),
    sources: results.map((result) => result.status),
    fetchedAt: new Date().toISOString(),
  };
  if (results.every((result) => result.status.ok)) memory = { at: Date.now(), value };
  return value;
}
