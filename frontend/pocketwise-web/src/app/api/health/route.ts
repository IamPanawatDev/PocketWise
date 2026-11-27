import { NextResponse } from "next/server";
import { serverConfig } from "@/lib/server/config";
import { db } from "@/lib/server/db";
import { sql } from "drizzle-orm";

export async function GET() {
  const hasDbUrl = Boolean(serverConfig.db.url && serverConfig.db.url.length > 0);
  const hasJwtSecret = Boolean(
    serverConfig.jwt.secretKey &&
    serverConfig.jwt.secretKey.length >= 32 &&
    !serverConfig.jwt.secretKey.includes("fallback-secret")
  );

  let dbConnection = "not_tested";
  let dbError: string | null = null;

  if (hasDbUrl) {
    try {
      await db.execute(sql`SELECT 1`);
      dbConnection = "connected";
    } catch (err: unknown) {
      dbConnection = "failed";
      dbError = err instanceof Error ? err.message : String(err);
    }
  }

  const isHealthy = hasDbUrl && hasJwtSecret && dbConnection === "connected";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      environment: serverConfig.nodeEnv,
      configError: serverConfig.configError,
      diagnostics: {
        hasDatabaseUrl: hasDbUrl,
        hasJwtSecret: hasJwtSecret,
        databaseConnection: dbConnection,
        databaseError: dbError,
      },
    },
    { status: isHealthy ? 200 : 503 },
  );
}
