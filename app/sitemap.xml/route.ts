import { ARRONDISSEMENTS, LANDMARKS } from "../lib/places.ts";
import { parkingSlug, SITE_URL } from "../lib/seo.ts";
import { loadParkings } from "../lib/sources.ts";

export async function GET() {
  const { parkings } = await loadParkings();
  const urls = [
    "/",
    ...LANDMARKS.map((place) => `/paris/${place.slug}`),
    ...ARRONDISSEMENTS.map((arr) => `/paris/${arr.slug}`),
    ...parkings.map((parking) => `/parking/${parkingSlug(parking)}`),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((path) => `  <url><loc>${SITE_URL}${path}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, s-maxage=3600" } });
}
