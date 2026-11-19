import { Router } from "express";
import type pg from "pg";

// Two endpoints, two questions:
//  /health/live  - "is the process up?" (cheap; no dependencies)
//  /health/ready - "can it serve traffic?" (checks the database)
// The host's health check uses /ready so it won't route traffic to an instance
// that can't reach Postgres.
export function healthRouter(pool: pg.Pool) {
  const router = Router();

  router.get("/live", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.get("/ready", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", db: "ok" });
    } catch (err) {
      req.log.error({ err }, "readiness check failed");
      res.status(503).json({ status: "error", db: "unreachable" });
    }
  });

  return router;
}
