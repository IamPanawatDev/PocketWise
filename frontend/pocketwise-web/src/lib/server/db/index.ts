import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { serverConfig } from "../config";

// Configure client for serverless / pooled connections
// `prepare: false` is required when using transaction poolers like Supabase PgBouncer.
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const isLocalhost =
  !serverConfig.db?.url ||
  serverConfig.db.url.includes("localhost") ||
  serverConfig.db.url.includes("127.0.0.1");

const client =
  globalForDb.conn ??
  postgres(serverConfig.db.url, {
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: isLocalhost ? false : "require",
  });

if (!serverConfig.isProd) {
  globalForDb.conn = client;
}

export const db = drizzle(client, { schema });
export type Database = typeof db;
export { client, schema };
