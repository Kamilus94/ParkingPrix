import Link from "next/link";
import { formatEuros } from "../lib/pricing.ts";
import type { RankedParking } from "../lib/ranking.ts";
import { parkingSlug, SEO_DURATIONS } from "../lib/seo.ts";
import type { Parking } from "../lib/types.ts";

function cell(parking: Parking, minutes: number) {
  if (parking.free) return "Gratuit";
  const value = parking.tariffs[String(minutes) as keyof Parking["tariffs"]];
  return value === undefined ? "n.p." : formatEuros(value);
}

export default function ParkingTable({ entries, showWalk }: { entries: RankedParking[]; showWalk: boolean }) {
  return (
    <div className="table-wrap">
      <table className="seo-table">
        <thead>
          <tr>
            <th>Parking</th>
            {showWalk ? <th>À pied</th> : null}
            {SEO_DURATIONS.map((d) => (
              <th key={d}>{d === 1440 ? "Journée" : `${d / 60} h`}</th>
            ))}
            <th>Horaires</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(({ parking, walkMinutes, walkMeters }) => (
            <tr key={parking.id}>
              <td>
                <Link href={`/parking/${parkingSlug(parking)}`}>{parking.name}</Link>
                <small>{parking.operator ?? ""}</small>
              </td>
              {showWalk ? <td>{walkMeters < 1000 ? `${walkMeters} m` : `${(walkMeters / 1000).toFixed(1).replace(".", ",")} km`} · {walkMinutes} min</td> : null}
              {SEO_DURATIONS.map((d) => (
                <td key={d}>{cell(parking, d)}</td>
              ))}
              <td>{parking.hours ?? "n.p."}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="tiny">n.p. : tarif non publié par la source. Tarifs publics sans abonnement.</p>
    </div>
  );
}
