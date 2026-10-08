import assert from "node:assert/strict";
import test from "node:test";
import { mergeParkings } from "../app/lib/merge.ts";
import { normalizeRecord, prettyName } from "../app/lib/normalize.ts";
import { parisStreetPrice, priceFor } from "../app/lib/pricing.ts";
import { rankParkings } from "../app/lib/ranking.ts";
import { loadParkings } from "../app/lib/sources.ts";
import type { Parking } from "../app/lib/types.ts";

// Lignes de test au format du schéma national tel qu’exporté par OpenDataSoft
// (clés en minuscules). Valeurs fictives, uniquement pour les tests.
const LOUVRE = { lat: 48.8606, lon: 2.3376 };
const rows = {
  near: {
    id: "75101-P-001", nom: "PARKING PRES DU MUSEE", adresse: "1 rue Test, 75001, Paris", type_usagers: "tous",
    gratuit: "false", nb_places: "500", hauteur_max: "190", geo_point_2d: { lat: 48.8611, lon: 2.3380 },
    tarif_1h: "4,80", tarif_2h: 9.6, tarif_24h: 40, delegataire: "Exploitant A",
  },
  cheap: {
    id: "75101-P-002", nom: "PARC DES HALLES", adresse: "2 rue Test, 75001, Paris", type_usagers: "tous",
    gratuit: false, xlong: 2.3445, ylat: 48.8620, tarif_1h: 3, tarif_2h: 6, tarif_24h: 30,
  },
  subscribersOnly: {
    id: "75101-P-003", nom: "RESIDENCE PRIVEE", type_usagers: "abonnés", xlong: 2.3377, ylat: 48.8607, tarif_1h: 1,
  },
  zeroMeansMissing: {
    id: "75101-P-004", nom: "PARKING SANS TARIF", type_usagers: "tous", gratuit: "false", xlong: 2.3390, ylat: 48.8600, tarif_1h: 0,
  },
};

test("normalise un enregistrement BNLS exporté par OpenDataSoft", () => {
  const parking = normalizeRecord(rows.near, "paris-ouvrages");
  assert.ok(parking);
  assert.equal(parking.name, "Parking Pres du Musee");
  assert.equal(parking.tariffs["60"], 4.8);
  assert.equal(parking.tariffs["120"], 9.6);
  assert.equal(parking.capacity, 500);
  assert.equal(parking.maxHeightCm, 190);
  assert.equal(parking.operator, "Exploitant A");
  assert.deepEqual([parking.lat, parking.lon], [48.8611, 2.338]);
});

test("exclut les parkings réservés aux abonnés", () => {
  assert.equal(normalizeRecord(rows.subscribersOnly, "paris-ouvrages"), undefined);
});

test("un tarif à 0 € sur un parking payant est traité comme non publié", () => {
  const parking = normalizeRecord(rows.zeroMeansMissing, "paris-ouvrages")!;
  assert.deepEqual(parking.tariffs, {});
  assert.equal(priceFor(parking, 60).kind, "unknown");
});

test("moins d’une heure : prorata estimé, plafonné au tarif 1 h ; au-delà, jamais extrapolé", () => {
  const parking = normalizeRecord(rows.near, "paris-ouvrages")!;
  assert.deepEqual(priceFor(parking, 15), { kind: "estimated", amount: 1.2, ceiling: 4.8 });
  assert.deepEqual(priceFor(parking, 120), { kind: "published", amount: 9.6 });
  assert.equal(priceFor(parking, 180).kind, "unknown");
  assert.deepEqual(priceFor(parking, 1440), { kind: "published", amount: 40 });
});

test("classements : moins cher, plus proche, meilleur choix", () => {
  const parkings = [rows.near, rows.cheap, rows.zeroMeansMissing].map((row) => normalizeRecord(row, "paris-ouvrages")!);
  const names = (mode: "best" | "cheapest" | "closest") =>
    rankParkings(parkings, LOUVRE, 120, mode).map((entry) => entry.parking.name);
  assert.deepEqual(names("cheapest"), ["Parc des Halles", "Parking Pres du Musee", "Parking Sans Tarif"]);
  assert.equal(names("closest")[0], "Parking Pres du Musee");
  // 3,60 € d’écart pour quelques minutes de marche : le moins cher reste le meilleur choix.
  assert.equal(names("best")[0], "Parc des Halles");
  // Sans tarif publié, un parking n’est jamais classé devant un parking au prix connu.
  assert.equal(names("best").at(-1), "Parking Sans Tarif");
});

test("fusionne la même entrée publiée par la Ville et par l’exploitant", () => {
  const paris = normalizeRecord(rows.near, "paris-ouvrages")!;
  const operator: Parking = {
    ...normalizeRecord({ ...rows.near, nom: "MUSEE", tarif_3h: 14, hauteur_max: undefined }, "saemes-bnls")!,
  };
  const merged = mergeParkings([[paris], [operator]]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].tariffs["180"], 14);
  assert.deepEqual(merged[0].sources, ["paris-ouvrages", "saemes-bnls"]);
});

test("voirie parisienne : zone selon l’arrondissement, limite de 6 h", () => {
  assert.deepEqual(parisStreetPrice("75101", 120), { zone: 1, amount: 12 });
  assert.deepEqual(parisStreetPrice("75115", 60), { zone: 2, amount: 4 });
  assert.deepEqual(parisStreetPrice("75108", 1440), { zone: 1, tooLong: true });
  assert.equal(parisStreetPrice("69381", 60), undefined);
});

test("une source en panne n’empêche pas les autres de répondre", async () => {
  const fakeFetch = (async (url: string) =>
    url.includes("saemes")
      ? new Response("oops", { status: 503 })
      : Response.json([rows.near, rows.cheap, rows.subscribersOnly])) as unknown as typeof fetch;
  const data = await loadParkings(fakeFetch);
  assert.equal(data.parkings.length, 2);
  assert.deepEqual(
    data.sources.map((source) => [source.id, source.ok]),
    [["paris-ouvrages", true], ["saemes-bnls", false]],
  );
});

test("noms lisibles", () => {
  assert.equal(prettyName("PORTE DE CHAMPERRET"), "Porte de Champerret");
  assert.equal(prettyName("Saint-Germain"), "Saint-Germain");
});
