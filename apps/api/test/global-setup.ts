import pg from "pg";
import { migrate } from "../src/db/migrate.js";

// Runs once before the whole test suite: wipe the test database and apply all
// migrations from scratch. This also tests the migrations themselves: if
// 001_init.sql is broken, every CI run fails here.
export default async function setup() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL must be set for tests (see .env.example)");
  if (!/test/.test(new URL(url).pathname)) {
    throw new Error(`Refusing to wipe a database whose name doesn't contain "test": ${url}`);
  }

  const pool = new pg.Pool({ connectionString: url });
  try {
    await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
    await migrate(pool, () => {});
  } finally {
    await pool.end();
  }
}
