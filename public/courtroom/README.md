# Salle Lexora — Skillforce v27

Neuf personnages fictifs semi-réalistes, squelettes, actions et morphes faciaux issus du travail Skillforce ; salle, barre commune, mobilier, documents, emblème mural et drapeau RDC tombant sur pied. Les fichiers `assets/*.glb` sont chargés localement, sans CDN. Aucun fichier Blender, donnée de procès, profil navigateur ou secret n’est livré ici.

`index.html?embed=1` est le moteur visuel de `src/components/Courtroom.tsx`. Ce mode ne lance jamais la chorégraphie autonome. Le parent contrôle l’intervenant, la parole indicative, les gestes, l’objection, la qualité et les caméras par messages versionnés de même origine. Le parent vérifie l’origine **et la fenêtre émettrice** ; le moteur vérifie aussi les rôles et valeurs autorisés. Une erreur de chargement ou perte WebGL propose le mode texte.

`index.html` sans paramètre conserve l’explorateur de validation : neuf intervenants, documents déposés/consultés, caméras, qualité basse/haute, prévenu et témoin appelés successivement à la barre avec marche/retour/assise, et clôture au marteau. Ce scénario pédagogique est distinct des décisions de la session Lexora. Ne pas le déclencher automatiquement en mode intégré.

Le contrat existant a sept identifiants d’intervenants ; ils correspondent au président, aux assesseurs, au ministère public, à l’avocat adverse, au greffier et à l’étudiant. Le prévenu et le témoin sont présents visuellement et leurs séquences sont disponibles dans l’explorateur. Les déclencher par le serveur réel demanderait un ajout explicite de rôles/événements au contrat, qui n’est pas modifié par cette livraison. Les déplacements sont procéduraux dans `runtime.js`, pas de nouvelles actions de marche cuites dans les GLB. Les mouvements de bouche ne sont pas une synchronisation labiale réelle.

Three.js **r182** et ses modules sont isolés dans ce document pour ne pas mélanger leurs objets avec les dépendances React/Three du frontend. Leur licence MIT et provenance sont dans `licenses/`. Les ressources graphiques humaines MakeHuman Community sont sous CC0-1.0 ; voir `licenses/MAKEHUMAN-ASSETS.md`, commit de provenance `a8bc2d54ff0ac92e78ff71431b1023eda42bf482`. Aucun code de l’application MakeHuman sous AGPL n’est intégré. Vêtements, coiffures, salle, accessoires et animations supplémentaires proviennent des scripts Skillforce du projet. L’emblème est l’image fournie par l’utilisateur, conservée dans le décor sans redessin ; ses droits restent ceux de sa source.

`manifest.json` donne les empreintes des neuf GLB originaux et du décor. Environ 38 Mo d’actifs sont conservés pour ne pas remplacer les personnages par des formes simplifiées ; qualité basse par défaut en mode auto. Les réglages haute qualité coûtent davantage de mémoire/GPU. Les requêtes d’actifs sont indépendantes et bénéficient du cache HTTP de l’hébergement.

Pour réimporter les sources autorisées : `node scripts/sync-courtroom.mjs ../Skillforce_Blender` depuis la racine du dépôt. Les fichiers générés sont commités : la CI et le build n’exigent pas le dossier Blender du poste de développement. `lexora-bridge.js` est l’adaptateur maintenu dans ce dépôt ; il n’est pas écrasé par l’import.

## Adaptation de l’audience Lexora

Le point de vue se choisit dans la barre de la salle : vue générale, intervenant ou place de l’étudiant. Les réglages de qualité, les sous-titres et l’accès à l’explorateur sont regroupés dans « Options de la salle ». Les sous-titres sont placés sous la scène pour garder les personnages visibles, notamment sur mobile. La qualité choisie utilise les préférences locales existantes.

Le chargement indique le nombre d’éléments prêts (décor et neuf personnages, pas un pourcentage d’octets). Le délai d’inactivité est de deux minutes, renouvelé uniquement à réception d’un nouvel élément ; le mode texte peut être choisi immédiatement sans perdre le brouillon de plaidoirie. Les GLB restent inchangés, environ 38 Mo : cette adaptation ne prétend pas réduire leur poids.

La boucle d’affichage s’arrête pendant une pause ou lorsque le document est caché. Les tests de simulation manuelle pilotent seuls les pas de temps, sans rendu et simulation concurrents à pas nul. Les transformations et assertions de fin de cycle restent vérifiées. Les adaptations de chargement et de boucle sont aussi appliquées par l’importeur `scripts/sync-courtroom.mjs` pour être conservées lors d’une réimportation.

Le canal de progression et les points de vue restent internes à l’interface 3D. Le contrat REST/WebSocket Django est inchangé. En attente du backend, utiliser `VITE_APP_MODE=demo` pour le parcours complet et les conseils simulés ; le mode serveur conserve ses erreurs explicites si Django n’est pas disponible.
