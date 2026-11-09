import { z } from "zod";
import { cases } from "./model";
import {
  profileSchema,
  roleSchema,
  caseSchema,
  listSchema,
  snapshotSchema,
  verdictSchema,
  historySchema,
  type Snapshot,
} from "./contracts";
export const serverMode = import.meta.env.VITE_APP_MODE === "server";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
let csrf = "";
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  const method = options.method || "GET";
  try {
    if (method !== "GET" && !csrf) await serverApi.csrf();
    const response = await fetch(base + path, {
      ...options,
      credentials: "include",
      signal: options.signal || controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" && csrf ? { "X-CSRFToken": csrf } : {}),
        ...options.headers,
      },
    });
    if (response.status === 202)
      throw new ApiError(202, "Le jugement est encore en préparation.");
    if (!response.ok) {
      if (response.status === 401)
        window.dispatchEvent(new Event("lexora-session-expired"));
      throw new ApiError(
        response.status,
        response.status === 401
          ? "Votre session a expiré. Reconnectez-vous."
          : response.status === 403
            ? "Accès refusé."
            : response.status === 429
              ? "Trop de demandes. Réessayez dans un instant."
              : "Le service est indisponible. Réessayez.",
      );
    }
    if (response.status === 204) return schema.parse(undefined);
    return schema.parse(await response.json());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof z.ZodError)
      throw new Error(
        "La réponse serveur ne correspond pas au contrat attendu.",
      );
    throw new Error(
      "Connexion au serveur impossible. Votre saisie est conservée.",
    );
  } finally {
    clearTimeout(timer);
  }
}
const empty = z.union([z.void(), z.object({ detail: z.string().optional() })]);
const json = (value: unknown) => JSON.stringify(value);
export interface ApiClient {
  getCases(): Promise<z.infer<typeof caseSchema>[]>;
  getProfile(): Promise<z.infer<typeof profileSchema>>;
  getRoles(): Promise<z.infer<typeof roleSchema>[]>;
  getCase(id: string): Promise<z.infer<typeof caseSchema>>;
  createTrial(roleId: string, caseId: string): Promise<Snapshot>;
  getTrial(id: string): Promise<Snapshot>;
}
export const api: ApiClient = {
  async getCases() {
    if (!serverMode) return cases.map((c) => caseSchema.parse(c));
    return (await request("/cases", listSchema(caseSchema))).results;
  },
  getProfile: () => request("/me", profileSchema),
  getRoles: () => request("/roles", z.array(roleSchema)),
  getCase: (id) => request("/cases/" + encodeURIComponent(id), caseSchema),
  createTrial: (roleId, caseId) =>
    request("/trials", snapshotSchema, {
      method: "POST",
      body: json({ roleId, caseId }),
    }),
  getTrial: (id) =>
    request("/trials/" + encodeURIComponent(id), snapshotSchema),
};
export const serverApi = {
  ...api,
  async csrf() {
    csrf = (await request("/auth/csrf", z.object({ csrfToken: z.string() })))
      .csrfToken;
  },
  async login(email: string, password: string) {
    await this.csrf();
    await request("/auth/login", empty, {
      method: "POST",
      body: json({ email, password }),
    });
    return api.getProfile();
  },
  async logout() {
    await request("/auth/logout", empty, { method: "POST" });
    csrf = "";
  },
  async register(name: string, email: string, password: string) {
    await this.csrf();
    return request("/auth/register", empty, {
      method: "POST",
      body: json({ name, email, password }),
    });
  },
  async forgot(email: string) {
    await this.csrf();
    return request("/auth/forgot-password", empty, {
      method: "POST",
      body: json({ email }),
    });
  },
  async reset(uid: string, token: string, password: string) {
    await this.csrf();
    return request("/auth/reset-password", empty, {
      method: "POST",
      body: json({ uid, token, password }),
    });
  },
  saveProfile: (name: string) =>
    request("/me", profileSchema, { method: "PATCH", body: json({ name }) }),
  getResult: (id: string) =>
    request("/trials/" + encodeURIComponent(id) + "/result", verdictSchema),
  getHistory: (params?: URLSearchParams) =>
    request(
      "/trials" + (params?.size ? "?" + params : ""),
      listSchema(historySchema),
    ),
  getCasePage: (params: URLSearchParams) =>
    request("/cases?" + params, listSchema(caseSchema)),
};
