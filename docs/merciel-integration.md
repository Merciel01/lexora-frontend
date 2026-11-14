# Intégration de la version Merciel

Source : `origin/feat/courtroom-frontend-adaptation`, commit `1bba2b5` de Merciel01. La branche a été fusionnée avec `develop` (raccordement réel Django), en conservant son historique.

Conservés : guide compact et sous-menus, nouvelle image WebP d'accueil, point de vue étudiant, options de qualité, progression du chargement et sous-titres sous la scène. Les conflits de fusion ont été résolus en gardant à la fois le guide et les notes privées Django.

La page de connexion utilise aussi l'image WebP fournie par Merciel. Notre variante visuelle précédente est préservée dans la branche locale `backup/auth-visual-before-merciel` (`577e119`).

Le mode serveur reste le défaut. La route Django `POST /api/cases/:id/guide` répond au contrat de Merciel avec des repères méthodologiques prédéfinis liés aux pièces réelles du dossier, sans citations inventées ni fausse annonce d'inférence IA. Les notes privées ne sont pas transmises au guide et leur enregistrement reste explicite.

Validation locale : `npm run check` (48 tests unitaires) et parcours navigateur contre Django réel, incluant guide, notes, scène et WAV Piper. Backend : 45 tests, migrations inchangées. La recette navigateur de démonstration/contrat simulé est vérifiée séparément.
