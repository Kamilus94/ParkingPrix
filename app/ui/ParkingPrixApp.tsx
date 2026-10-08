"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  durationLabel,
  formatEuros,
  parisStreetPrice,
  PARIS_STREET,
} from "../lib/pricing.ts";
import { rankParkings, WALK_COST_PER_MINUTE, type RankedParking, type SortMode } from "../lib/ranking.ts";
import { parseOpenNow, parisMinutes } from "../lib/hours.ts";
import { navigationLinks } from "../lib/navigation.ts";
import { DURATIONS, type Duration, type ParkingsResponse, type SourceStatus } from "../lib/types.ts";

export const ESSENCEPRIX_URL = "https://essenceprix.com";

type Place = { label: string; detail: string; lat: number; lon: number; citycode?: string; kind: "poi" | "address" };

const SORTS: { id: SortMode; label: string }[] = [
  { id: "best", label: "Meilleur choix" },
  { id: "cheapest", label: "Moins cher" },
  { id: "closest", label: "Plus proche" },
];

const DEFAULT_DURATION: Duration = 60;

function readUrlState(): { place?: Place; duration: Duration; sort: SortMode } {
  const params = new URLSearchParams(window.location.search);
  const duration = Number(params.get("d"));
  const sort = params.get("tri") as SortMode | null;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const label = params.get("q");
  return {
    place:
      label && Number.isFinite(lat) && Number.isFinite(lon) && params.get("lat") && params.get("lon")
        ? { label, detail: "", lat, lon, citycode: params.get("insee") ?? undefined, kind: "address" }
        : undefined,
    duration: (DURATIONS as readonly number[]).includes(duration) ? (duration as Duration) : DEFAULT_DURATION,
    sort: sort && SORTS.some((option) => option.id === sort) ? sort : "best",
  };
}

function writeUrlState(place: Place | undefined, duration: Duration, sort: SortMode) {
  const params = new URLSearchParams();
  if (place) {
    params.set("q", place.label);
    params.set("lat", place.lat.toFixed(5));
    params.set("lon", place.lon.toFixed(5));
    if (place.citycode) params.set("insee", place.citycode);
  }
  params.set("d", String(duration));
  if (sort !== "best") params.set("tri", sort);
  window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
}

