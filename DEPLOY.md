# Déploiement (Cloudflare Workers)

Chaque push sur `main` lance les tests puis `vinext deploy` (GitHub Actions, `.github/workflows/deploy.yml`).

## À faire une fois

1. Créer un compte Cloudflare (gratuit).
2. Créer un jeton API : My Profile > API Tokens > modèle « Edit Cloudflare Workers ».
3. Noter l'Account ID (page d'accueil du compte, colonne de droite).
4. Dans GitHub > Settings > Secrets and variables > Actions, ajouter `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ACCOUNT_ID`.
5. Lancer le workflow « Deploy Cloudflare Workers » (bouton Run workflow). Le site est alors en ligne sur `parkingprix.<compte>.workers.dev`.

## Domaine parkingprix.com

1. Acheter le domaine, puis l'ajouter à Cloudflare (Add a site) et changer les serveurs de noms chez le registrar.
2. Décommenter `routes` dans `wrangler.jsonc`, pousser sur `main`.
3. Remplacer `https://parkingprix.com` dans `app/lib/seo.ts`, `app/layout.tsx` et `app/robots.ts` si le domaine diffère.
4. Dans la Search Console Google, déclarer le site et soumettre `/sitemap.xml`.

## Après la mise en ligne

Vérifier `/api/parkings?lat=48.86&lon=2.33` : les deux sources doivent répondre `"ok":true`. C'est le premier test sur le vrai réseau.
