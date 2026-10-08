import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ARRONDISSEMENTS, LANDMARKS } from "../../lib/places.ts";
import { aroundPoint, faqFor, inArrondissement, priceLine, SITE_URL } from "../../lib/seo.ts";
import { loadParkings } from "../../lib/sources.ts";
import { JsonLd, SeoShell } from "../../seo/components";
import ParkingTable from "../../seo/ParkingTable";

type Params = { params: Promise<{ slug: string }> };

async function build(slug: string) {
  const landmark = LANDMARKS.find((place) => place.slug === slug);
  const arrondissement = ARRONDISSEMENTS.find((arr) => arr.slug === slug);
  if (!landmark && !arrondissement) return undefined;
  const { parkings } = await loadParkings();
  if (landmark) {
    const summary = aroundPoint(parkings, landmark);
    return { name: landmark.name, short: `près de ${landmark.name}`, h1: `Parking près de ${landmark.name}`, summary, showWalk: true, link: `/?q=${encodeURIComponent(landmark.name)}&lat=${landmark.lat}&lon=${landmark.lon}&insee=${landmark.citycode}&d=120` };
  }
  const arr = arrondissement!;
  const summary = inArrondissement(parkings, arr.citycode);
  return { name: arr.label, short: `dans le ${arr.label}`, h1: `Parkings ${arr.label} : tarifs`, summary, showWalk: false, link: "/" };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const page = await build((await params).slug);
  if (!page) return {};
  const line = priceLine(page.summary);
  const title = `Parking ${page.short} : tarifs 1 h, 2 h, journée`;
  const description = `${page.summary.ranked.length} parkings ouverts à tous ${page.short}${line ? `, ${line}` : ""}. Comparez prix, distance à pied et horaires.`;
  const url = `${SITE_URL}/paris/${(await params).slug}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: page.summary.ranked.length > 0, follow: true },
    openGraph: { title: `${title} | ParkingPrix`, description, url, siteName: "ParkingPrix", type: "website" },
  };
}

export default async function Page({ params }: Params) {
  const slug = (await params).slug;
  const page = await build(slug);
  if (!page) notFound();
  const { summary } = page;
  const faq = faqFor(page.name, summary);
  const line = priceLine(summary);
  return (
    <SeoShell>
      <nav className="crumbs" aria-label="Fil d’Ariane">
        <Link href="/">ParkingPrix</Link> › <span>{page.name}</span>
      </nav>
      <h1 className="seo-h1">{page.h1}</h1>
      {summary.ranked.length ? (
        <>
          <p className="lead">
            {summary.ranked.length} parkings ouverts à tous {page.short}
            {line ? `, ${line}` : ""}. Tarifs publics publiés en open data par la Ville de Paris et les exploitants, sans abonnement.
          </p>
          <Link className="primary seo-cta" href={page.link}>
            Comparer pour ma durée
          </Link>
          <ParkingTable entries={summary.ranked} showWalk={page.showWalk} />
          <h2>Questions fréquentes</h2>
          <dl className="faq">
            {faq.map((item) => (
              <div key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
          <JsonLd
            data={[
              { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
                { "@type": "ListItem", position: 1, name: "ParkingPrix", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: page.name, item: `${SITE_URL}/paris/${slug}` },
              ] },
              { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((item) => ({ "@type": "Question", name: item.q, acceptedAnswer: { "@type": "Answer", text: item.a } })) },
            ]}
          />
        </>
      ) : (
        <p className="lead">Les tarifs ne sont pas disponibles pour le moment. Réessayez dans quelques instants.</p>
      )}
    </SeoShell>
  );
}
