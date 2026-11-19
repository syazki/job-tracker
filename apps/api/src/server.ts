import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { createPool } from "./db/pool.js";
import { createLogger } from "./logger.js";

const config = loadConfig();
const logger = createLogger(config.LOG_LEVEL, config.NODE_ENV === "development");
const pool = createPool(config.DATABASE_URL, config.DATABASE_SSL);
const app = createApp({ pool, logger });

const server = app.listen(config.PORT, () => {
  logger.info({ port: config.PORT, env: config.NODE_ENV }, "api listening");
});

// Hosts send SIGTERM before replacing an instance on deploy. Finish in-flight
// requests and close DB connections instead of dropping them mid-query.
function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
