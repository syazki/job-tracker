import { defineConfig } from "vitest/config";

// Default to the local Docker Compose test database; CI sets DATABASE_URL itself.
// Set on process.env (not `test.env`) so globalSetup sees it too. `test.env`
// only applies inside test workers. See docs/BUILD_LOG.md, entry 2.
process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/jobtracker_test";

export default defineConfig({
  test: {
    globalSetup: ["./test/global-setup.ts"],
    // Test files share one real Postgres database, so run them one at a time.
    // Each test still creates its own users, so tests don't depend on each other.
    fileParallelism: false,
  },
});
