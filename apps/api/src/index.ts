import http from "node:http";

const PORT = Number(process.env.PORT ?? 8000);

function writeJson(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function bootstrap() {
  let expressHandler: http.RequestListener | null = null;

  const server = http.createServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";

    if (path === "/health" || path === "/") {
      writeJson(res, 200, {
        healthy: true,
        ready: Boolean(expressHandler),
        message: expressHandler ? "ChaiForm API is healthy" : "ChaiForm API is starting",
      });
      return;
    }

    if (!expressHandler) {
      writeJson(res, 503, { error: "ChaiForm API is starting" });
      return;
    }

    expressHandler(req, res);
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, "0.0.0.0", () => resolve());
  });

  const { logger } = await import("@repo/logger");
  logger.info(`http server is running on 0.0.0.0:${PORT}`);

  try {
    const { runMigrations } = await import("./migrate");
    await runMigrations();
    logger.info("Database schema patches applied");
  } catch (err) {
    logger.error("Database migration failed", { err });
    const nodeEnv = process.env.NODE_ENV ?? "development";
    if (["production", "prod"].includes(nodeEnv)) {
      process.exit(1);
    }
  }

  try {
    const { app } = await import("./server");
    expressHandler = app;
    logger.info("Express application loaded");
  } catch (err) {
    logger.error("Failed to load Express application", { err });
    return;
  }

  const { isEmailConfigured } = await import("@repo/services/env");
  logger.info(
    isEmailConfigured()
      ? "Email: Resend configured — real emails will be sent"
      : "Email: not configured — links will only appear in API logs (set RESEND_API_KEY + EMAIL_FROM in .env)",
  );
}

bootstrap().catch((err) => {
  console.error("Fatal bootstrap error", err);
  process.exit(1);
});
