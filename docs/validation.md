# Validation de l’intégration Skillforce v27 — 12 novembre 2026

Windows 11, Node 24.11.0, Chrome installé ; captures desktop 1440 × 960 et mobile 390 × 844 examinées.

- `npm run check` réussi : types, lint, 34 tests unitaires, contrat OpenAPI inchangé et build.
- `npm run test:e2e` : 28 tests réussis en 2,3 minutes, desktop/mobile et contrat Django simulé.
- Neuf personnages et décor GLB chargés ; empreintes SHA-256 et syntaxe des quatre scripts vérifiées.
- Les sept rôles existants pilotent le bon personnage, sans scénario autonome concurrent dans l’audience intégrée.
- Explorateur : appel du prévenu puis du témoin, marche vers la barre, intervention, retour et assise ; erreur de cible des pieds inférieure à 5 mm. Le test de simulation accélérée coupe les appels de rendu pendant son pas-à-pas pour les runners sans GPU ; les tests de chargement et captures utilisent le vrai rendu WebGL.
- GLB absent : repli texte utilisable ; les parcours, le micro local et les échanges REST/WS simulés restent couverts.

Captures : `docs/images/courtroom-v27-desktop.png` et `docs/images/courtroom-v27-mobile.png`.
Build : JavaScript principal 469 ko (146 ko gzip), adaptateur React 3D différé 1,58 ko (0,84 ko gzip), moteur isolé 2,32 Mo et environ 38 Mo d’actifs GLB chargés à l’ouverture de la 3D. Aucun CDN requis. Les deux avertissements Rollup sur des annotations Zod restent sans effet sur le build.

Limites : pas de recette avec Django réel, ni de rôles serveur prévenu/témoin ajoutés. Leur séquence complète est disponible dans l’explorateur distinct. Marche procédurale dans le navigateur, bouche indicative sans synchronisation vocale réelle. Pas de mesure garantissant les FPS sur tous les GPU ni de test sur téléphone physique/Safari/Firefox. Les limites et licences figurent aussi dans `public/courtroom/README.md`.

La validation historique ci-dessous concerne la version précédant cette intégration.

---
# Validation — version 0.2.0, 9 novembre 2026

Environnement local : Node 22.22.1, npm 9.2.0, Linux, Chrome installé. Les médias des tests proviennent du périphérique synthétique du navigateur.

| Commande | Résultat |
| --- | --- |
| `npm run typecheck` | Réussi |
| `npm run lint` | Réussi |
| `npm run test` | 25 tests unitaires réussis |
| `npm run contract` | OpenAPI proposé généré |
| `npm run build` | Réussi |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npm run test:e2e` | 22 tests réussis, dernière recette complète en environ 1,5 minute |
| `npm audit --json` | 0 vulnérabilité signalée lors de l’audit final |

## Couverture exécutée

Les parcours navigateur tournent en desktop 1440 × 960 et mobile 390 × 844. Les routes sont également contrôlées à 360, 390, 768, 1024 et 1440 px sans débordement horizontal. Les captures accueil/audience desktop/mobile ont été examinées et des exemples sont inclus dans `docs/images`.

Scénarios : parcours complet rôle → dossier → préparation → équipement → audience → pièce → objection → réplique → résultat → débriefing → historique ; rôle verrouillé ; micro refusé ; capture maintenue puis relâchée sans téléversement ; recherche vide et réinitialisation ; brouillon conservé pendant une coupure locale ; notes locales et suppression confirmée au clavier ; préférences persistantes ; confirmation de mot de passe ; rendu WebGL et repli texte après erreur.

Les tests `django-contract` interceptent REST et WebSocket pour exercer le contrat proposé : profil serveur, données sans fixtures, CSRF, création d’audience, accusé refusé puis accepté avec identifiant stable, conservation d’un brouillon modifié, événement dédupliqué, expiration de session et erreur REST sans faux résultat.

Les tests unitaires couvrent transitions et droits d’action, déduplication, compatibilité dossier/rôle, isolation des audiences, XP idempotents, codecs, validation des URL, temps affiché, ordre/cancellation/réessai de la file audio, réessai de messages, événements inconnus, expiration WS et réception pendant la resynchronisation.

Les premiers essais ont révélé des défauts de reconnexion de démonstration et de conservation du brouillon ; ils ont été corrigés. Un cache Vite servi pendant une écriture et la mémoire de navigation répétée de Chrome ont également été traités en redémarrant le serveur de test et en isolant les séries de viewports. La dernière recette complète se termine avec 22 succès.

## Ressources et limites mesurées

Build mesuré : environ 469 ko de JavaScript initial (145 ko gzip), chunk 3D différé de 886,5 ko (238,4 ko gzip), CSS de 27,3 ko (6,6 ko gzip) et environ 164 ko de formats de polices latines. L’HTML initial ne précharge pas le chunk 3D. Les licences des ressources sont livrées sous `public/licenses`.

Vite émet un avertissement de taille sur le chunk 3D ; il reste différé. Deux annotations de commentaires Zod sont ignorées par Rollup, sans erreur de compilation. Aucun modèle, HDRI ou service distant obligatoire.

Pas de validation sur un backend Django réel, de performance STT/IA/TTS, de synchronisation labiale par visèmes, de FPS garanti ou de qualité juridique certifiée. Safari/Firefox, microphones et téléphones physiques, audit complet WCAG/lecteur d’écran et GPU modestes restent à vérifier avec l’équipe. Les tests du contrat simulé ne remplacent pas la recette du service réel.
