# Contrat frontend / Django — proposition v1

**Statut : implémenté et testé contre des réponses simulées, non validé sur un backend Django réel.** L’OpenAPI de Django devra primer sur cette proposition. Les hypothèses sont concentrées dans `src/services/api.ts`, `contracts.ts` et `realtime.ts`.

## Démarrage pour l’équipe backend

1. Exécuter `npm ci`, puis `npm run dev` pour parcourir la démo sans service externe.
2. Examiner `docs/openapi-proposed.json` et les schémas Zod de `src/services/contracts.ts`.
3. Copier `.env.example`, passer `VITE_APP_MODE=server` et configurer l’origine API/WS.
4. Implémenter ou adapter les endpoints et les messages décrits ci-dessous.
5. Vérifier authentification, autorisations, reprise et audio avec un vrai serveur, puis remplacer les hypothèses validées dans ce document.

## Authentification et REST

Base configurable `VITE_API_BASE_URL`, proposée `/api`. Les exemples omettent les barres finales ; aligner cette convention avec Django. Cookies de session HttpOnly/Secure gérés par Django, `credentials: include`. Aucun jeton en localStorage ni dans l’URL WebSocket.

Avant une mutation, `GET /auth/csrf` retourne `{ "csrfToken": "…" }`. Le frontend le garde en mémoire et transmet `X-CSRFToken`. Django doit vérifier le cookie, l’en-tête, l’origine et les droits. En cas de 401, le frontend invalide sa session et revient à la connexion. Un 403 reste un refus explicite.

| Méthode | Chemin | Objet |
| --- | --- | --- |
| POST | /auth/login | `{email,password}` ; cookie de session |
| POST | /auth/logout | Fermer la session |
| POST | /auth/register | `{name,email,password}` ; confirmation à définir |
| POST | /auth/forgot-password | `{email}` ; réponse non énumérante |
| POST | /auth/reset-password | `{uid,token,password}` ; lien à usage limité |
| GET / PATCH | /me | Profil ; PATCH `{name}` |
| GET | /roles | Tableau de rôles avec `unlocked` et `condition` |
| GET | /cases | Recherche et filtres : `search,domain,difficulty,role_id,page,page_size` |
| GET | /cases/:id | Faits, rôles compatibles, pièces du dossier |
| POST | /trials | `{roleId,caseId}` ; snapshot initial |
| GET | /trials/:id | Snapshot autoritaire et capacité de reprise |
| GET | /trials/:id/result | Verdict ou 202/404 tant qu’il n’est pas disponible |
| GET | /trials | Historique paginé |

Listes paginées : `{results: [...], count, page, pageSize}`. Le client ne suit jamais une URL de pagination arbitraire. Les critères et pondérations, récompenses et citations sont des données, sans formule juridique côté navigateur. Un résultat consulté ne déclenche aucune mutation de XP. Le serveur reste responsable de l’attribution unique des récompenses.

Pièces : `{id,caseId,title,mediaType:'text'|'pdf'|'image',content?,url?,downloadAllowed}`. Les aperçus sont limités à la même origine que l’application : servir par proxy Django si nécessaire. Les liens de citations acceptent HTTP/HTTPS, sans identifiants ; nouveaux onglets avec protection. Aucun téléversement de pièces n’est prévu.

## Snapshot et protocole WebSocket

Un WebSocket par procès. `websocketUrl` vient du snapshot et son origine doit correspondre à `VITE_WS_BASE_URL` (ou celle de l’application). Aucune query string acceptée pour éviter d’y placer un secret. HTTPS exige WSS. Les cookies authentifient la connexion ; vérifier les droits sur le procès et l’en-tête Origin côté Channels.

Snapshot : `id,caseId,roleId,step,entries,seen,presented,objection,finished,canResume,allowedActions,activeSpeaker,startedAt,seq,audioCodecs,websocketUrl?,endAt?`. `step` suit les sept phases dans l’ordre 0 à 6. `seq` est la dernière séquence serveur intégrée au snapshot. `allowedActions` est l’autorité d’activation des contrôles. `endAt`, s’il existe, est une date ISO serveur ; sinon le frontend affiche uniquement un temps écoulé.

Locuteurs : `president`, `assessor-1`, `assessor-2`, `prosecutor`, `opposition`, `clerk`, `student`.

Client → serveur, JSON :

```json
{"version":1,"type":"user_text","trialId":"trial-1","clientMessageId":"uuid-stable","text":"Mon argument…","timestamp":"2026-11-09T10:00:00Z"}
```

