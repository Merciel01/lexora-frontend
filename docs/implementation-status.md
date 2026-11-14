# État d’implémentation LEXORA — raccordement Django

Le parcours principal est testé contre Django réel : inscription/login/logout/profil, rôles, catalogue et pièces, notes privées par dossier, préférences du compte, audience UUID, messages et pièces via WebSocket, reprise, sept phases, bilan, historique et XP persistants sans double attribution.

La scène v27 contient les neuf personnages et suit les sept locuteurs du contrat serveur. Les démonstrations du prévenu/témoin à la barre restent disponibles dans l’explorateur distinct. Bouche indicative sans synchronisation labiale réelle.

Le mode serveur est le défaut. Le mode démo demeure explicite et ne remplace jamais silencieusement une requête Django en échec. La recette historique desktop/mobile et le contrat simulé sont conservés ; `npm run test:django` ajoute un serveur ASGI et une base réelle temporaire, sans interception réseau.

Le backend annonce `audioCodecs` et `ttsAvailable`. WAV Piper local et endpoint audio authentifié vérifiés. Le STT externe n’est pas testé sans clé ; SMTP doit être configuré pour la livraison des emails. Les résultats sont pédagogiques, les références absentes ne sont pas inventées et aucune exactitude juridique certifiée n’est annoncée.

Le lancement local est décrit dans [django-integration.md](django-integration.md). La production, Redis/multi-worker, la mise à niveau des dépendances backend, les téléphones physiques et la synchronisation vocale fine restent à traiter.

## Réponses locales pendant l’audience — 14 novembre 2026

Le snapshot accepte replyEngine (local/external/scripted). Le frontend indique le mode local et l’attente de préparation ; l’accusé WebSocket peut attendre 150 secondes pour couvrir STT et génération locale bornée à 120 secondes. Les droits de parole et les phases restent pilotés par Django. La recette integration/local-court.spec.ts vérifie une vraie réplique Qwen affichée après une intervention texte, dans une base jetable, sans fournisseur externe. Ce test n’évalue pas la justesse juridique ni la chaîne audio combinée.
