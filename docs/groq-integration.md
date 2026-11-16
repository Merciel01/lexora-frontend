# Groq et secours local — frontend

La clé se configure exclusivement dans `.env` du dépôt backend voisin. Aucun paramètre `VITE_GROQ_API_KEY` n’existe. Le front reçoit uniquement le texte destiné à l’utilisateur, les états et des diagnostics bornés (fournisseur, modèle, métriques disponibles, secours). Le panneau Diagnostic IA est disponible sur le guide, l’audience et le résultat.

Le protocole progressif `processing` demeure éphémère et corrélé à une commande en attente. Les textes provisoires ne sont pas inscrits dans le journal ni lus par les voix. Un verdict structuré n’est jamais appliqué partiellement. Après un début de flux Groq interrompu, le front retire l’aperçu ; il ne concatène pas un secours local au texte déjà affiché.

L’action Annuler la réponse appelle un endpoint HTTP authentifié/CSRF distinct du WebSocket occupé. La pause pendant génération et la sortie de page demandent aussi l’annulation. L’arrêt est coopératif ; la voix et les contrôles 3D conservent leur fonctionnement existant.

La recette `integration/groq-migration.spec.ts`, activée par `LEXORA_TEST_MOCK_GROQ=1`, utilise un fournisseur simulé sur base Django jetable. Elle vérifie guide, streaming, annulation sans tour enregistré, reprise, poursuite et verdict. Elle ne certifie ni un accès à Groq réel ni sa latence.

La documentation complète (installation, clé, budgets, données sortantes, 429 et mode local) est dans `lexora-backend/docs/groq-migration.md`. Aucun déploiement ni push GitHub dans cette livraison.
