import http from "node:http";
import { runMigrations } from "./migrate";
import { logger } from "@repo/logger";
import { isEmailConfigured } from "@repo/services/env";
import { app as expressApplication } from "./server";

import { env } from "./env";

async function init() {
  try {
    const server = http.createServer(expressApplication);
    const PORT: number = env.PORT ? +env.PORT : 8000;

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(PORT, "0.0.0.0", () => {
        logger.info(`http server is running on PORT ${PORT}`);
        resolve();
      });
    });

    try {
      await runMigrations();
      logger.info("Database schema patches applied");
    } catch (err) {
      logger.error("Database migration failed — forms list/analytics may break until fixed", { err });
    }

    logger.info(
      isEmailConfigured()
        ? "Email: Resend configured — real emails will be sent"
        : "Email: not configured — links will only appear in API logs (set RESEND_API_KEY + EMAIL_FROM in .env)",
    );
  } catch (err) {
    logger.error(`Error creating http server`, { err });
    process.exit(1);
  }
}

init();

