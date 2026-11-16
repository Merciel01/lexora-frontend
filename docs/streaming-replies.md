# Répliques progressives

Les réponses locales de cour s’affichent au fil de leur génération avec la mention « réponse provisoire ». Le journal de l’audience et la voix utilisent uniquement la version validée par le backend. Les messages WebSocket `processing` sont éphémères, corrélés à une commande en attente, sans numéro de séquence durable. Les messages trop longs, mal formés, étrangers ou reçus après acceptation sont ignorés. Le texte provisoire est supprimé après acceptation ou erreur et peut être remplacé par une reformulation finale issue des contrôles serveur.

Les mesures affichées distinguent transcription, premiers mots, réponse prête et départ de voix. Elles commencent à l’envoi du message ou de l’enregistrement terminé. Les verdicts JSON ne sont pas montrés partiellement.

Validation : 59 tests front, types, lint et compilation réussis. Recette Chrome/Qwen en mode texte réussie : premiers mots à 37,192 s contre réponse prête à 80,276 s, sans insertion provisoire dans le journal. Capture de l’aperçu sur la scène 3D examinée : premiers mots à 1,58 s sur préfixe chaud ; première réponse validée. Le test 3D à deux interventions a toutefois échoué sur le délai maximal de la deuxième ; l’erreur est visible et aucun tour incomplet n’est enregistré. Le streaming ne constitue donc pas une accélération garantie du calcul.
