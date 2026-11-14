# Salle Lexora — Skillforce v27

Mise à jour : la scène répond aussi à une demande `init` du parent, pour retrouver le signal de disponibilité après un chargement en cache. Les erreurs de ressources non essentielles (image/audio) ne sont plus assimilées à une panne de script. Une perte WebGL est signalée explicitement ; le panneau d'audience offre « Réessayer la salle 3D », qui remonte une nouvelle scène sans quitter le procès. Recette Chrome réussie avec neuf personnages, perte graphique simulée, rechargement et changement de caméra. La panne initiale de la capture utilisateur n'a pas été reproduite spontanément.

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

## Microphone et caméra automatique

Le microphone est accessible en bas de la scène 3D, avec son état et son niveau pendant la capture. Le mode texte conserve le même contrôle sous la transcription. Les autorisations de parole et les modes maintien/bascule restent identiques.

La caméra automatique, sélectionnée par défaut, alterne toutes les douze secondes entre le plan général, l’intervenant et la place de l’étudiant, avec les transitions douces du moteur. Une vue sélectionnée manuellement reste fixe. Une manipulation à la souris suspend l’automatisme pendant vingt secondes ; les mouvements réduits désactivent cette alternance. La pause explicite de l’audience revient au plan général.

Vérification : tests Chrome sur ordinateur et mobile, maintien des vues manuelles, mouvements réduits et capture/transcription locale depuis le panneau de scène. Les fichiers GLB et les animations existantes ne sont pas modifiés.

## Animation de bouche liée à l’audio

En audience serveur, le son WAV réellement joué est analysé localement avec Web Audio (20 mesures par seconde). Son amplitude pilote la mâchoire et l’ouverture des lèvres du seul locuteur actif, avec lissage et seuil de silence. Un signal périmé, une interruption, une erreur ou la fin du son referme la bouche ; les mouvements réduits désactivent cette animation. La sortie sonore n’est amplifiée ni envoyée à un nouveau service. Les ressources Web Audio sont libérées après chaque lecture.

Il s’agit d’une enveloppe d’amplitude, pas d’une synchronisation phonétique : A/E/O/MBP ne sont pas reconnus. Les voix de démonstration du navigateur et la capture micro de l’étudiant ne sont pas analysées par cette chaîne. L’explorateur autonome conserve sa démonstration existante. Les GLB et les actions Blender restent inchangés. L’importeur conserve l’adaptation lors des prochaines réimportations.

## Positions de bouche phonétiques

Si le backend fournit les catégories Rhubarb A–H/X, le lecteur les suit avec audio.currentTime et les convertit en morphes existants A/E/O/MBP avec transitions lissées. A ferme les lèvres, E/F les arrondissent, X revient au repos. Les morphes G/H restent des approximations : les personnages n’ont pas de contrôles dédiés pour les dents/lèvres et la langue. Le seuil de silence, la pause, la péremption du signal et les mouvements réduits restent appliqués. Sans métadonnées valides, l’animation d’amplitude reste active. Aucun son étudiant ni voix de démonstration du navigateur n’est analysé par cette voie.

Cette analyse est phonétique et automatique, sans garantie d’alignement parfait en français. Elle peut ajouter jusqu’à 16 secondes avant une nouvelle lecture ; les résultats sont mis en cache par le backend. Installation/licences : lexora-backend/docs/phonetic-mouth.md. Les GLB sont préservés.
