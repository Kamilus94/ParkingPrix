import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatEuros } from "../../lib/pricing.ts";
import { LANDMARKS } from "../../lib/places.ts";
import { distanceMeters } from "../../lib/ranking.ts";
import { findParking, parkingSlug, SITE_URL } from "../../lib/seo.ts";
import { loadParkings } from "../../lib/sources.ts";
import { GoMenu } from "../../ui/ParkingPrixApp";
import { JsonLd, SeoShell } from "../../seo/components";

type Params = { params: Promise<{ slug: string }> };

const ROWS = [
  [15, "15 min"], [30, "30 min"], [60, "1 h"], [120, "2 h"], [180, "3 h"], [240, "4 h"], [1440, "Journée (24 h)"],
] as const;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const slug = (await params).slug;
  const parking = findParking((await loadParkings()).parkings, slug);
  if (!parking) return { robots: { index: false } };
  const hour = parking.tariffs["60"];
  const where = parking.arrondissement ? ` (Paris ${parking.arrondissement === "1" ? "1er" : `${parking.arrondissement}e`})` : "";
  const title = `Parking ${parking.name}${where} : tarifs et horaires`;
  const description = `Tarifs du parking ${parking.name}${parking.address ? `, ${parking.address}` : ""}${hour !== undefined ? ` : ${formatEuros(hour)} pour 1 h` : ""}${parking.tariffs["1440"] !== undefined ? `, ${formatEuros(parking.tariffs["1440"])} la journée` : ""}. Horaires, places, hauteur max.`;
  const url = `${SITE_URL}/parking/${slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title: `${title} | ParkingPrix`, description, url, siteName: "ParkingPrix", type: "website" } };
}

export default async function Page({ params }: Params) {
  const slug = (await params).slug;
  const { parkings } = await loadParkings();
  const parking = findParking(parkings, slug);
  if (!parking) notFound();
  const near = LANDMARKS.map((place) => ({ place, m: distanceMeters(parking.lat, parking.lon, place.lat, place.lon) }))
    .filter((item) => item.m < 1200)
    .sort((a, b) => a.m - b.m)
    .slice(0, 4);
  const similar = parkings
    .filter((other) => other !== parking && distanceMeters(parking.lat, parking.lon, other.lat, other.lon) < 800)
    .sort((a, b) => distanceMeters(parking.lat, parking.lon, a.lat, a.lon) - distanceMeters(parking.lat, parking.lon, b.lat, b.lon))
    .slice(0, 5);
  return (
    <SeoShell>
      <nav className="crumbs" aria-label="Fil d’Ariane">
        <Link href="/">ParkingPrix</Link> › <span>{parking.name}</span>
      </nav>
      <h1 className="seo-h1">Parking {parking.name} : tarifs et horaires</h1>
      <p className="lead">
        {parking.address || "Adresse non publiée"}
        {parking.operator ? ` · exploité par ${parking.operator}` : ""}
        {parking.capacity ? ` · ${parking.capacity} places` : ""}
      </p>
      <div className="seo-actions">
        <GoMenu lat={parking.lat} lon={parking.lon} />
        {parking.url ? (
          <a className="pill" href={parking.url} target="_blank" rel="noopener noreferrer">
            Site de l’exploitant
          </a>
        ) : null}
      </div>
      <h2>Tarifs (usager sans abonnement)</h2>
      <div className="table-wrap">
        <table className="seo-table">
          <thead><tr><th>Durée</th><th>Prix</th></tr></thead>
          <tbody>
            {ROWS.map(([minutes, label]) => {
              const value = parking.tariffs[String(minutes) as keyof typeof parking.tariffs];
              return value === undefined ? null : (
                <tr key={minutes}><td>{label}</td><td>{formatEuros(value)}</td></tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <h2>Horaires et accès</h2>
      <ul className="facts-list">
        <li>Horaires : {parking.hours ?? "non publiés par la source"}</li>
        {parking.maxHeightCm ? <li>Hauteur maximale : {(parking.maxHeightCm / 100).toFixed(2).replace(".", ",")} m</li> : null}
        {parking.pmrPlaces ? <li>Places PMR : {parking.pmrPlaces}</li> : null}
        {parking.evPlaces ? <li>Places équipées pour véhicules électriques : {parking.evPlaces}</li> : null}
      </ul>
      {near.length ? (
        <>
          <h2>À proximité</h2>
          <ul className="facts-list">
            {near.map(({ place, m }) => (
              <li key={place.slug}><Link href={`/paris/${place.slug}`}>Parking près de {place.name}</Link> ({Math.round(m)} m)</li>
            ))}
          </ul>
        </>
      ) : null}
      {similar.length ? (
        <>
          <h2>Autres parkings à moins de 800 m</h2>
          <ul className="facts-list">
            {similar.map((other) => (
              <li key={other.id}><Link href={`/parking/${parkingSlug(other)}`}>{other.name}</Link></li>
            ))}
          </ul>
        </>
      ) : null}
      <p className="tiny">Tarifs publics publiés en open data. Vérifiez le tarif affiché à l’entrée du parking.</p>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ParkingFacility",
          name: parking.name,
          address: parking.address ? { "@type": "PostalAddress", streetAddress: parking.address, addressCountry: "FR" } : undefined,
          geo: { "@type": "GeoCoordinates", latitude: parking.lat, longitude: parking.lon },
          maximumAttendeeCapacity: parking.capacity,
          url: `${SITE_URL}/parking/${slug}`,
        }}
      />
    </SeoShell>
  );
}
