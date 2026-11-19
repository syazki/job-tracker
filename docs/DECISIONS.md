# Decisions

Short records of the main technical choices: what was chosen, what else was
considered, and why. Update an entry (don't delete it) if a decision is reversed.

## D1. Monorepo with npm workspaces
`apps/api` and (soon) `apps/web` live in one repo with one lockfile and one CI
pipeline. Alternative: separate repos, which mean more setup and harder
cross-cutting changes for a solo project. Turborepo/Nx were skipped as
unnecessary at two packages. A `packages/shared` package (Zod schemas used by
both API and UI) will be added only when there's real code to share.

## D2. Raw SQL with `pg`, no ORM
I already know SQL well, and the long-term goal is data engineering, so writing
and tuning real SQL is part of what this project demonstrates. Constraints live
in the database (CHECKs, composite FKs) rather than only in app code, so the
data stays valid no matter which code path writes it. Trade-off: no generated
types for query results, which will need Zod or hand-written types. Considered:
Prisma (heavy, hides SQL), Drizzle/Kysely (good typed options; revisit if raw
SQL becomes painful).

## D3. Hand-written migration runner
~50 lines: ordered `.sql` files, one transaction per file, a
`schema_migrations` table, and an advisory lock against concurrent runs. Easy to
explain completely, with no tool-specific DSL. Considered node-pg-migrate and
dbmate. Swap to one of them if I need down-migrations or more features.

## D4. Status as `text` + CHECK, not a Postgres ENUM
Adding a value to an ENUM is easy, but removing or renaming one is painful. A
CHECK constraint can be changed in one migration. Same data integrity guarantee.

## D5. UUID primary keys
Generated in Postgres (`gen_random_uuid()`). IDs appear in URLs, and sequential
integers leak row counts and invite guessing other users' IDs (authorization
must still be checked; UUIDs are not security). Cost: larger indexes, which
doesn't matter at this scale.

## D6. Integration tests against real Postgres
Most of the logic that matters here (constraints, queries) lives in the
database, so mocking it would test very little. CI runs a Postgres service
container; locally Docker Compose provides one. The test DB name must contain
"test" because setup wipes it.

## D7. Structured logging with Pino from day one
JSON logs with a per-request ID (`x-request-id`) so one request can be traced
across log lines, which matters most once the background import worker exists.
Auth and cookie headers are redacted.
