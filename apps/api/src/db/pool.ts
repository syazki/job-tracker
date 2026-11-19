import pg from "pg";

// One connection pool per process. Opening a new connection per request is
// slow and quickly exhausts the connection limit on small hosted databases.
export function createPool(connectionString: string, ssl: boolean) {
  return new pg.Pool({
    connectionString,
    ssl: ssl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
}
