/** Durées proposées, en minutes. `1440` correspond à « Journée » (tarif 24 h). */
export const DURATIONS = [15, 30, 60, 120, 180, 240, 1440] as const;
export type Duration = (typeof DURATIONS)[number];

export type SourceId = "paris-ouvrages" | "saemes-bnls";

/** Tarifs publiés, en euros TTC, pour un usager sans abonnement. */
export type Tariffs = {
  "15"?: number;
  "30"?: number;
  "60"?: number;
  "120"?: number;
  "180"?: number;
  "240"?: number;
  "1440"?: number;
};

export type Parking = {
  id: string;
  /** Identifiant du schéma national (ex. 75107-P-060), commun aux sources qui republient un même parking. */
  ref?: string;
  name: string;
  citycode?: string;
  arrondissement?: string;
  address: string;
  lat: number;
  lon: number;
  operator?: string;
  url?: string;
  free: boolean;
  tariffs: Tariffs;
  capacity?: number;
  pmrPlaces?: number;
  evPlaces?: number;
  maxHeightCm?: number;
  /** Horaires tels que publiés par la source, sans réinterprétation. */
  hours?: string;
  info?: string;
  sources: SourceId[];
  /** Places libres en temps réel, uniquement quand une source les publie. */
  availability?: { free: number; updatedAt: string };
};

export type SourceStatus = {
  id: SourceId;
  label: string;
  url: string;
  ok: boolean;
  count: number;
  error?: string;
};

export type ParkingsResponse = {
  parkings: Parking[];
  sources: SourceStatus[];
  fetchedAt: string;
};
