import { pino } from "pino";

// Structured (JSON) logs from day one. In production every line is one JSON
// object that a log platform can filter by field (e.g. level=error, reqId=...).
// Locally we pretty-print for readability.
export function createLogger(level: string, pretty: boolean) {
  return pino({
    level,
    redact: ["req.headers.authorization", "req.headers.cookie"],
    ...(pretty ? { transport: { target: "pino-pretty" } } : {}),
  });
}

export type Logger = ReturnType<typeof createLogger>;
