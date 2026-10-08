/** Lieux de destination fréquents à Paris (coordonnées approximatives du lieu). */
export type Landmark = { slug: string; name: string; lat: number; lon: number; citycode: string; kind: "monument" | "gare" | "quartier" | "autre" };

export const LANDMARKS: Landmark[] = [
  { slug: "louvre", name: "Musée du Louvre", lat: 48.8606, lon: 2.3376, citycode: "75101", kind: "monument" },
  { slug: "tour-eiffel", name: "Tour Eiffel", lat: 48.8584, lon: 2.2945, citycode: "75107", kind: "monument" },
  { slug: "notre-dame", name: "Notre-Dame de Paris", lat: 48.853, lon: 2.3499, citycode: "75104", kind: "monument" },
  { slug: "arc-de-triomphe", name: "Arc de Triomphe et Champs-Élysées", lat: 48.8738, lon: 2.295, citycode: "75108", kind: "monument" },
  { slug: "sacre-coeur", name: "Sacré-Cœur et Montmartre", lat: 48.8867, lon: 2.3431, citycode: "75118", kind: "monument" },
  { slug: "centre-pompidou", name: "Centre Pompidou", lat: 48.8606, lon: 2.3522, citycode: "75104", kind: "monument" },
  { slug: "musee-d-orsay", name: "Musée d’Orsay", lat: 48.86, lon: 2.3266, citycode: "75107", kind: "monument" },
  { slug: "pantheon", name: "Panthéon", lat: 48.8462, lon: 2.3464, citycode: "75105", kind: "monument" },
  { slug: "jardin-du-luxembourg", name: "Jardin du Luxembourg", lat: 48.8462, lon: 2.3372, citycode: "75106", kind: "monument" },
  { slug: "grand-palais", name: "Grand Palais", lat: 48.8661, lon: 2.3125, citycode: "75008", kind: "monument" },
  { slug: "opera-garnier", name: "Opéra Garnier", lat: 48.872, lon: 2.3316, citycode: "75109", kind: "monument" },
  { slug: "galeries-lafayette", name: "Galeries Lafayette Haussmann", lat: 48.8738, lon: 2.332, citycode: "75109", kind: "autre" },
  { slug: "les-halles", name: "Les Halles", lat: 48.8625, lon: 2.347, citycode: "75101", kind: "quartier" },
  { slug: "hotel-de-ville", name: "Hôtel de Ville", lat: 48.8566, lon: 2.3522, citycode: "75104", kind: "monument" },
  { slug: "bastille", name: "Bastille", lat: 48.8531, lon: 2.3691, citycode: "75111", kind: "quartier" },
  { slug: "republique", name: "Place de la République", lat: 48.8675, lon: 2.3637, citycode: "75103", kind: "quartier" },
  { slug: "gare-de-lyon", name: "Gare de Lyon", lat: 48.8443, lon: 2.3744, citycode: "75112", kind: "gare" },
  { slug: "gare-du-nord", name: "Gare du Nord", lat: 48.8809, lon: 2.3553, citycode: "75110", kind: "gare" },
  { slug: "gare-de-l-est", name: "Gare de l’Est", lat: 48.8768, lon: 2.3592, citycode: "75110", kind: "gare" },
  { slug: "gare-montparnasse", name: "Gare Montparnasse", lat: 48.8412, lon: 2.3213, citycode: "75114", kind: "gare" },
  { slug: "gare-saint-lazare", name: "Gare Saint-Lazare", lat: 48.8761, lon: 2.3249, citycode: "75108", kind: "gare" },
  { slug: "gare-d-austerlitz", name: "Gare d’Austerlitz", lat: 48.8421, lon: 2.3659, citycode: "75113", kind: "gare" },
  { slug: "accor-arena-bercy", name: "Accor Arena (Bercy)", lat: 48.8387, lon: 2.3786, citycode: "75112", kind: "autre" },
  { slug: "roland-garros", name: "Stade Roland-Garros", lat: 48.847, lon: 2.253, citycode: "75116", kind: "autre" },
  { slug: "parc-des-princes", name: "Parc des Princes", lat: 48.8414, lon: 2.253, citycode: "75116", kind: "autre" },
  { slug: "porte-maillot", name: "Palais des Congrès (Porte Maillot)", lat: 48.8789, lon: 2.2833, citycode: "75117", kind: "autre" },
  { slug: "pitie-salpetriere", name: "Hôpital de la Pitié-Salpêtrière", lat: 48.8393, lon: 2.3641, citycode: "75113", kind: "autre" },
];

const ORDINALS = (n: number) => (n === 1 ? "1er" : `${n}e`);
export const ARRONDISSEMENTS = Array.from({ length: 20 }, (_, i) => ({
  slug: `paris-${ORDINALS(i + 1)}`,
  label: `Paris ${ORDINALS(i + 1)}`,
  citycode: `751${String(i + 1).padStart(2, "0")}`,
}));
