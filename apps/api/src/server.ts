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
        "ChaiForm REST API generated from tRPC. Authenticated routes use the `jwt` httpOnly cookie after POST /api/auth/sign-in.",
    };

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

  if (env.PUBLIC_OPENAPI_DOCS === "true") return next();

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

app.use(cookieParser());
app.use(express.json({ limit: "256kb" }));

app.get("/", (_req, res) => {
  return res.json({ message: "ChaiForm API is up and running..." });
});

app.get("/health", (_req, res) => {
  return res.json({ message: "ChaiForm API is healthy", healthy: true });
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
