import { readFile, writeFile, unlink } from "node:fs/promises";
import ts from "typescript";
import { z } from "zod";
const temporary = new URL(
  "./.contract-" + process.pid + ".mjs",
  import.meta.url,
);
const source = await readFile(
  new URL("../src/services/contracts.ts", import.meta.url),
  "utf8",
);
await writeFile(
  temporary,
  ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
    },
  }).outputText,
);
let schemas;
try {
  schemas = await import(temporary.href);
} finally {
  await unlink(temporary);
}
const components = {};
for (const [name, schema] of Object.entries(schemas))
  if (name.endsWith("Schema") && schema instanceof z.ZodType) {
    const exported = z.toJSONSchema(schema, { target: "draft-2020-12" });
    delete exported.$schema;
    components[name] = exported;
  }
const ref = (name) => ({ $ref: "#/components/schemas/" + name });
const response = (name) => ({
  description: "Réponse selon le contrat proposé",
  content: { "application/json": { schema: ref(name) } },
});
const operation = (name, extra = {}) => ({
  responses: {
    200: response(name),
    401: { description: "Session expirée" },
    403: { description: "Accès refusé" },
  },
  ...extra,
});
const body = (properties) => ({
  required: true,
  content: {
    "application/json": {
      schema: { type: "object", properties, required: Object.keys(properties) },
    },
  },
});
const paths = {
  "/preferences": { get: operation("preferencesSchema"), put: operation("preferencesSchema", { requestBody: { required: true, content: { "application/json": { schema: ref("preferencesSchema") } } } }) },
  "/cases/{id}/notes": { parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], get: operation("noteSchema"), put: operation("noteSchema", { requestBody: body({ text: { type: "string", maxLength: 10000 } }) }) },
  "/auth/csrf": {
    get: {
      security: [],
      responses: {
        200: {
          description: "Initialise la protection CSRF",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["csrfToken"],
                properties: { csrfToken: { type: "string" } },
              },
            },
          },
        },
      },
    },
  },
  "/me": {
    get: operation("profileSchema"),
    patch: operation("profileSchema", {
      requestBody: body({ name: { type: "string" } }),
    }),
  },
  "/roles": {
    get: {
      responses: {
        200: {
          description: "Rôles autorisés",
          content: {
            "application/json": {
              schema: { type: "array", items: ref("roleSchema") },
            },
          },
        },
      },
    },
  },
  "/cases": {
    get: {
      parameters: [
        "search",
        "domain",
        "difficulty",
        "role_id",
        "page",
        "page_size",
      ].map((name) => ({ name, in: "query", schema: { type: "string" } })),
      responses: {
        200: {
          description: "Liste paginée",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["results", "count", "page", "pageSize"],
                properties: {
                  results: { type: "array", items: ref("caseSchema") },
                  count: { type: "integer" },
                  page: { type: "integer" },
                  pageSize: { type: "integer" },
                },
              },
            },
          },
        },
      },
    },
  },
  "/cases/{id}": {
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } },
    ],
    get: operation("caseSchema"),
  },
  "/trials": {
    get: {
      responses: {
        200: {
          description: "Historique paginé",
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["results", "count", "page", "pageSize"],
                properties: {
                  results: { type: "array", items: ref("historySchema") },
                  count: { type: "integer" },
                  page: { type: "integer" },
                  pageSize: { type: "integer" },
                },
              },
            },
          },
        },
      },
    },
    post: operation("snapshotSchema", {
      responses: { 201: response("snapshotSchema"), 401: { description: "Authentification requise" }, 403: { description: "Rôle verrouillé" }, 404: { description: "Dossier absent" } },
      requestBody: body({
        roleId: { type: "string" },
        caseId: { type: "string" },
      }),
    }),
  },
  "/trials/{id}": {
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } },
    ],
    get: operation("snapshotSchema"),
  },
  "/trials/{id}/result": {
    parameters: [
      { name: "id", in: "path", required: true, schema: { type: "string" } },
    ],
    get: operation("verdictSchema"),
  },
};
for (const name of [
  "login",
  "logout",
  "register",
  "forgot-password",
  "reset-password",
]) {
  const properties =
    name === "login"
      ? {
          email: { type: "string", format: "email" },
          password: { type: "string", writeOnly: true },
        }
      : name === "register"
        ? {
            name: { type: "string" },
            email: { type: "string", format: "email" },
            password: { type: "string", writeOnly: true },
          }
        : name === "forgot-password"
          ? { email: { type: "string", format: "email" } }
          : name === "reset-password"
            ? {
                uid: { type: "string" },
                token: { type: "string", writeOnly: true },
                password: { type: "string", writeOnly: true },
              }
            : {};
  paths["/auth/" + name] = {
    post: {
      security: name === "logout" ? [{ session: [] }] : [],
      parameters: [
        {
          name: "X-CSRFToken",
          in: "header",
          required: true,
          schema: { type: "string" },
        },
      ],
      ...(Object.keys(properties).length
        ? { requestBody: body(properties) }
        : {}),
      responses: {
        200: { description: "detail optionnel ; récupération non énumérante" },
        ...(name === "register" ? { 201: { description: "Compte créé" } } : {}),
        204: { description: "Action acceptée" },
        400: { description: "Données invalides" },
        401: { description: "Identifiants non valides" },
      },
    },
  };
}
await writeFile(
  new URL("../docs/openapi-proposed.json", import.meta.url),
  JSON.stringify(
    {
      openapi: "3.1.0",
      info: {
        title: "LEXORA — contrat partagé frontend / Django",
        version: "1.0.0",
        description:
          "Contrat v1 testé contre Django local ; voix et services externes soumis à leur configuration. Schémas générés depuis le frontend.",
      },
      servers: [{ url: "/api" }],
      security: [{ session: [] }],
      paths,
      components: {
        schemas: components,
        securitySchemes: {
          session: { type: "apiKey", in: "cookie", name: "sessionid" },
        },
      },
    },
    null,
    2,
  ) + "\n",
);
console.log("Contrat proposé exporté.");
