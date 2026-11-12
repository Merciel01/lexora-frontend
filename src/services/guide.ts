import { request, serverMode } from "./api";
import { safeUrl } from "./urls";
import {
  guideRequestSchema,
  guideResponseSchema,
  type CaseDetail,
  type GuideIntent,
  type GuideRequest,
  type GuideResponse,
} from "./contracts";
export const guidePrompts: {
  intent: GuideIntent;
  label: string;
  message: string;
}[] = [
  {
    intent: "method",
    label: "Par où commencer ?",
    message: "Quelle méthode suivre pour préparer ce dossier ?",
  },
  {
    intent: "evidence",
    label: "Examiner les pièces",
    message: "Comment examiner les pièces de ce dossier ?",
  },
  {
    intent: "outline",
    label: "Construire mon plan",
    message: "Aidez-moi à structurer ma plaidoirie.",
  },
];
const focus: Record<string, string> = {
  limete:
    "Comparez les prétentions, les documents et les limites de la parcelle, sans confondre occupation des lieux et preuve du droit allégué.",
  telephone:
    "Séparez ce que les témoins ont effectivement observé de ce qu’ils supposent à propos de la disparition.",
  contrat:
    "Reconstituez la commande, la livraison, les réserves et les paiements avant de formuler votre demande.",
  accident:
    "Distinguez les circonstances de la collision, les dommages décrits et les éléments permettant de les relier.",
};
export function demoGuide(
  caseDetail: CaseDetail,
  input: GuideRequest,
): GuideResponse {
  const question = input.message.toLocaleLowerCase("fr");
  const needsSources = /\b(article|loi|code|jurisprudence|texte légal)\b/u.test(
    question,
  );
  const intent =
    input.intent === "question"
      ? /pièce|preuve|document|témoin/u.test(question)
        ? "evidence"
        : /plan|plaidoirie|structure/u.test(question)
          ? "outline"
          : "method"
      : input.intent;
  const roles: Record<string, string> = {
    defense: "la défense",
    civil: "la partie civile",
    prosecutor: "le ministère public",
  };
  const introduction = needsSources
    ? "Aucune référence juridique validée n’est fournie dans cette démonstration. Vérifiez les textes applicables dans les sources mises à disposition par votre formation. Voici une méthode pour organiser votre recherche."
    : `Pour « ${caseDetail.title} », préparez une position cohérente pour ${roles[input.roleId] || "votre rôle"}. Ces conseils prédéfinis aident à travailler la méthode ; ils ne prédisent pas le jugement.`;
  const steps =
    intent === "evidence"
      ? caseDetail.exhibits.slice(0, 8).map((e) => ({
          title: `${e.id} · ${e.title}`,
          detail:
            "Pour cette pièce, notez le fait qu’elle peut éclairer, son origine, ce qu’elle ne permet pas d’établir et la contestation possible de la partie adverse. Comparez son contenu aux faits du dossier.",
          exhibitIds: [e.id],
        }))
      : intent === "outline"
        ? [
            {
              title: "1. Annoncer votre position",
              detail:
                "Présentez brièvement le rôle que vous défendez et la demande que vous souhaitez soutenir.",
              exhibitIds: [],
            },
            {
              title: "2. Retenir les faits utiles",
              detail:
                focus[caseDetail.id] ||
                "Séparez les faits établis, les faits contestés et les informations absentes.",
              exhibitIds: [],
            },
            {
              title: "3. Relier chaque argument à une pièce",
              detail:
                "Pour chaque argument, expliquez ce que la pièce apporte et reconnaissez ses limites. Ne lui faites pas dire davantage que son contenu.",
              exhibitIds: caseDetail.exhibits.slice(0, 2).map((e) => e.id),
            },
            {
              title: "4. Préparer la contradiction",
              detail:
                "Formulez l’objection la plus plausible à votre argument, puis préparez une réponse précise et mesurée.",
              exhibitIds: [],
            },
            {
              title: "5. Terminer par une demande claire",
              detail:
                "Rappelez votre position et les raisons qui l’appuient. La décision appartient à la cour, indépendamment de la qualité pédagogique de votre prestation.",
              exhibitIds: [],
            },
          ]
        : [
            {
              title: "Comprendre le différend",
              detail:
                focus[caseDetail.id] ||
                "Reconstituez la chronologie, les parties et leurs demandes à partir des faits fournis.",
              exhibitIds: [],
            },
            {
              title: "Faire une grille faits / pièces / limites",
              detail:
                "Pour chaque fait important, cherchez un élément du dossier qui le soutient ou le contredit. Signalez ce qui reste incertain.",
              exhibitIds: caseDetail.exhibits.slice(0, 2).map((e) => e.id),
            },
            {
              title: "Choisir vos arguments",
              detail:
                "Retenez quelques arguments compréhensibles. Pour chacun : votre affirmation, la pièce utile, sa limite et la demande que vous en tirez.",
              exhibitIds: [],
            },
            {
              title: "Vous entraîner à répondre",
              detail:
                "Préparez une réponse courte à une question de la cour et à une objection adverse. Entraînez-vous à conclure sans transformer une hypothèse en certitude.",
              exhibitIds: [],
            },
          ];
  if (!steps.length)
    steps.push({
      title: "Partir des faits disponibles",
      detail:
        "Aucune pièce n’est fournie pour ce dossier. Distinguez les faits décrits des éléments qui resteraient à établir ; n’inventez pas de preuve.",
      exhibitIds: [],
    });
  return guideResponseSchema.parse({
    id: "demo-guide-" + input.clientMessageId,
    caseId: caseDetail.id,
    clientMessageId: input.clientMessageId,
    introduction,
    steps,
    questions: [
      "Quelle est votre demande principale ?",
      "Quel fait est contesté ?",
      "Quelle limite votre argument le plus fort présente-t-il ?",
    ],
    citations: [],
  });
}
export function validateGuideResponse(
  value: unknown,
  caseDetail: CaseDetail,
  clientMessageId: string,
) {
  const result = guideResponseSchema.parse(value);
  if (
    result.caseId !== caseDetail.id ||
    result.clientMessageId !== clientMessageId
  )
    throw new Error("La réponse du guide ne correspond pas à cette demande.");
  const ids = new Set(caseDetail.exhibits.map((e) => e.id));
  if (result.steps.some((s) => s.exhibitIds.some((id) => !ids.has(id))))
    throw new Error("Le guide a mentionné une pièce absente du dossier.");
  return result;
}
export async function askGuide(
  caseDetail: CaseDetail,
  payload: GuideRequest,
  signal?: AbortSignal,
): Promise<GuideResponse> {
  const input = guideRequestSchema.parse(payload);
  if (signal?.aborted) throw new Error("Demande annulée.");
  const result = serverMode
    ? await request(
        "/cases/" + encodeURIComponent(caseDetail.id) + "/guide",
        guideResponseSchema,
        { method: "POST", body: JSON.stringify(input), signal },
      )
    : demoGuide(caseDetail, input);
  return validateGuideResponse(result, caseDetail, input.clientMessageId);
}
export function guideNotes(response: GuideResponse) {
  return [
    "Plan de préparation — " + response.caseId,
    ...response.steps.map(
      (s) =>
        s.title +
        "\n" +
        s.detail +
        (s.exhibitIds.length
          ? "\nPièces à examiner : " + s.exhibitIds.join(", ")
          : ""),
    ),
    ...(response.citations.length
      ? [
          "Sources fournies",
          ...response.citations.map((c) =>
            [c.source, c.title, c.article, c.version, safeUrl(c.url)]
              .filter(Boolean)
              .join(" · "),
          ),
        ]
      : []),
  ].join("\n\n");
}
