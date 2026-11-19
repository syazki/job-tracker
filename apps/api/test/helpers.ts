import { randomUUID } from "node:crypto";
import pg from "pg";

export function testPool() {
  return new pg.Pool({ connectionString: process.env.DATABASE_URL });
}

export async function createUser(pool: pg.Pool) {
  const { rows } = await pool.query<{ id: string }>(
    "INSERT INTO users (email) VALUES ($1) RETURNING id",
    [`user-${randomUUID()}@example.com`],
  );
  return rows[0]!.id;
}

export async function createResume(pool: pg.Pool, userId: string, label = "v1", skills: string[] = []) {
  const { rows } = await pool.query<{ id: string }>(
    "INSERT INTO resume_versions (user_id, label, skills) VALUES ($1, $2, $3) RETURNING id",
    [userId, label, skills],
  );
  return rows[0]!.id;
}
