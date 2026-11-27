import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/server/modules/auth/auth.service";
import { purgeAuditLogs } from "@/lib/server/audit";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // In local development or testing without CRON_SECRET configured, allow execution
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = req.headers.get("authorization");
  return authHeader === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized cron request" } },
      { status: 401 },
    );
  }

  try {
    const now = new Date();
    const purgedTokens = await authService.purgeExpiredRefreshTokens(now);
    const purgedLogs = await purgeAuditLogs(90); // 90 days retention

    return NextResponse.json({
      success: true,
      data: {
        job: "maintenance-cleanup",
        purgedExpiredRefreshTokensCount: purgedTokens,
        purgedOldAuditLogsCount: purgedLogs,
        timestamp: now.toISOString(),
      },
    });
  } catch (err: unknown) {
    console.error("[Cron:Cleanup] Execution failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to execute cleanup cron",
        },
      },
      { status: 500 },
    );
  }
}
