import { afterAll, describe, expect, it } from "vitest";
import { createResume, createUser, testPool } from "./helpers.js";

// These tests check rules the database itself enforces. If someone later
// "simplifies" the schema and drops a constraint, these fail.
const pool = testPool();
afterAll(() => pool.end());

async function insertApplication(userId: string, extra: Record<string, unknown> = {}) {
  // Merge into an object (not arrays) so overrides replace defaults instead of
  // producing duplicate columns. See docs/BUILD_LOG.md, entry 1.
  const row = { user_id: userId, company: "Acme", role_title: "SWE Intern", ...extra };
  const cols = Object.keys(row);
  const vals = Object.values(row);
  const placeholders = vals.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await pool.query(
    `INSERT INTO applications (${cols.join(", ")}) VALUES (${placeholders}) RETURNING *`,
    vals,
  );
  return rows[0];
}

describe("applications", () => {
  it("defaults status to 'saved'", async () => {
    const userId = await createUser(pool);
    const app = await insertApplication(userId);
    expect(app.status).toBe("saved");
  });

  it("rejects an unknown status", async () => {
    const userId = await createUser(pool);
    await expect(insertApplication(userId, { status: "ghosted" })).rejects.toThrow(/check constraint/);
  });

  it("rejects a blank company name", async () => {
    const userId = await createUser(pool);
    await expect(insertApplication(userId, { company: "   " })).rejects.toThrow(/check constraint/);
  });

  it("rejects a resume version that belongs to another user", async () => {
    const alice = await createUser(pool);
    const bob = await createUser(pool);
    const bobsResume = await createResume(pool, bob);
    await expect(insertApplication(alice, { resume_version_id: bobsResume })).rejects.toThrow(/foreign key/);
  });

  it("keeps the application but clears the link when its resume is deleted", async () => {
    const userId = await createUser(pool);
    const resumeId = await createResume(pool, userId);
    const app = await insertApplication(userId, { resume_version_id: resumeId });

    await pool.query("DELETE FROM resume_versions WHERE id = $1", [resumeId]);

    const { rows } = await pool.query("SELECT resume_version_id, user_id FROM applications WHERE id = $1", [app.id]);
    expect(rows[0]).toEqual({ resume_version_id: null, user_id: userId });
  });

  it("bumps updated_at on update", async () => {
    const userId = await createUser(pool);
    const app = await insertApplication(userId);
    await new Promise((r) => setTimeout(r, 10));
    const { rows } = await pool.query(
      "UPDATE applications SET status = 'applied' WHERE id = $1 RETURNING updated_at",
      [app.id],
    );
    expect(rows[0].updated_at.getTime()).toBeGreaterThan(app.updated_at.getTime());
  });
});

describe("users", () => {
  it("treats emails case-insensitively", async () => {
    await pool.query("INSERT INTO users (email) VALUES ('Case.Test@UBC.ca')");
    await expect(pool.query("INSERT INTO users (email) VALUES ('case.test@ubc.ca')")).rejects.toThrow(/unique/);
  });
});
