import Link from "next/link";
import type { ReactNode } from "react";
import { ARRONDISSEMENTS, LANDMARKS } from "../lib/places.ts";

export function SeoShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="shell nav">
          <Link href="/" className="brand" aria-label="ParkingPrix, accueil">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/parkingprix-logo.png" alt="Parking Prix" width={228} height={56} />
          </Link>
          <div className="nav-right">
            <a className="pill sister-link" href="https://essenceprix.com">
              EssencePrix
            </a>
          </div>
        </div>
      </header>
      <main className="seo-page">
        <div className="shell">{children}</div>
      </main>
      <footer>
        <div className="shell">
          <SeoLinks />
        </div>
      </footer>
    </div>
  );
}

export function SeoLinks() {
  return (
    <nav className="seo-links" aria-label="Parkings par lieu et par arrondissement">
      <strong>Parkings près de…</strong>
      <ul>
        {LANDMARKS.map((place) => (
          <li key={place.slug}>
            <Link href={`/paris/${place.slug}`}>{place.name}</Link>
          </li>
        ))}
      </ul>
      <strong>Parkings par arrondissement</strong>
      <ul>
        {ARRONDISSEMENTS.map((arr) => (
          <li key={arr.slug}>
            <Link href={`/paris/${arr.slug}`}>{arr.label}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
