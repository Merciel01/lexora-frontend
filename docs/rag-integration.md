# Consultation juridique RAG

Le panneau « Consulter les sources juridiques » est disponible dans une audience
en mode serveur. Il appelle `POST /api/ai/rag` avec l'identifiant d'audience et la
question. Les droits, le rôle et la phase sont déduits côté backend. Aucune clé
API ne se trouve dans le frontend.

Les passages retrouvés sont distingués des sources citées. Les citations peuvent
aussi accompagner les tours de parole. Sans source juridique validée, le panneau
signale explicitement l'absence de réponse étayée ; les brouillons importés ne
sont pas présentés comme du droit approuvé.

Recette du 16 novembre 2026 : 62 tests frontend, lint, types et build ; parcours
Chrome `integration/rag.spec.ts`, `integration/natural-handover.spec.ts` et
`integration/groq-migration.spec.ts` avec serveur Django isolé et Groq simulé.
Les tests ne nécessitent aucune clé réelle. La capture du panneau est générée
dans `test-results/rag-no-approved-sources.png` (hors Git).

Les réglages de micro, lecteur audio, caméra et progression naturelle ne sont pas
remplacés par cette intégration. Le code utilise les contrats existants enrichis
de citations optionnelles.
