import { distanceMeters } from "../../lib/ranking.ts";
import { loadParkings } from "../../lib/sources.ts";

/** Rayon maximal servi au navigateur ; le classement filtre ensuite à pied. */
const MAX_RADIUS_METERS = 3000;

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (
    !params.get("lat") ||
    !params.get("lon") ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 ||
    lat > 90 ||
    lon < -180 ||
    lon > 180
  ) {
    return Response.json({ error: "Coordonnées invalides" }, { status: 400 });
  }

  const data = await loadParkings();
  const parkings = data.parkings.filter(
    (parking) => distanceMeters(lat, lon, parking.lat, parking.lon) <= MAX_RADIUS_METERS,
  );
  const allFailed = data.sources.every((source) => !source.ok);
  return Response.json(
    { ...data, parkings },
    {
      status: allFailed ? 502 : 200,
      headers: allFailed ? { "Cache-Control": "no-store" } : { "Cache-Control": "public, s-maxage=1800" },
    },
  );
}
