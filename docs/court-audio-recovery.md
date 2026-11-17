# Lecture de la cour — 15 novembre 2026

L’indication générique « La cour a la parole » était aussi affichée lorsque la lecture automatique était arrêtée. La scène affiche désormais l’état réel : arrêt, préparation de la voix, lecture ou erreur. Les commandes de démarrage/pause et de reprise après erreur sont accessibles près du microphone, sans défilement. Un premier clic démarre l’écoute automatique ; elle attend la fin de la voix avant de passer à la phase suivante et s’arrête au tour de l’étudiant.

Une lecture distante sans progression pendant 45 secondes est arrêtée et reste réessayable. Les lectures longues qui progressent ne sont pas interrompues. Les minuteurs sont libérés lors de l’arrêt, de la fin ou d’une erreur.

Vérifications : 57 tests unitaires réussis, types et lint validés. Recette Chrome contre Django sur base jetable réussie avec Piper : démarrage depuis la scène, phases d’ouverture et de faits enchaînées sans clic supplémentaire jusqu’au tour étudiant, pause, puis parcours complet et relecture du verdict. La voix du greffier de l’audience signalée répond HTTP 200 et contient 9,9 secondes de WAV. Le silence historique dans le navigateur utilisateur n’a pas été enregistré : la validation serveur ne certifie pas le volume de sortie ou la permission audio de son onglet. Aucun déroulement d’audience utilisateur n’a été modifié.
