import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { serverConfig } from "../config";

/**
 * Normalizes a database URL into a standard URI supported by postgres.js.
 * Automatically converts .NET / Npgsql / ADO.NET connection strings (Host=...;Port=...;)
 * into standard `postgresql://user:pass@host:port/database` URIs and handles URL encoding.
 */
export function normalizeDbUrl(raw: string | undefined): string {
  if (!raw) return "";
  let trimmed = raw.trim();

  // Strip wrapping quotes if any
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  // If already postgresql:// or postgres:// URI, return cleaned
  if (trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://")) {
    return trimmed;
  }

  // Check if it's key-value pair (.NET / Npgsql / ADO.NET format)
  if (
    trimmed.includes(";") &&
    (trimmed.toLowerCase().includes("host=") || trimmed.toLowerCase().includes("server="))
  ) {
    const pairs = trimmed.split(";").map((s) => s.trim()).filter(Boolean);
    const map: Record<string, string> = {};
    for (const pair of pairs) {
      const eq = pair.indexOf("=");
      if (eq > 0) {
        const key = pair.slice(0, eq).trim().toLowerCase();
        const val = pair.slice(eq + 1).trim();
        map[key] = val;
      }
    }
    const host = map["host"] || map["server"] || "localhost";
    const port = map["port"] || "5432";
    const database = map["database"] || map["initial catalog"] || "postgres";
    const username = encodeURIComponent(
      map["username"] || map["user id"] || map["user"] || "postgres"
    );
    const password = encodeURIComponent(map["password"] || map["pwd"] || "");
    return `postgresql://${username}:${password}@${host}:${port}/${database}`;
  }

  return trimmed;
}

// Configure client for serverless / pooled connections
// `prepare: false` is required when using transaction poolers like Supabase PgBouncer.
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const rawUrl = serverConfig.db.url || "";
const dbUrl = normalizeDbUrl(rawUrl) || "postgresql://invalid:invalid@localhost:5432/invalid";
const isLocalhost =
  !dbUrl ||
  dbUrl.includes("localhost") ||
  dbUrl.includes("127.0.0.1");

const client =
  globalForDb.conn ??
  postgres(dbUrl, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: isLocalhost ? false : { rejectUnauthorized: false },
  });

if (!serverConfig.isProd) {
  globalForDb.conn = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;
export { client, schema };
