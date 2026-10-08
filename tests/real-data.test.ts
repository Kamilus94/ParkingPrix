import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseOpenNow } from "../app/lib/hours.ts";
import { mergeParkings } from "../app/lib/merge.ts";
import { navigationLinks } from "../app/lib/navigation.ts";
import { normalizeRecord } from "../app/lib/normalize.ts";
import { priceFor } from "../app/lib/pricing.ts";
import type { Parking } from "../app/lib/types.ts";

// Lignes réelles extraites des exports Paris Data et Saemes (octobre 2026).
const rows = JSON.parse(readFileSync(new URL("./fixtures/real-rows.json", import.meta.url), "utf8")) as {
  paris: Record<string, unknown>[];
  saemes: Record<string, unknown>[];
};
const paris = rows.paris.map((row) => normalizeRecord(row, "paris-ouvrages")).filter(Boolean) as Parking[];
const saemes = rows.saemes.map((row) => normalizeRecord(row, "saemes-bnls")).filter(Boolean) as Parking[];

test("Paris : champs réels lus, abonnés exclus", () => {
  assert.deepEqual(paris.map((p) => p.name), ["Invalides", "Jean Bouin"]);
  const invalides = paris[0];
  assert.equal(invalides.operator, "Indigo");
  assert.equal(invalides.hours, "24h / 24");
  assert.equal(invalides.citycode, "75107");
  assert.equal(invalides.tariffs["15"], 1.35);
  assert.equal(invalides.tariffs["30"], 2.7);
  assert.equal(invalides.tariffs["1440"], 48.6);
  assert.deepEqual(priceFor(invalides, 15), { kind: "published", amount: 1.35 });
});

test("Saemes : tarifs en texte, accès non renseigné exclu, recopie du nombre de places écartée", () => {
  assert.deepEqual(saemes.map((p) => p.name), ["Jean Bouin", "Champs Elysees"]);
  const champs = saemes[1];
  assert.equal(champs.tariffs["120"], 11);
  assert.equal(champs.citycode, "75008");
  assert.equal(champs.evPlaces, undefined);
});

test("la même fiche publiée par la Ville et par Saemes est fusionnée, la Ville prime", () => {
  const merged = mergeParkings([paris, saemes]);
  assert.equal(merged.length, 3);
  const bouin = merged.find((p) => p.name === "Jean Bouin")!;
  assert.equal(bouin.tariffs["60"], 4.4);
  assert.deepEqual(bouin.sources, ["paris-ouvrages", "saemes-bnls"]);
});

test("horaires : ouvert ou fermé seulement quand le texte est sans ambiguïté", () => {
  const at = (h: number, m = 0) => h * 60 + m;
  assert.equal(parseOpenNow("24h / 24", at(3)), "open");
  assert.equal(parseOpenNow("07h / 23h", at(6, 59)), "closed");
  assert.equal(parseOpenNow("07h / 23h", at(12)), "open");
  assert.equal(parseOpenNow("5h / 1h30", at(0, 30)), "open");
  assert.equal(parseOpenNow("5h / 1h30", at(3)), "closed");
  assert.equal(parseOpenNow("8h / 19h30 sauf dim et jrs fériés", at(12)), undefined);
  assert.equal(parseOpenNow(undefined, at(12)), undefined);
});

test("liens d’itinéraire vers Google Maps, Plans et Waze", () => {
  const links = navigationLinks({ lat: 48.859287, lon: 2.31466 });
  assert.equal(links.length, 3);
  assert.ok(links[0].href.includes("destination=48.859287,2.314660"));
  assert.ok(links[2].href.startsWith("https://waze.com/ul?ll=48.859287,2.314660"));
});

import { aroundPoint, faqFor, findParking, inArrondissement, parkingSlug, priceLine, slugify } from "../app/lib/seo.ts";

test("SEO : slugs stables et uniques, résumé de prix et FAQ calculés sur les tarifs publiés", () => {
  const all = mergeParkings([paris, saemes]);
  assert.equal(slugify("Musée d’Orsay"), "musee-d-orsay");
  const slugs = all.map(parkingSlug);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.equal(findParking(all, "invalides-75107-p-060")?.name, "Invalides");
  const summary = aroundPoint(all, { lat: 48.8593, lon: 2.3146 });
  assert.equal(summary.lowest[60]?.amount, 5.4);
  assert.match(priceLine(summary) ?? "", /5,40/);
  assert.ok(faqFor("Invalides", summary).some((item) => item.a.includes("5,40")));
  assert.equal(inArrondissement(all, "75107").ranked.length, 1);
});
