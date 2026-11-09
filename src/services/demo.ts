import { cases, exhibits, roles, initialTrial, type TrialState } from "./model";
import {
  speakerId,
  caseSchema,
  snapshotSchema,
  verdictSchema,
  type CaseDetail,
  type Profile,
  type Snapshot,
  type Verdict,
  type Role,
} from "./contracts";
import { read, write } from "./storage";
export const caseExhibits: Record<
  string,
  { title: string; content: string }[]
> = {
  limete: exhibits,
  telephone: [
    {
      title: "Déclaration de perte",
      content:
        "Un téléphone aurait disparu à la fin de la réunion. Son propriétaire indique l’avoir posé sur une table commune.",
    },
    {
      title: "Déposition de Mme K.",
      content:
        "Mme K. affirme avoir vu une personne près de la table sans pouvoir identifier l’objet qu’elle tenait.",
    },
    {
      title: "Déposition de M. L.",
      content:
        "M. L. indique que la salle était encore accessible après le départ des participants.",
    },
    {
      title: "Inventaire des lieux",
      content:
        "La table se trouve près de la sortie. Aucun relevé ne permet d’identifier formellement une personne.",
    },
  ],
  contrat: [
    {
      title: "Bon de commande",
      content:
        "Commande pédagogique de dix lots de fournitures avec une date de livraison convenue.",
    },
    {
      title: "Bordereau de livraison",
      content:
        "Le destinataire a signé avec une réserve portant sur deux colis endommagés.",
    },
    {
      title: "Échange commercial",
      content:
        "Le fournisseur propose le remplacement des deux colis. Le client sollicite une résolution plus large.",
    },
    {
      title: "Reçu de paiement",
      content:
        "Un acompte fictif a été versé. Le solde et les obligations réciproques restent contestés.",
    },
  ],
  accident: [
    {
      title: "Constat descriptif",
      content:
        "Deux véhicules se sont heurtés dans une intersection. Les points de contact sont décrits, sans conclusion sur la responsabilité.",
    },
    {
      title: "Schéma de l’intersection",
      content:
        "Une voie principale et une voie secondaire se croisent. Les trajectoires indiquées sont celles déclarées par les parties.",
    },
    {
      title: "Déclaration du témoin",
      content:
        "Le témoin a entendu le choc mais n’a pas observé les secondes qui l’ont précédé.",
    },
    {
      title: "Évaluation des dommages",
      content:
        "Évaluation pédagogique des réparations. Le lien entre chaque dommage et la collision doit être discuté.",
    },
  ],
};
export function getDemoCase(id: string): CaseDetail {
  const c = cases.find((c) => c.id === id);
  if (!c) throw new Error("Dossier introuvable.");
  return caseSchema.parse({
    ...c,
    roleIds: id === "telephone" ? ["defense", "civil"] : ["defense"],
    exhibits: caseExhibits[id].map((e, i) => ({
      ...e,
      id: "P0" + (i + 1),
      caseId: id,
      mediaType: "text",
      downloadAllowed: true,
    })),
  });
}
export function getDemoCases() {
  return cases.map((c) => getDemoCase(c.id));
}
export function getSessions(): Snapshot[] {
  const parsed = snapshotSchema.array().safeParse(read("sessions", []));
  return parsed.success ? parsed.data : [];
}
export function getSession(id: string) {
  return (
    getSessions().find((s) => s.id === id) ||
    (id === "demo" ? getSessions().at(-1) : undefined)
  );
}
export function saveSession(snapshot: Snapshot) {
  const sessions = getSessions();
  const index = sessions.findIndex((s) => s.id === snapshot.id);
  if (index >= 0) sessions[index] = snapshot;
  else sessions.push(snapshot);
  write("sessions", sessions.slice(-40));
  write("trial", snapshot);
  write("trial-case", snapshot.caseId);
}
export function getDemoProfile(): Profile {
  const done = getSessions().filter((s) => s.finished);
  const xp = 1240 + done.length * 240;
  return {
    id: "demo-student",
    name: read("name", "Étudiant démo"),
    level: 4 + Math.floor((xp - 1240) / 760),
    xp,
    nextLevelXp: 2000 + Math.floor((xp - 1240) / 760) * 760,
    badges: [
      "Première plaidoirie",
      "Esprit d’analyse",
      ...(done.length ? ["Pratique régulière"] : []),
    ],
    completedCount: 12 + done.length,
    averageScore: 78,
  };
}
export function getDemoRoles(): Role[] {
  const level = getDemoProfile().level;
  return roles.map((r) => ({
    ...r,
    unlocked: r.id !== "prosecutor" || level >= 6,
    condition: r.id === "prosecutor" ? "Niveau 06 requis" : undefined,
  }));
}
export function createDemoSession(roleId: string, caseId: string): Snapshot {
  if (!getDemoRoles().some((r) => r.id === roleId && r.unlocked))
    throw new Error("Ce rôle est verrouillé.");
  const c = getDemoCase(caseId);
  if (!c.roleIds.includes(roleId))
    throw new Error("Ce dossier n’est pas compatible avec le rôle choisi.");
  const s = snapshotSchema.parse({
    ...initialTrial,
    id: "demo-" + crypto.randomUUID(),
    caseId,
    roleId,
    canResume: true,
    allowedActions: ["continue"],
    activeSpeaker: "president",
    startedAt: new Date().toISOString(),
  });
  saveSession(s);
  return s;
}
export function fromState(snapshot: Snapshot, state: TrialState): Snapshot {
  return {
    ...snapshot,
    ...state,
    entries: state.entries.slice(-2000),
    activeSpeaker: speakerId(state.entries.at(-1)?.speaker || "Le président"),
    allowedActions: state.finished
      ? []
      : [1, 2, 4].includes(state.step)
        ? [
            "user_text",
            "user_audio",
            ...(state.step === 2 ? ["present_exhibit" as const] : []),
          ]
        : ["continue"],
  };
}
export function demoVerdict(s: Snapshot): Verdict {
  return verdictSchema.parse({
    trialId: s.id,
    outcome: "Les prétentions restent discutées dans cet exercice fictif.",
    judgment:
      "La cour a examiné les arguments et les pièces du dossier « " +
      getDemoCase(s.caseId).title +
      " ». La discussion contradictoire a permis de relever les points à établir et les limites des éléments présentés. Cette motivation prédéfinie illustre le parcours pédagogique, sans trancher de litige réel.",
    score: 82,
    criteria: [
      {
        id: "argument",
        label: "Argumentation",
        score: 85,
        weight: 0.4,
        explanation:
          "Exemple : relier une demande à un fait précis et distinguer fait établi et supposition.",
      },
      {
        id: "evidence",
        label: "Utilisation des pièces",
        score: 80,
        weight: 0.3,
        explanation:
          "Exemple : expliquer la portée et les limites de la pièce présentée.",
      },
      {
        id: "structure",
        label: "Expression et structure",
        score: 81,
        weight: 0.3,
        explanation:
          "Exemple : annoncer sa position, développer ses arguments et conclure clairement.",
      },
    ],
    citations: [],
    strengths: [
      "Une position a été formulée.",
      "Une pièce a été soumise à la discussion contradictoire.",
    ],
    improvements: [
      "Reliez chaque demande à un fait précis.",
      "Expliquez ce que chaque pièce permet d’établir.",
      "Répondez directement à l’objection.",
    ],
    rewards: { xp: 240, badges: ["Pratique régulière"], roles: [] },
  });
}
