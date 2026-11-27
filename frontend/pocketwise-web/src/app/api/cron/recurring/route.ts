import { NextRequest, NextResponse } from "next/server";
import { RecurringTransactionService } from "@/lib/server/modules/recurring/recurring.service";

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
    const result = await RecurringTransactionService.processDue(new Date());

    return NextResponse.json({
      success: true,
      data: {
        job: "recurring-transactions",
        ...result,
      },
    });
  } catch (err: unknown) {
    console.error("[Cron:Recurring] Execution failed:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Failed to execute recurring transactions cron",
        },
      },
      { status: 500 },
    );
  }
}
