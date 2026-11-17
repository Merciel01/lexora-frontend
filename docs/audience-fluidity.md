# Fluidité de l’audience — 15 novembre 2026

Corrections vérifiées :
- La voix démarre sans attendre les repères de bouche. L’analyse facultative se fait en parallèle, avec animation par amplitude en attendant ; son échec ne bloque pas la lecture.
- L’analyse d’amplitude ne redirige plus le son vers un contexte Web Audio encore suspendu. La sortie audio native reste disponible lorsque le navigateur refuse son activation.
- La pause de la cour reste accessible pendant une commande en cours. Elle suspend les enchaînements et la lecture, sans prétendre annuler une génération serveur déjà commencée.
- Le temps maximal indicatif de calcul et les erreurs/reprises de commande sont visibles dans la scène, à proximité du microphone.
- Le serveur recherche directement l’événement audio demandé au lieu de charger tous les événements de l’audience. L’autorisation par propriétaire reste inchangée.

Validation : 58 tests front, types, lint et compilation réussis ; 80 tests Django réussis ; recette Chrome complète contre Django sur base jetable avec Piper, progression automatique jusqu’au tour étudiant, échanges, verdict et relecture réussie. Les tests couvrent le démarrage de la voix malgré une analyse de bouche en attente, l’arrêt conjoint, le contexte audio suspendu et les lectures bloquées. La recette navigateur utilise une décision de test explicitement identifiée ; elle ne mesure pas une nouvelle inférence Qwen.

Limites : aucun changement de modèle ni accélération certifiée de Qwen ; le budget du verdict reste 180 secondes. Aucun corpus juridique validé ajouté. Les résultats et données des audiences existantes sont préservés. Le silence intermittent et les problèmes de permission/volume propres à l’onglet utilisateur ne sont pas tous reproductibles dans la recette automatisée.
