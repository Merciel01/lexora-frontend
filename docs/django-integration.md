# LEXORA relié à Django

Le mode serveur est le défaut de développement et de build. La démo reste explicite (`VITE_APP_MODE=demo`) et les tests historiques la sélectionnent volontairement. Aucune donnée fictive locale ne remplace une erreur Django.

Cloner `XavierMombimbo/lexora-backend` et ce dépôt côte à côte. Dans le backend, installer les dépendances Python puis lancer `scripts/start-lexora.ps1` sous Windows. Front : http://127.0.0.1:5173 ; Django local : 8100, via proxy Vite. Le script conserve les autres services et utilise sa propre base SQLite, sauvegardée avant mise à jour. Ne pas mélanger localhost et 127.0.0.1 pour les cookies.

Inscription, connexion, profil, rôles, catalogue, pièces, notes privées, préférences, audiences, messages WS, reprise, résultats, historique et progression sont reliés aux routes Django. Les préférences restent mises en cache sur l'appareil pour le rendu ; le compte en est la source en mode serveur. Les notes nécessitent le bouton d'enregistrement et ne sont pas réutilisées entre comptes.

`npm run test:django` utilise un vrai serveur Django ASGI et une base temporaire, sans route interceptée. Sous Windows, définir `LEXORA_BACKEND_PYTHON` vers Python 3.12 et `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` si Chrome système est requis. Définir `LEXORA_TEST_PIPER_MODEL` pour vérifier aussi le WAV Piper authentifié. Le reste de la recette reste `npm run check` et `npm run test:e2e` (tests de démo et de contrat simulé conservés séparément).

Capture du vrai parcours : `docs/images/lexora-django-real.png`. Le test réel vérifie aussi que recharger un résultat n'attribue pas deux fois les XP et qu'un compte récupère notes et préférences après rechargement/reconnexion.

Voix : activation Piper côté backend et signal `ttsAvailable` ; transcription uniquement si `audioCodecs` est annoncé. Sans fournisseur STT configuré, saisie texte utilisable et aucune transcription réelle annoncée. Le moteur pédagogique local reste utilisable sans clé IA. SMTP non configuré : courrier de récupération dans la console Django. Le résultat est une évaluation pédagogique indicative, sans décision juridique réelle.

En production, servir le build et `/api`/`/ws` sous la même origine HTTPS avec proxy vers ASGI ; les serveurs Vite/Django de développement ne constituent pas un déploiement de production. Aucune mise en production n'a été effectuée.