export default function ParkingPrixApp() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [place, setPlace] = useState<Place>();
  const [duration, setDuration] = useState<Duration>(DEFAULT_DURATION);
  const [sort, setSort] = useState<SortMode>("best");
  const [data, setData] = useState<ParkingsResponse>();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [hydrated, setHydrated] = useState(false);
  const [geoError, setGeoError] = useState<string>();
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const state = readUrlState();
    /* eslint-disable react-hooks/set-state-in-effect -- état initial lu depuis l’URL partagée */
    setDuration(state.duration);
    setSort(state.sort);
    if (state.place) {
      setPlace(state.place);
      setQuery(state.place.label);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (hydrated) writeUrlState(place, duration, sort);
  }, [hydrated, place, duration, sort]);

  useEffect(() => {
    if (!place) return;
    const controller = new AbortController();
    /* eslint-disable-next-line react-hooks/set-state-in-effect -- début de chargement */
    setStatus("loading");
    fetch(`/api/parkings?lat=${place.lat}&lon=${place.lon}`, { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as ParkingsResponse;
        if (!response.ok || !Array.isArray(body.parkings)) throw new Error("Sources indisponibles");
        setData(body);
        setStatus("idle");
      })
      .catch((error: unknown) => {
        if ((error as Error).name !== "AbortError") setStatus("error");
      });
    return () => controller.abort();
  }, [place]);

  function updateQuery(value: string) {
    setQuery(value);
    clearTimeout(searchTimer.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(value.trim())}`);
        const body = (await response.json()) as { places?: Place[] };
        setSuggestions(body.places ?? []);
        setSuggestionsOpen(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
  }

  function choose(next: Place) {
    setPlace(next);
    setQuery(next.label);
    setSuggestionsOpen(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (suggestions[0]) choose(suggestions[0]);
  }

  function locate() {
    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n’est pas disponible sur cet appareil.");
      return;
    }
    setGeoError(undefined);
    navigator.geolocation.getCurrentPosition(
      (position) =>
        choose({
          label: "Ma position",
          detail: "",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          kind: "address",
        }),
      () => setGeoError("Position non autorisée ou indisponible."),
    );
  }

  const ranked = useMemo(() => {
    if (!place || !data) return [];
    const near = rankParkings(data.parkings, place, duration, sort, 1000);
    // Peu de parkings à moins de 1 km : on élargit à 2 km plutôt que d’afficher une liste vide.
    return near.length >= 3 ? near : rankParkings(data.parkings, place, duration, sort, 2000);
  }, [place, data, duration, sort]);

  const street = place ? parisStreetPrice(place.citycode, duration) : undefined;
  const badge = SORTS.find((option) => option.id === sort)?.label;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="shell nav">
          <Link
            href="/"
            className="brand"
            aria-label="ParkingPrix, accueil"
            onClick={() => {
              setPlace(undefined);
              setQuery("");
              setData(undefined);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/parkingprix-logo.png" alt="Parking Prix" width={228} height={56} />
          </Link>
          <div className="nav-right">
            <a className="pill sister-link" href={ESSENCEPRIX_URL} title="EssencePrix : où faire le plein au meilleur prix">
              <FuelIcon />
              <span className="label">EssencePrix</span>
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className={`hero ${place ? "compact" : ""}`}>
          <div className="shell hero-grid">
            <div>
              {!place ? (
                <>
                  <div className="eyebrow">Le bon prix, sans tourner 20 minutes</div>
                  <h1>Trouvez un parking au meilleur prix.</h1>
                  <p className="hero-copy">
                    Entrez votre destination, choisissez votre durée et comparez les parkings ouverts à tous autour de
                    vous selon le prix, la distance à pied et les horaires.
                  </p>
                </>
              ) : null}

              <form className="search-card" onSubmit={submit} role="search">
                <label className="search-label" htmlFor="destination">
                  Destination
                </label>
                <div className="search-row">
                  <div className="input-wrap">
                    <PinIcon />
                    <input
                      id="destination"
                      className="search-input"
                      value={query}
                      onChange={(event) => updateQuery(event.target.value)}
                      onFocus={() => suggestions.length && setSuggestionsOpen(true)}
                      placeholder="Adresse, lieu ou ville…"
                      autoComplete="off"
                      inputMode="search"
                    />
                  </div>
                  <button className="primary" type="submit">
                    Rechercher
                  </button>
                  {suggestionsOpen && suggestions.length ? (
                    <ul className="suggestions">
                      {suggestions.map((suggestion) => (
                        <li key={`${suggestion.label}-${suggestion.lat}`}>
                          <button type="button" onClick={() => choose(suggestion)}>
                            <strong>{suggestion.label}</strong>
                            {suggestion.detail ? <small>{suggestion.detail}</small> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="search-bottom">
                  <div className="duration" role="radiogroup" aria-label="Durée de stationnement">
                    {DURATIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="radio"
                        aria-checked={duration === option}
                        className={duration === option ? "active" : ""}
                        onClick={() => setDuration(option)}
                      >
                        {durationLabel(option)}
                      </button>
                    ))}
                  </div>
                  <button className="locate" type="button" onClick={locate}>
                    ◎ Utiliser ma position
                  </button>
                </div>
                {geoError ? <p className="tiny">{geoError}</p> : null}
              </form>

              {!place ? (
                <div className="proof">
                  <span>Comparaison par durée</span>
                  <span>Distance à pied</span>
                  <span>Tarifs publics réels, sans réservation</span>
                </div>
              ) : null}
            </div>

            {!place ? (
              <div className="map-card" aria-hidden="true">
                <div className="road one" />
                <div className="road two" />
                <div className="road three" />
                <div className="pin p1"><span>P</span></div>
                <div className="pin p2"><span>P</span></div>
                <div className="pin p3"><span>P</span></div>
                <div className="pin p4"><span>P</span></div>
                <div className="map-float">
                  <strong>Meilleur choix à proximité</strong>
                  <div className="tiny">Prix + marche + durée pris en compte</div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {place ? (
          <section className="results" aria-live="polite">
            <div className="shell">
              <div className="results-head">
                <div>
                  <h2>
                    Parkings près de <span>{place.label}</span>
                  </h2>
                  <p>Prix pour {durationLabel(duration).toLowerCase()}, tarifs publics sans abonnement.</p>
                </div>
                <div className="sorts" role="tablist">
                  {SORTS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="tab"
                      aria-selected={sort === option.id}
                      className={sort === option.id ? "active" : ""}
                      onClick={() => setSort(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {status === "loading" && !data ? <p className="notice">Chargement des tarifs publics…</p> : null}
              {status === "error" ? (
                <p className="notice error">
                  Les sources de données ne répondent pas pour l’instant. Réessayez dans un moment.
                </p>
              ) : null}
              {street ? <StreetCard street={street} duration={duration} /> : null}
              {data && ranked.length === 0 && status !== "loading" ? (
                <p className="notice">
                  Aucun parking ouvert au public trouvé à moins de 2 km dans nos sources. ParkingPrix couvre Paris pour
                  l’instant.
                </p>
              ) : null}

              <ol className="cards">
                {ranked.map((entry, index) => (
                  <ParkingCard
                    key={entry.parking.id}
                    entry={entry}
                    duration={duration}
                    badge={index === 0 ? badge : undefined}
                  />
                ))}
              </ol>

              {sort === "best" && ranked.length ? (
                <p className="method">
                  Meilleur choix = prix du stationnement + marche aller-retour comptée {formatEuros(WALK_COST_PER_MINUTE)}{" "}
                  la minute.
                </p>
              ) : null}
            </div>
          </section>
        ) : (
          <section className="section" id="comment">
            <div className="shell">
              <div className="section-head">
                <div className="eyebrow">Comparateur neutre</div>
                <h2>Comparer sans perdre l’économie en chemin.</h2>
                <p>
                  Cherchez une destination, indiquez combien de temps vous restez, puis comparez les options réellement
                  pertinentes autour du point d’arrivée.
                </p>
              </div>
              <div className="features">
                <article className="feature">
                  <div className="feature-num">1</div>
                  <h3>Choisissez votre destination</h3>
                  <p>Adresse, lieu, gare ou ville : la recherche se concentre autour de l’endroit où vous allez.</p>
                </article>
                <article className="feature">
                  <div className="feature-num">2</div>
                  <h3>Réglez votre durée</h3>
                  <p>De 15 min à la journée : le classement s’adapte au coût correspondant à votre stationnement.</p>
                </article>
                <article className="feature">
                  <div className="feature-num">3</div>
                  <h3>Comparez prix et marche</h3>
                  <p>Le parking le moins cher n’est pas toujours le meilleur. La distance à pied reste visible.</p>
                </article>
              </div>
            </div>
          </section>
        )}
      </main>

      <SourcesFooter sources={data?.sources} fetchedAt={data?.fetchedAt} />
    </div>
  );
}

function ParkingCard({ entry, duration, badge }: { entry: RankedParking; duration: Duration; badge?: string }) {
  const { parking, price, walkMeters, walkMinutes } = entry;
  const openState = parseOpenNow(parking.hours, parisMinutes(new Date()));
  const distance = walkMeters < 1000 ? `${walkMeters} m` : `${(walkMeters / 1000).toFixed(1).replace(".", ",")} km`;
  return (
    <li className={`parking ${badge ? "top" : ""}`}>
      <div className="parking-top">
        <h3>{parking.name}</h3>
        {badge ? <span className="badge">{badge}</span> : null}
      </div>
      <div className="address">
        {parking.address || "Adresse non publiée"} · {distance} de la destination
      </div>
      <div className="stats">
        <div className="stat">
          <small>Marche</small>
          <strong>{walkMinutes} min</strong>
        </div>
        <div className="stat">
          <small>Horaires</small>
          <strong className={parking.hours ? "" : "dim"}>{parking.hours ?? "non publiés"}</strong>
          {openState ? <span className={`open-state ${openState}`}>{openState === "open" ? "Ouvert" : "Fermé"}</span> : null}
        </div>
        <div className="stat">
          <small>Places</small>
          <strong className={parking.capacity ? "" : "dim"}>{parking.capacity ?? "n.c."}</strong>
        </div>
      </div>
      {parking.maxHeightCm || parking.availability ? (
        <ul className="extra">
          {parking.maxHeightCm ? <li>Hauteur max {(parking.maxHeightCm / 100).toFixed(2).replace(".", ",")} m</li> : null}
          {parking.availability ? <li className="live">{parking.availability.free} places libres</li> : null}
        </ul>
      ) : null}
      <div className="parking-price">
        <div className="amount">
          {price.kind === "free" ? <strong>Gratuit</strong> : null}
          {price.kind === "published" ? <strong>{formatEuros(price.amount)}</strong> : null}
          {price.kind === "estimated" ? (
            <>
              <strong>≈ {formatEuros(price.amount)}</strong>
              <small title={`Prorata au quart d’heure du tarif 1 h (${formatEuros(price.ceiling)}), non publié par l’exploitant`}>
                estimé · max {formatEuros(price.ceiling)}
              </small>
            </>
          ) : null}
          {price.kind === "unknown" ? <strong className="unknown">Tarif non publié</strong> : null}
          <small>pour {durationLabel(duration).toLowerCase()}</small>
        </div>
        <GoMenu lat={parking.lat} lon={parking.lon} />
      </div>
      {parking.operator || parking.url ? (
        <p className="operator">
          {parking.operator}
          {parking.operator && parking.url ? " · " : ""}
          {parking.url ? (
            <a href={parking.url} target="_blank" rel="noopener noreferrer">
              Site de l’exploitant
            </a>
          ) : null}
        </p>
      ) : null}
    </li>
  );
}

export function GoMenu({ lat, lon }: { lat: number; lon: number }) {
  return (
    <details className="go-menu">
      <summary className="go">Y aller</summary>
      <div className="go-list">
        {navigationLinks({ lat, lon }).map((link) => (
          <a key={link.id} href={link.href} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        ))}
      </div>
    </details>
  );
}

function StreetCard({
  street,
  duration,
}: {
  street: NonNullable<ReturnType<typeof parisStreetPrice>>;
  duration: Duration;
}) {
  return (
    <aside className="street-card">
      <strong>Dans la rue (zone {street.zone})</strong>
      {"tooLong" in street ? (
        <span>Stationnement en voirie limité à 6 h : pas possible pour une journée.</span>
      ) : (
        <span>
          {formatEuros(street.amount)} pour {durationLabel(duration).toLowerCase()}, tarif visiteur Ville de Paris pour un
          véhicule standard (lundi au samedi, 9 h à 20 h), limité à 6 h, sous réserve de trouver une place.{" "}
          <a href={PARIS_STREET.sourceUrl} target="_blank" rel="noopener noreferrer">
            Source
          </a>
        </span>
      )}
    </aside>
  );
}

function SourcesFooter({ sources, fetchedAt }: { sources?: SourceStatus[]; fetchedAt?: string }) {
  return (
    <footer>
      <div className="shell footer-grid">
        <div>
          <div className="footer-brand">ParkingPrix</div>
          <p>
            <strong>Comparateur neutre.</strong> Tarifs publics publiés en open data par la Ville de Paris et les
            exploitants, pour un usager sans abonnement. Pas de réservation, pas de commission. Les parkings réservés aux
            abonnés, résidents, clients d’hôtels ou d’entreprises sont exclus.
          </p>
          {fetchedAt ? (
            <p>
              Données lues le{" "}
              {new Date(fetchedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" })}
            </p>
          ) : null}
        </div>
        <div>
          <strong>Sources des données</strong>
          <ul>
            {(sources ?? []).map((source) => (
              <li key={source.id}>
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.label}
                </a>{" "}
                {source.ok ? `· ${source.count} parkings` : "· indisponible"}
              </li>
            ))}
          </ul>
          <p>
            <a href={ESSENCEPRIX_URL}>EssencePrix</a> : où faire le plein au meilleur prix.
          </p>
        </div>
      </div>
    </footer>
  );
}

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s6-5.2 6-11A6 6 0 0 0 6 10c0 5.8 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.2" />
    </svg>
  );
}

function FuelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M6 9h6" strokeLinecap="round" />
      <path d="M14 10h2a2 2 0 0 1 2 2v4a1.5 1.5 0 0 0 3 0V8l-3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
