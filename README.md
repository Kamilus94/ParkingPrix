# ParkingPrix

Comparateur neutre des tarifs publics réels des parkings ouverts à tous, pour le stationnement urbain de courte durée (15 min à la journée). Même stack qu'EssencePrix (vinext sur Cloudflare Workers). Pas de réservation.

## Fonctionnement

1. L'utilisateur choisit une destination (géocodage IGN, adresses et lieux) et une durée.
2. `/api/parkings` lit les sources ouvertes, ne garde que les parkings `type_usagers = tous`, fusionne les doublons et filtre à 3 km.
3. Le navigateur calcule le prix pour la durée, la marche à pied et le classement (Meilleur choix / Moins cher / Plus proche).

## Sources (vérifiées sur les vrais exports, octobre 2026)

- Ville de Paris, `stationnement-en-ouvrage` : 125 parcs, 84 ouverts à tous (`type_usagers = tous`), tarifs 15 min, 30 min, 1 h, 2 h, 3 h, 4 h, 24 h, exploitant (`deleg`), horaires en texte (`horaire_na`). ODbL, mise à jour semestrielle.
- Saemes, BNLS : 63 lignes (dont 12 hors Paris), mêmes champs, tarifs en texte. 41 identifiants communs avec Paris : la fiche de la Ville prime.
- Pas de disponibilité en temps réel ouverte à Paris. Pas de tarifs Indigo, Q-Park ni Effia hors du jeu de la Ville.
- À ajouter : référentiel Saemes (horaires structurés, forfaits), NetEx Indigo (horaires).

Les tarifs 15 min et 30 min sont publiés tels quels. Au-delà d'1 h, aucune extrapolation : « non publié ». Sous 1 h sans tarif publié : prorata du tarif 1 h, marqué « estimé ».

## SEO

Pages générées côté serveur à partir des mêmes données : `/paris/[lieu]` (28 lieux), `/paris/paris-8e` (20 arrondissements), `/parking/[slug]` (une page par parking), `sitemap.xml`, `robots.txt`, données structurées (FAQ, fil d'Ariane, ParkingFacility). Une page sans données est en noindex.

## Commandes

- `npm install`, `npm run dev`, `npm test` (tests unitaires, sans réseau), `npm run build`, `npm run lint`

## Limites connues

- Le build et les tests passent, mais le site n'a pas encore tourné avec le vrai réseau : à valider au premier déploiement.
- Grille de voirie parisienne (`PARIS_STREET`) : valeurs 2-roues de paris.fr, grille voiture à confirmer.
- Coordonnées des lieux (`app/lib/places.ts`) approximatives.
