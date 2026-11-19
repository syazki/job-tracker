import { randomUUID } from "node:crypto";
import express, { type ErrorRequestHandler } from "express";
import { pinoHttp } from "pino-http";
import type pg from "pg";
import type { Logger } from "./logger.js";
import { healthRouter } from "./routes/health.js";

// createApp builds the Express app but does not start listening.
// Tests import this and drive it with supertest, without opening a real port.
export function createApp(deps: { pool: pg.Pool; logger: Logger }) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));
  app.use(
    pinoHttp({
      logger: deps.logger,
      // A request ID ties together every log line from one request.
      genReqId: (req, res) => {
        const id = (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
    }),
  );

  app.use("/health", healthRouter(deps.pool));

  app.get("/api/hello", (_req, res) => {
    res.json({ message: "Job tracker API is running" });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  // Express 5 sends errors thrown in async handlers here automatically.
  // Log the details server-side; never leak stack traces to the client.
  const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    req.log.error({ err }, "unhandled error");
    res.status(500).json({ error: "internal_error" });
  };
  app.use(errorHandler);

  return app;
}
