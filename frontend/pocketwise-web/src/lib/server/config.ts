import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

// Auto-load .env.local if running standalone script or test runner without Next.js runtime
if (typeof process.loadEnvFile === "function") {
  const localEnvPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(localEnvPath)) {
    try {
      process.loadEnvFile(localEnvPath);
    } catch {}
  }
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Database Connection
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required and cannot be empty"),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  JWT_ISSUER: z.string().default("PocketWiseApi"),
  JWT_AUDIENCE: z.string().default("PocketWiseWeb"),
  JWT_ACCESS_TOKEN_EXP_MINUTES: z.coerce.number().positive().default(60),
  JWT_REFRESH_TOKEN_EXP_DAYS: z.coerce.number().positive().default(30),

  // Cookie Names & Lifespans
  AUTH_ACCESS_COOKIE: z.string().default("pw_access"),
  AUTH_REFRESH_COOKIE: z.string().default("pw_refresh"),

  // Legacy Fallback URLs (Decommissioned in Phase 7)
  NEXT_PUBLIC_API_BASE_URL: z.string().optional(),
  NEXT_PUBLIC_SIGNALR_HUB_URL: z.string().optional(),

  // App URLs
  NEXT_PUBLIC_APP_URL: z.string().optional(),

  // Schedulers & Background Jobs
  CRON_SECRET: z.string().optional(),

  // AI & OCR Service
  GEMINI_API_KEY: z.string().optional(),
});

function loadConfig() {
  const parsed = envSchema.safeParse(process.env);
  const configError = !parsed.success
    ? parsed.error.issues.map((i) => `[${i.path.join(".")}]: ${i.message}`).join(", ")
    : null;

  if (configError) {
    console.error(
      `❌ Invalid Server Configuration. Please check your environment variables:\n${configError}`,
    );
  }

  const env = parsed.success
    ? parsed.data
    : {
        NODE_ENV: (process.env.NODE_ENV as "production" | "development" | "test") || "development",
        DATABASE_URL: process.env.DATABASE_URL || "",
        JWT_SECRET: process.env.JWT_SECRET || "fallback-secret-minimum-32-chars-long-placeholder",
        JWT_ISSUER: process.env.JWT_ISSUER || "PocketWiseApi",
        JWT_AUDIENCE: process.env.JWT_AUDIENCE || "PocketWiseWeb",
        JWT_ACCESS_TOKEN_EXP_MINUTES: 60,
        JWT_REFRESH_TOKEN_EXP_DAYS: 30,
        AUTH_ACCESS_COOKIE: "pw_access",
        AUTH_REFRESH_COOKIE: "pw_refresh",
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
        NEXT_PUBLIC_SIGNALR_HUB_URL: process.env.NEXT_PUBLIC_SIGNALR_HUB_URL,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        CRON_SECRET: process.env.CRON_SECRET,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      };

  return {
    configError,
    isProd: env.NODE_ENV === "production",
    nodeEnv: env.NODE_ENV,
    db: {
      url: env.DATABASE_URL,
    },
    jwt: {
      secretKey: env.JWT_SECRET,
      issuer: env.JWT_ISSUER ?? "PocketWiseApi",
      audience: env.JWT_AUDIENCE ?? "PocketWiseWeb",
      accessTokenExpMinutes: env.JWT_ACCESS_TOKEN_EXP_MINUTES ?? 60,
      refreshTokenExpDays: env.JWT_REFRESH_TOKEN_EXP_DAYS ?? 30,
    },
    cookies: {
      accessCookieName: env.AUTH_ACCESS_COOKIE ?? "pw_access",
      refreshCookieName: env.AUTH_REFRESH_COOKIE ?? "pw_refresh",
    },
    migration: {
      fallbackApiBaseUrl: env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5268",
      signalrHubUrl: env.NEXT_PUBLIC_SIGNALR_HUB_URL ?? "http://localhost:5268/hubs/notifications",
    },
    app: {
      url: env.NEXT_PUBLIC_APP_URL,
    },
    cron: {
      secret: env.CRON_SECRET,
    },
    ocr: {
      geminiApiKey: env.GEMINI_API_KEY,
    },
  };
}

export const serverConfig = loadConfig();
export type ServerConfig = typeof serverConfig;
