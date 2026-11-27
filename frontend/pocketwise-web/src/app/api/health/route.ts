import { NextResponse } from "next/server";
import { serverConfig } from "@/lib/server/config";
import { client, db } from "@/lib/server/db";
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
  let dbErrorDetails: Record<string, unknown> | null = null;

  if (hasDbUrl) {
    try {
      await db.execute(sql`SELECT 1`);
      dbConnection = "connected";
    } catch (err: unknown) {
      dbConnection = "failed";
      dbError = err instanceof Error ? err.message : String(err);
      const anyErr = err as Record<string, unknown> | undefined;
      dbErrorDetails = {
        name: err instanceof Error ? err.name : undefined,
        code: anyErr?.code,
        errno: anyErr?.errno,
        detail: anyErr?.detail,
        hint: anyErr?.hint,
        cause: anyErr?.cause ? String(anyErr.cause) : undefined,
      };
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
        hasGeminiApiKey: Boolean(
          (serverConfig.ocr.geminiApiKey && serverConfig.ocr.geminiApiKey.length > 5) ||
          (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5)
        ),
        databaseConnection: dbConnection,
        databaseError: dbError,
        databaseErrorDetails: dbErrorDetails,
        dbHost: client.options.host ? String(client.options.host[0]) : undefined,
        dbPort: client.options.port ? client.options.port[0] : undefined,
        dbDatabase: client.options.database,
        dbUser: client.options.user,
        sslConfigured: Boolean(client.options.ssl),
      },
    },
    { status: isHealthy ? 200 : 503 },
  );
}
