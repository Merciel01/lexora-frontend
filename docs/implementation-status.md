# État d’implémentation LEXORA — raccordement Django

Le parcours principal est testé contre Django réel : inscription/login/logout/profil, rôles, catalogue et pièces, notes privées par dossier, préférences du compte, audience UUID, messages et pièces via WebSocket, reprise, sept phases, bilan, historique et XP persistants sans double attribution.

La scène v27 contient les neuf personnages et suit les sept locuteurs du contrat serveur. Les démonstrations du prévenu/témoin à la barre restent disponibles dans l’explorateur distinct. Bouche indicative sans synchronisation labiale réelle.

Le mode serveur est le défaut. Le mode démo demeure explicite et ne remplace jamais silencieusement une requête Django en échec. La recette historique desktop/mobile et le contrat simulé sont conservés ; `npm run test:django` ajoute un serveur ASGI et une base réelle temporaire, sans interception réseau.

Le backend annonce `audioCodecs` et `ttsAvailable`. WAV Piper local et endpoint audio authentifié vérifiés. Le STT externe n’est pas testé sans clé ; SMTP doit être configuré pour la livraison des emails. Les résultats sont pédagogiques, les références absentes ne sont pas inventées et aucune exactitude juridique certifiée n’est annoncée.

Le lancement local est décrit dans [django-integration.md](django-integration.md). La production, Redis/multi-worker, la mise à niveau des dépendances backend, les téléphones physiques et la synchronisation vocale fine restent à traiter.
