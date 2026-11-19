import pg from "pg";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { createLogger } from "../src/logger.js";
import { testPool } from "./helpers.js";

const logger = createLogger("silent", false);
const pool = testPool();
afterAll(() => pool.end());

describe("health endpoints", () => {
  it("GET /health/live returns ok", async () => {
    const res = await request(createApp({ pool, logger })).get("/health/live");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("GET /health/ready returns ok when the database is reachable", async () => {
    const res = await request(createApp({ pool, logger })).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body.db).toBe("ok");
  });

  it("GET /health/ready returns 503 when the database is down", async () => {
    // Port 1 has nothing listening, so every query fails fast.
    const deadPool = new pg.Pool({ connectionString: "postgres://x:x@127.0.0.1:1/none" });
    const res = await request(createApp({ pool: deadPool, logger })).get("/health/ready");
    expect(res.status).toBe(503);
    await deadPool.end();
  });

  it("echoes a request ID header so logs can be correlated", async () => {
    const res = await request(createApp({ pool, logger })).get("/health/live").set("x-request-id", "abc-123");
    expect(res.headers["x-request-id"]).toBe("abc-123");
  });

  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(createApp({ pool, logger })).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
  });
});
