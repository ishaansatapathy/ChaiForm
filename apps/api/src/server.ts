import express from "express";

import { logger } from "@repo/logger";

import cors from "cors";

import cookieParser from "cookie-parser";

import helmet from "helmet";

import type { Request, Response, NextFunction } from "express";

import * as trpcExpress from "@trpc/server/adapters/express";

import { generateOpenApiDocument, createOpenApiExpressMiddleware } from "trpc-to-openapi";

import { serverRouter, openApiRouter, createContext } from "@repo/trpc/server";

import { env } from "./env";

import { createTrpcRateLimitMiddleware } from "./middleware/rate-limiters";

import { googleAuthRouter } from "./routes/google-auth";

export const app = express();

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

function normalizeOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.origin;
  } catch {
    return null;
  }
}

function trustedOrigins() {
  return new Set(
    [env.CLIENT_URL, env.BASE_URL, "http://localhost:3000", "http://localhost:8000"]
      .map((value) => normalizeOrigin(value))
      .filter((value): value is string => Boolean(value)),
  );
}

function requireTrustedOrigin(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") return next();

  const hasCookieAuth = Boolean(req.headers.cookie);
  const origin = normalizeOrigin(req.headers.origin);
  const referer = normalizeOrigin(req.headers.referer);
  const observed = origin ?? referer;

  if (observed && !trustedOrigins().has(observed)) {
    return res.status(403).json({ error: "Untrusted request origin" });
  }

  if (!observed && hasCookieAuth) {
    return res.status(403).json({ error: "Missing request origin" });
  }

  if (hasCookieAuth && req.headers["x-chaiform-csrf"] !== "1") {
    return res.status(403).json({ error: "Missing CSRF header" });
  }

  return next();
}

type OpenApiMedia = {
  examples?: Record<string, { summary: string; value: unknown }>;
};

type OpenApiOperation = {
  description?: string;
  requestBody?: {
    content?: Record<string, OpenApiMedia>;
  };
  parameters?: Array<{
    name?: string;
    description?: string;
    example?: unknown;
  }>;
};

type OpenApiDocumentWithPaths = {
  paths?: Record<string, Record<string, OpenApiOperation>>;
};

function addJsonRequestExample(
  document: OpenApiDocumentWithPaths,
  path: string,
  method: "post" | "patch",
  key: string,
  summary: string,
  value: unknown,
) {
  const operation = document.paths?.[path]?.[method];
  const json = operation?.requestBody?.content?.["application/json"];
  if (!json) return;
  json.examples = {
    ...json.examples,
    [key]: { summary, value },
  };
}

function enrichOpenApiExamples(document: OpenApiDocumentWithPaths) {
  addJsonRequestExample(
    document,
    "/authentication/sign-in",
    "post",
    "demoSignIn",
    "Demo creator sign-in",
    { email: "demo@chaiform.dev", password: "DemoPass123!" },
  );

  addJsonRequestExample(
    document,
    "/forms/",
    "post",
    "conditionalForm",
    "Create a form with conditional follow-up question",
    {
      title: "Customer feedback",
      description: "Feedback form with an optional support follow-up",
      visibility: "public",
      theme: "default",
      allowMultipleSubmissions: true,
      requireAuthentication: false,
      fields: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          label: "Need follow up?",
          type: "select",
          required: true,
          config: { options: ["Yes", "No"] },
        },
        {
          id: "22222222-2222-4222-8222-222222222222",
          label: "What should we help with?",
          type: "textarea",
          required: true,
          config: {
            showWhen: {
              fieldId: "11111111-1111-4111-8111-111111111111",
              operator: "eq",
              value: "Yes",
            },
          },
        },
      ],
    },
  );

  addJsonRequestExample(
    document,
    "/forms/submit",
    "post",
    "conditionalSubmit",
    "Submit the visible path of a conditional form",
    {
      formId: "00000000-0000-4000-8000-000000000000",
      answers: [{ fieldId: "11111111-1111-4111-8111-111111111111", value: "No" }],
      website: "",
    },
  );

  const listSubmissions = document.paths?.["/forms/{formId}/submissions"]?.get;
  if (listSubmissions) {
    listSubmissions.description =
      "List form submissions with search and submitted date filters. Use /forms/{formId}/submissions/export to export matching rows.";
    listSubmissions.parameters = listSubmissions.parameters?.map((parameter) => {
      if (parameter.name === "search") {
        return { ...parameter, description: "Filter by answer text", example: "pricing" };
      }
      if (parameter.name === "submittedFrom") {
        return { ...parameter, description: "Inclusive submitted date, YYYY-MM-DD", example: "2026-05-01" };
      }
      if (parameter.name === "submittedTo") {
        return { ...parameter, description: "Exclusive submitted date, YYYY-MM-DD", example: "2026-05-27" };
      }
      return parameter;
    });
  }
}

