# État d’implémentation — version 0.2.0

## Frontend livré

- Routes du parcours complet, connexion/inscription/récupération/réinitialisation, 404 et accès refusé.
- React/TypeScript strict, providers de requêtes, adaptateurs et schémas réseau distincts, erreurs de page isolées.
- Identité Figma, polices locales, layouts responsive, navigation mobile avec focus contenu, dialogues accessibles et onglets clavier.
- Rôles autorisés, verrouillage, dossiers compatibles, recherche temporisée, filtres et pagination de bibliothèque et d’historique.
- Quatre dossiers et pièces distinctes ; notes locales limitées et suppression confirmée ; aperçu texte/image/PDF avec validation des URL et téléchargement conditionnel.
- Sessions démo indépendantes, historique et résultats par audience, récompenses démo idempotentes.
- Critères et pondérations pilotés par données, issue du litige distincte du score, citations consultables lorsqu’elles sont fournies, impression.
- Test d’équipement, niveau sonore et absence de signal, capture MediaRecorder par maintien/toggle avec nettoyage et limites, écoute locale sans téléversement en démo.
- File audio ordonnée, bornée, dédupliquée, interruption et réessai ; voix locale de simulation et URLs TTS serveur via adaptateur.
- États explicites d’audience, brouillon conservé jusqu’à acceptation, réessai avec identifiant stable, droits d’action issus du snapshot.
- REST complet selon proposition : session/CSRF, rôles, dossiers, procès, résultats, historique et profil. Aucun fallback mock en mode serveur.
- WebSocket proposé : resynchronisation, séquence, déduplication, backoff avec jitter et limite, expiration terminale et reprise manuelle, envois bornés et nettoyage.
- Sept personnages procéduraux, écoute/parole/bras d’objection/bouche approximative, caméra générale/intervenant, valeurs inconnues normalisées, qualité et mouvement réduit, alternative texte.
- Préférences locales son, sous-titres, voix, qualité 3D, capture accessible et mouvement réduit.
- Tests unitaires et E2E demo/contrat Django simulé ; workflow GitHub Actions.

## Dépendances de l’équipe backend — non validées

Le contrat proposé n’est pas celui d’un backend déjà livré. Il reste à confirmer endpoints, schémas, auth/cookies/CSRF/CORS, droits sur les procès, séquences/snapshots, politique de reprise, codecs, binaire audio et TTS. Les fournisseurs IA et données juridiques ne doivent jamais être appelés directement par ce frontend.

Si Django exige PCM ou du STT streaming, l’adaptateur audio devra être adapté ; le client actuel négocie un codec compressé et envoie une intervention complète. Si des visèmes sont disponibles, les relier à une couche d’animation dédiée ; la bouche actuelle reste une approximation. Les pièces doivent être servies sur la même origine que l’application pour les aperçus autorisés.

L’historique réel transmet recherche, statut et pagination à Django ; l’équipe doit valider le format et le tri de ces réponses. Les réglages audio/qualité restent des préférences d’appareil, le profil est sauvegardé sur Django en mode serveur.

## Limites de validation

Pas de backend Django réel disponible pendant la réalisation, pas de validation juridique, de promesse de latence système ou de FPS. La direction Figma a été reprise avec adaptations ; aucune conformité exhaustive pixel par pixel n’est annoncée. Les tests navigateur utilisent Chrome et du média synthétique. La vérification sur téléphones physiques, Safari/Firefox, lecteurs d’écran réels et GPU modestes reste une recette commune à effectuer.
