import { z } from "zod";
export const speakerIds = [
  "president",
  "assessor-1",
  "assessor-2",
  "prosecutor",
  "opposition",
  "clerk",
  "student",
] as const;
export type SpeakerId = (typeof speakerIds)[number];
export const speakerLabels: Record<SpeakerId, string> = {
  president: "Le président",
  "assessor-1": "Premier assesseur",
  "assessor-2": "Second assesseur",
  prosecutor: "Le ministère public",
  opposition: "L’avocat adverse",
  clerk: "Le greffier",
  student: "Vous",
};
export function speakerId(label: string): SpeakerId {
  return speakerIds.find((id) => speakerLabels[id] === label) || "president";
}
export const roleSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().default(""),
  unlocked: z.boolean(),
  condition: z.string().optional(),
});
export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number().int().nonnegative(),
  xp: z.number().nonnegative(),
  nextLevelXp: z.number().positive(),
  badges: z.array(z.string()),
  completedCount: z.number().int(),
  averageScore: z.number().min(0).max(100),
});
export const caseSchema = z.object({
  id: z.string(),
  title: z.string(),
  domain: z.string(),
  difficulty: z.string(),
  minutes: z.number(),
  description: z.string(),
  facts: z.string(),
  roleIds: z.array(z.string()).default(["defense", "civil"]),
  exhibits: z
    .array(
      z.object({
        id: z.string(),
        caseId: z.string(),
        title: z.string(),
        mediaType: z.enum(["text", "image", "pdf"]),
        content: z.string().optional(),
        url: z.string().optional(),
        downloadAllowed: z.boolean().default(false),
      }),
    )
    .default([]),
});
export const criterionSchema = z.object({
  id: z.string(),
  label: z.string(),
  score: z.number().min(0).max(100),
  weight: z.number().nonnegative(),
  explanation: z.string(),
});
export const citationSchema = z.object({
  id: z.string(),
  source: z.string(),
  title: z.string(),
  article: z.string(),
  excerpt: z.string(),
  url: z.string().optional(),
  version: z.string().optional(),
});
export const verdictSchema = z.object({
  trialId: z.string(),
  judgment: z.string(),
  outcome: z.string(),
  score: z.number().min(0).max(100),
  criteria: z.array(criterionSchema),
  citations: z.array(citationSchema),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  rewards: z.object({
    xp: z.number().nonnegative(),
    badges: z.array(z.string()),
    roles: z.array(z.string()),
  }),
});
export const entrySchema = z.object({
  id: z.string(),
  speaker: z.string(),
  text: z.string(),
});
export const snapshotSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  roleId: z.string(),
  step: z.number().int().min(0).max(6),
  entries: z.array(entrySchema).max(2000),
  seen: z.array(z.string()).max(2000),
  presented: z.array(z.string()),
  objection: z.boolean(),
  finished: z.boolean(),
  canResume: z.boolean(),
  allowedActions: z.array(
    z.enum(["user_text", "user_audio", "present_exhibit", "continue"]),
  ),
  activeSpeaker: z.enum(speakerIds),
  seq: z.number().int().nonnegative().default(0),
  audioCodecs: z.array(z.string()).default([]),
  startedAt: z.string(),
  endAt: z.string().optional(),
  websocketUrl: z.string().optional(),
});
export const historySchema = z.object({
  id: z.string(),
  caseId: z.string(),
  title: z.string(),
  date: z.string(),
  status: z.enum(["completed", "interrupted"]),
  score: z.number().nullable(),
  canResume: z.boolean(),
});
export const listSchema = <T extends z.ZodType>(schema: T) =>
  z.object({
    results: z.array(schema),
    count: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  });
export type Profile = z.infer<typeof profileSchema>;
export type CaseDetail = z.infer<typeof caseSchema>;
export type Exhibit = CaseDetail["exhibits"][number];
export type Verdict = z.infer<typeof verdictSchema>;
export type Citation = z.infer<typeof citationSchema>;
export type Snapshot = z.infer<typeof snapshotSchema>;
export type TrialHistory = z.infer<typeof historySchema>;
export type Role = z.infer<typeof roleSchema>;
export const ackSchema = z.object({
  type: z.literal("ack"),
  clientMessageId: z.string(),
  accepted: z.boolean(),
  reason: z.string().optional(),
});
export const eventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("snapshot"),
    eventId: z.string(),
    seq: z.number().int(),
    snapshot: snapshotSchema,
  }),
  z.object({
    type: z.literal("turn"),
    eventId: z.string(),
    seq: z.number().int(),
    turnId: z.string(),
    speaker: z.enum(speakerIds),
    text: z.string(),
    emotion: z.string().optional(),
    gesture: z.string().optional(),
    objection: z.boolean().default(false),
  }),
  z.object({
    type: z.literal("phase_change"),
    eventId: z.string(),
    seq: z.number().int(),
    step: z.number().int().min(0).max(6),
    allowedActions: z.array(
      z.enum(["user_text", "user_audio", "present_exhibit", "continue"]),
    ),
    endAt: z.string().optional(),
  }),
  z.object({
    type: z.literal("verdict"),
    eventId: z.string(),
    seq: z.number().int(),
    verdict: verdictSchema,
  }),
  z.object({
    type: z.literal("audio"),
    eventId: z.string(),
    seq: z.number().int(),
    turnId: z.string(),
    sentenceIndex: z.number().int(),
    url: z.string(),
    speaker: z.enum(speakerIds),
  }),
  z.object({
    type: z.literal("interrupt"),
    eventId: z.string(),
    seq: z.number().int(),
    turnId: z.string(),
  }),
]);
export type TrialEvent = z.infer<typeof eventSchema>;