function buildOpenApiDocument() {
  try {
    const document = generateOpenApiDocument(openApiRouter, {
      title: "ChaiForm OpenAPI",
      version: "1.0.0",
      baseUrl: env.BASE_URL.concat("/api"),
    });

    document.info = {
      ...document.info,
      description:
        "ChaiForm REST API generated from tRPC. Authenticated routes use the `jwt` httpOnly cookie after POST /api/authentication/sign-in. Google OAuth (browser): GET {CLIENT_URL}/api-auth/google → Google consent → GET {CLIENT_URL}/api-auth/google/callback.",
    };

    const oauthPaths = document.paths ?? {};
    oauthPaths["/authentication/google-oauth"] = {
      get: {
        tags: ["Authentication"],
        summary: "Google OAuth (web redirect flow)",
        description:
          "Implemented on the Next.js app, not this Express host. Start: GET {CLIENT_URL}/api-auth/google. Callback: GET {CLIENT_URL}/api-auth/google/callback. Configure GOOGLE_OAUTH_* on Railway and matching redirect URI in Google Cloud Console.",
        responses: {
          "302": { description: "Redirect to Google consent or back to sign-in" },
        },
      },
    };
    document.paths = oauthPaths;

    document.servers = [{ url: env.BASE_URL.concat("/api"), description: "ChaiForm API" }];

    document.components = {
      ...document.components,
      securitySchemes: {
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "jwt",
          description: "JWT access token issued after sign-in (httpOnly cookie)",
        },
      },
    };

    enrichOpenApiExamples(document as OpenApiDocumentWithPaths);

    return document;
  } catch (error) {
    logger.error("OpenAPI document generation failed", {
      message: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

const openApiDocument = buildOpenApiDocument();

function isProduction() {
  return env.NODE_ENV === "production" || env.NODE_ENV === "prod";
}

function requireOpenApiDocsAuth(req: Request, res: Response, next: NextFunction) {
  if (!isProduction()) return next();

  if (env.PUBLIC_OPENAPI_DOCS !== "false") return next();

  const secret = env.OPENAPI_DOCS_SECRET;
  if (!secret) {
    return res.status(404).json({ error: "Not found" });
  }

  const header = req.headers.authorization;
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  const queryKey = typeof req.query.key === "string" ? req.query.key : undefined;
  if (bearer !== secret && queryKey !== secret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  }),
);

app.use(requireTrustedOrigin);
app.use(cookieParser());
app.use(express.json({ limit: "256kb" }));

app.get("/", (_req, res) => {
  return res.json({ message: "ChaiForm API is up and running..." });
});

app.get("/health", async (_req, res) => {
  const checkDatabase = process.env.HEALTH_CHECK_DATABASE !== "false";
  try {
    if (checkDatabase) {
      const { pingDatabase } = await import("@repo/database/health");
      await pingDatabase();
    }
    return res.json({
      message: "ChaiForm API is healthy",
      healthy: true,
      ...(checkDatabase ? { database: "ok" as const } : {}),
    });
  } catch (error) {
    logger.error("Health check failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return res.status(503).json({
      message: "ChaiForm API is unhealthy",
      healthy: false,
      database: "error",
    });
  }
});

app.post("/internal/purge-expired-forms", async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  const provided = req.headers["x-cron-secret"];
  if (!cronSecret || provided !== cronSecret) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const FormService = (await import("@repo/services/form")).default;
    const deleted = await new FormService().purgeExpiredFormsJob();
    return res.json({ deleted });
  } catch (error) {
    logger.error("purge-expired-forms failed", {
      message: error instanceof Error ? error.message : error,
    });
    return res.status(500).json({ error: "Purge failed" });
  }
});

logger.debug(`openapi.json: ${env.BASE_URL}/openapi.json`);

app.get("/openapi.json", requireOpenApiDocsAuth, (_req, res) => {
  return res.json(openApiDocument);
});

logger.debug(`docs: ${env.BASE_URL}/docs`);

import("@scalar/express-api-reference")
  .then(({ apiReference }) => {
    app.use("/docs", requireOpenApiDocsAuth, apiReference({ url: "/openapi.json" }));
  })
  .catch((error) => {
    logger.warn("API docs disabled", {
      message: error instanceof Error ? error.message : error,
    });
  });

app.use("/auth", googleAuthRouter);

const trpcRateLimit = createTrpcRateLimitMiddleware();

try {
  app.use(
    "/api",
    trpcRateLimit,
    createOpenApiExpressMiddleware({
      router: serverRouter,
      createContext,
    }),
  );
} catch (error) {
  logger.warn("OpenAPI REST middleware disabled", {
    message: error instanceof Error ? error.message : error,
  });
}

app.use(
  "/trpc",
  trpcRateLimit,
  trpcExpress.createExpressMiddleware({
    router: serverRouter,
    createContext,
  }),
);

export default app;
