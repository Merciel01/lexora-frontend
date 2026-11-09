export type RoleId = "defense" | "civil" | "prosecutor";
export const roles = [
  {
    id: "defense",
    label: "Avocat de la défense",
    description: "Construisez une défense et répondez aux arguments adverses.",
    unlocked: true,
  },
  {
    id: "civil",
    label: "Partie civile",
    description:
      "Soutenez les intérêts de la victime avec une argumentation structurée.",
    unlocked: true,
  },
  {
    id: "prosecutor",
    label: "Ministère public",
    description: "Portez le réquisitoire au nom de la société.",
    unlocked: false,
  },
] as const;
export const cases = [
  {
    id: "limete",
    title: "La parcelle de Limete",
    domain: "Civil",
    difficulty: "Débutant",
    minutes: 25,
    description:
      "Une parcelle, deux prétentions. Un conflit de propriété entre voisins.",
    facts:
      "Le demandeur affirme être propriétaire d’une parcelle située à Limete. Le défendeur conteste cette prétention et présente un acte antérieur. Les parties divergent sur les limites du terrain et la validité des documents produits. Un voisin a été entendu comme témoin.",
  },
  {
    id: "telephone",
    title: "Le téléphone disparu",
    domain: "Pénal",
    difficulty: "Débutant",
    minutes: 20,
    description: "Des témoignages contradictoires à examiner.",
    facts:
      "Un téléphone disparaît pendant une réunion. Deux témoins donnent des versions différentes. Votre mission est d’identifier les contradictions et de distinguer les faits établis des suppositions.",
  },
  {
    id: "contrat",
    title: "Le contrat contesté",
    domain: "Civil",
    difficulty: "Intermédiaire",
    minutes: 35,
    description: "Une inexécution contractuelle à analyser.",
    facts:
      "Deux commerçants contestent les conditions d’une livraison. Le paiement et la conformité des marchandises sont discutés. Examinez les documents et structurez les demandes de votre client.",
  },
  {
    id: "accident",
    title: "L’accident du boulevard",
    domain: "Civil",
    difficulty: "Intermédiaire",
    minutes: 30,
    description: "Responsabilité et éléments de preuve.",
    facts:
      "Une collision survient à une intersection. Les parties divergent sur les circonstances et les dommages. Comparez les déclarations et les pièces pour soutenir une argumentation cohérente.",
  },
];
export const exhibits = [
  {
    id: "P01",
    title: "Acte de cession",
    content:
      "Document pédagogique fictif. Un acte antérieur fait état d’une cession de droits entre A. K. et B. M. Sa portée et son authenticité restent discutées.",
  },
  {
    id: "P02",
    title: "Plan de la parcelle",
    content:
      "Plan pédagogique : parcelle rectangulaire bordée par une voie au nord et deux propriétés voisines. Les limites reportées sont contestées.",
  },
  {
    id: "P03",
    title: "Témoignage",
    content:
      "Le témoin déclare avoir vu les parties occuper les lieux à des périodes différentes. Il ne peut confirmer la validité des titres.",
  },
  {
    id: "P04",
    title: "Correspondance",
    content:
      "Échange fictif dans lequel les parties demandent une clarification des limites et proposent une rencontre.",
  },
];
export type Entry = { id: string; speaker: string; text: string };
export type TrialState = {
  step: number;
  entries: Entry[];
  seen: string[];
  presented: string[];
  objection: boolean;
  finished: boolean;
};
export type TrialAction =
  | { type: "text"; id: string; text: string }
  | { type: "exhibit"; id: string; exhibitId: string }
  | { type: "continue"; id: string };
export const phases = [
  "Ouverture",
  "Exposé des faits",
  "Plaidoirie",
  "Réquisitoire",
  "Répliques",
  "Délibération",
  "Jugement",
];
export const initialTrial: TrialState = {
  step: 0,
  entries: [
    {
      id: "opening",
      speaker: "Le président",
      text: "L’audience est ouverte. Examinez les faits, puis présentez votre position. Cette simulation est un exercice pédagogique fictif.",
    },
  ],
  seen: [],
  presented: [],
  objection: false,
  finished: false,
};
export function transition(state: TrialState, action: TrialAction): TrialState {
  if (state.finished || state.seen.includes(action.id)) return state;
  if (
    action.type === "text" &&
    (!action.text.trim() || ![1, 2, 4].includes(state.step))
  )
    return state;
  if (
    action.type === "exhibit" &&
    (state.step !== 2 || !exhibits.some((e) => e.id === action.exhibitId))
  )
    return state;
  if (action.type === "continue" && [1, 2, 4].includes(state.step))
    return state;
  const next = {
    ...state,
    seen: [...state.seen.slice(-99), action.id],
    entries: [...state.entries],
    objection: false,
  };
  const add = (speaker: string, text: string) =>
    next.entries.push({
      id: action.id + "-" + next.entries.length,
      speaker,
      text,
    });
  if (action.type === "exhibit") {
    next.presented = [...new Set([...state.presented, action.exhibitId])];
    add(
      "Le greffier",
      `La pièce ${action.exhibitId} est présentée et admise pour cet exercice.`,
    );
    add(
      "Le ministère public",
      "La cour doit examiner la portée des pièces contradictoirement, sans confondre allégation et preuve.",
    );
    add(
      "L’avocat adverse",
      "Objection : cette pièce ne suffit pas à établir la prétention soutenue.",
    );
    next.objection = true;
    next.step = 3;
    return next;
  }
  if (action.type === "text") add("Vous", action.text.trim());
  next.step = Math.min(6, state.step + 1);
  if (next.step === 1)
    add(
      "Le greffier",
      "Les faits du dossier sont exposés. Quelle est votre position initiale ?",
    );
  if (next.step === 1)
    add(
      "Premier assesseur",
      "Distinguez les faits établis et les éléments qui restent contestés.",
    );
  if (next.step === 2)
    add(
      "Le président",
      "Développez votre argumentation et présentez une pièce du dossier pour l’appuyer.",
    );
  if (state.step === 2) {
    next.step = 2;
    add(
      "Le président",
      "Merci. Présentez maintenant une pièce à la cour pour poursuivre.",
    );
  }
  if (next.step === 4)
    add(
      "Second assesseur",
      "Quelle limite reconnaissez-vous à la portée de cette pièce ?",
    );
  if (next.step === 4)
    add(
      "Le président",
      "L’objection est actée. La pièce reste examinée contradictoirement. Vous avez la parole pour votre réplique finale.",
    );
  if (next.step === 5)
    add("Le président", "Les débats sont clos. La cour délibère.");
  if (next.step === 6) {
    add(
      "Le président",
      "Le jugement pédagogique est disponible. Consultez votre évaluation.",
    );
    next.finished = true;
  }
  return next;
}
export function canSelectRole(id: string) {
  return roles.some((r) => r.id === id && r.unlocked);
}
