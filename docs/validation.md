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

## Guide de préparation — 12 novembre 2026

Ajout du guide sur la page dossier : méthode, analyse des pièces, plan, question libre, sources fournies et ajout explicite aux notes. `npm run check` réussit avec **37 tests unitaires**, types, lint, contrat généré et build. Une recette complète de **28 tests navigateur** a réussi ; après les derniers ajustements, **8 tests ciblés du guide** ont également réussi (desktop, mobile et Django simulé), dont deux nouveaux cas de notes pleines. La suite complète comprend désormais 30 scénarios.

Les tests vérifient notamment l’absence d’envoi en démo, l’isolation par dossier, l’ouverture des pièces depuis les conseils, la conservation des notes existantes, la limite de 10 000 caractères, la conservation d’un nouveau brouillon après réessai, le clientMessageId stable, l’exclusion des notes privées et le rejet d’une pièce inconnue. Les captures du guide sur desktop et mobile ont été examinées. Aucune IA réelle n’a été appelée ; le nouvel endpoint reste une proposition à connecter côté Django.

## Guide compact — 12 novembre 2026

Remplacement du panneau long par quatre menus repliés et des sous-menus exclusifs. Les cartes Objectif et Pièces sont également repliables. `npm run check` réussit : types, lint, **37 tests unitaires**, contrat et build. La dernière recette complète Playwright réussit avec **31 tests navigateur**, sur desktop, mobile et contrat Django simulé.

Vérifications ajoutées : hauteur du guide fermé et ouvert, navigation clavier, sous-menus exclusifs, brouillon préservé entre rubriques et onglets, réouverture sans nouvelle requête, fermeture pendant une requête et ajout explicite aux notes. Les captures desktop/mobile ont été actualisées et examinées.

## Frontend adapté à la salle — 12 novembre 2026

Branche d’adaptation réunissant le guide compact et la salle v27, alignée sur `develop` après la fusion de la PR #2. `npm run check` réussit : types, lint, **47 tests unitaires**, génération du contrat et build. La recette complète finale Chrome réussit avec **39 tests navigateur** en environ 5,9 minutes, desktop 1440 × 960, mobile 390 × 844 et contrat Django simulé.

Vérifications : trois points de vue, qualité persistante, sept intervenants pilotés par les événements, absence de scénario autonome concurrent, sous-titres entièrement sous la scène, repli après GLB absent, sortie immédiate du chargement sans perdre le brouillon, guide et notes, parcours complet et erreurs serveur simulées. Les cycles de passage à la barre terminent en environ 15 à 18 secondes dans cette recette. La boucle suspend désormais le rendu et la simulation automatique lorsque le test pilote manuellement les pas de temps ; le rendu réel reste vérifié par les autres tests.

Les serveurs de cette recette finale sont isolés sur 5273 et 5274 dans une copie de vérification, avec un cache de dépendances distinct. Le code applicatif testé est celui de la branche ; seuls les ports et les chemins autorisés des dépendances sont adaptés dans la copie. Captures examinées : `docs/images/courtroom-adapted-desktop.png` et `docs/images/courtroom-adapted-mobile.png`.

Le build livre environ 486 ko de JavaScript principal (150 ko gzip), un adaptateur 3D différé de 2,4 ko (1,15 ko gzip), le moteur isolé existant et les mêmes 38 Mo de modèles. Pas de réduction annoncée du poids des GLB, de mesure de fluidité sur GPU réel ou de recette sur téléphone physique. Le chargement est plus tolérant aux réseaux lents, sans prétendre à une validation sur réseau mobile réel. Django, IA, STT et TTS réels restent à connecter et à valider côté backend.

## Image d’accueil — 12 novembre 2026

La capture de la salle fournie par l’utilisateur est recadrée pour retirer le navigateur, les menus et la transcription, puis encodée en WebP (2 069 × 760, environ 110 ko). Elle remplace l’illustration de l’accueil. Le bandeau présente texte et image côte à côte sur grand écran, puis empilés avec un cadrage central sur mobile.

Build et lint réussis. Vérification Chrome du build à 1440 × 960 et 390 × 844 : image chargée, texte alternatif présent, lien de simulation conservé, aucune erreur JavaScript et aucun débordement horizontal. Captures d’accueil actualisées et examinées. La suite complète d’audience n’a pas été relancée pour ce changement visuel.
