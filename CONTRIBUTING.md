# Développer le frontend Lexora

Le frontend de référence reste React, TypeScript et Vite. Le dossier Next.js du
workspace SkillForge est un projet distinct et ne doit pas être copié ici.

## Installation

Utiliser la version Node de `.nvmrc`, puis `npm ci`. Sous PowerShell :

```powershell
Copy-Item .env.example .env
npm run dev
```

Sous macOS/Linux, remplacer la copie par `cp .env.example .env`.
Ouvrir l'adresse affichée par Vite, puis `/app`. Le mode `demo` fonctionne sans
backend ; les données saisies doivent être fictives.

## Branches et validation

`main` contient la version stable ; `develop` accueille le développement frontend.
Créer les branches de travail depuis `develop` :

```sh
git switch develop
git pull --ff-only origin develop
git switch -c feat/nom-de-la-fonctionnalite
npm run check
npx playwright install chromium
npm run test:e2e
```

Ouvrir une pull request vers `develop`, puis une pull request de livraison vers
`main`. La CI vérifie ces deux branches et toutes les pull requests. Les règles
de protection GitHub restent à configurer par le propriétaire du dépôt.

`npm run check` vérifie les types, le lint, les tests unitaires, la génération du
contrat et le build. Après une modification des schémas, inclure la mise à jour
de `docs/openapi-proposed.json` dans le commit. La CI contrôle sa synchronisation.
Les E2E démarrent deux serveurs sur 5173 et 5174 ; arrêter les serveurs manuels
avant de les lancer. Le mode serveur utilise des réponses interceptées, pas
une connexion réelle à Django.

## Travail avec le backend séparé

Backend : [XavierMombimbo/lexora-backend](https://github.com/XavierMombimbo/lexora-backend)
(privé, accès requis). Cloner les deux dépôts côte à côte.

Le code Django initial vient de SkillForge. **Il n'implémente pas encore le
contrat de ce frontend** : JWT au lieu de cookies de session, routes
`/simulations/` et `/sessions/` au lieu de `/cases` et `/trials`, et protocole WS
différent. Le mode serveur attend l'adaptation de ces frontières. Ne pas
remplacer les adaptateurs frontend par un mélange de ces deux contrats.

Pour préparer le proxy, une fois les endpoints adaptés, utiliser dans `.env` :

```dotenv
VITE_APP_MODE=server
VITE_API_BASE_URL=/api
VITE_WS_BASE_URL=
LEXORA_DJANGO_PROXY=http://127.0.0.1:8000
```

Redémarrer Vite après un changement d'environnement. Les secrets Django, Groq
et autres fournisseurs restent uniquement dans le backend. Toutes les variables
`VITE_*` sont publiques. Voir [le contrat](docs/backend-contract.md) pour REST,
CSRF, WebSocket, audio et les vérifications communes restantes.