Autres actions : `present_exhibit` avec `exhibitId`, et `user_audio` selon la section suivante. `continue` existe pour les étapes explicites du scénario démo ; un backend réel peut ne jamais l’autoriser. Le frontend ne déduit pas seul le changement de phase.

Accusé obligatoire avant effacement d’un brouillon :

```json
{"type":"ack","clientMessageId":"uuid-stable","accepted":true}
```

Un refus porte `accepted:false` et éventuellement `reason`. Un message refusé ou sans accusé reste réessayable **avec le même clientMessageId**. Le backend doit rendre l’action idempotente. Aucun message ni audio n’est rejoué automatiquement lors d’une reconnexion.

Serveur → client, séquence strictement croissante et identifiant unique :

```json
{"type":"turn","eventId":"e1","seq":1,"turnId":"t1","speaker":"president","text":"Maître, sur quelle pièce vous appuyez-vous ?","emotion":"severe","gesture":"point","objection":false}
```

- `phase_change` : `step,allowedActions,endAt?`.
- `snapshot` : snapshot complet cohérent avec `eventId,seq`.
- `verdict` : objet verdict complet.
- `audio` : `turnId,sentenceIndex,url,speaker` ; phrases indexées à partir de 0.
- `interrupt` : `turnId` ; annulation de la voix de ce tour.

Chaque événement porte `eventId,seq`. Les identifiants de procès sont implicites dans le canal dédié. Une séquence manquante déclenche GET snapshot avant la reprise des actions. Les événements reçus pendant le chargement du snapshot sont conservés dans un tampon borné à 100 éléments puis réconciliés par séquence. Un événement inconnu est ignoré sans journaliser son contenu sensible. Les doublons sont ignorés. Le contrat exact peut être remplacé par l’OpenAPI et le protocole validés côté backend.

Reconnexion : backoff exponentiel avec jitter, cinq tentatives, puis bouton manuel. Un nouveau snapshot est chargé à l’ouverture et à chaque reconnexion. Fermetures 1008/4401/4403 : accès/session terminale. La capture s’arrête lors d’une interruption ; cela ne signifie jamais que le serveur a mis l’audience en pause.

## Audio proposé — négociation requise

`audioCodecs` doit lister les MIME exacts acceptés par le STT. Une liste absente ou vide désactive l’envoi vocal réel. Le navigateur sélectionne un MIME accepté et supporté parmi WebM/Opus, Ogg/Opus et MP4. Aucun codec n’est renommé en PCM. Si Django exige PCM, il faudra négocier fréquence/canaux et ajouter un encodeur AudioWorklet adapté.

Capture maximale : 60 secondes ou 8 Mo. Proposition de transmission : un en-tête JSON `user_audio` avec `version,trialId,clientMessageId,mimeType,byteLength,final:true`, immédiatement suivi d’un unique message binaire Blob. Il s’agit d’une proposition pour intervention complète, **pas d’un STT streaming déjà validé**. Le backend doit lier le binaire au message et renvoyer l’ack correspondant. Une conservation des enregistrements n’est pas prévue côté navigateur.

TTS : URL de phrase servie sur la même origine, `sentenceIndex` contigu à partir de 0, queue bornée à 40 phrases, une voix à la fois. L’UI peut arrêter ou réessayer la lecture et maintient la transcription. Mesure disponible du délai réception → lecture, sans promesse sur la latence IA/STT/TTS. La bouche utilise une animation procédurale approximative ; les visèmes horodatés restent à convenir si le service TTS les fournit.

## Vérification commune restante

Authentification réelle, CSRF, CORS/HTTPS/WSS, tri et pagination d’historique volumineux, droits sur les pièces, races snapshot/événements, formats audio, expiration, idempotence serveur, attribution des XP et exactitude des citations. Les tests Playwright `server.spec.ts` exercent le contrat proposé avec REST et WebSocket simulés ; ils ne remplacent pas un test Django.

## Guide pédagogique de préparation

Proposition supplémentaire : `POST /cases/:id/guide`, avec cookies/CSRF, requête idempotente et réponse structurée. Le contexte juridique et les droits restent sous l’autorité Django ; aucune clé IA côté frontend. Voir [le guide d’intégration détaillé](preparation-guide.md) et les schémas `guideRequestSchema` / `guideResponseSchema` dans l’OpenAPI proposé. Le mode démo utilise exclusivement des conseils prédéfinis explicitement signalés.
