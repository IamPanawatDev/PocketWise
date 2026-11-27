import { gatewayRegistry } from "@/lib/server/gateway-registry";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { getAuthenticatedUser } from "@/lib/server/auth/current-user";
import { ReportService } from "./report.service";

export function registerReportRoutes(): void {
  // GET /api/v1/reports/summary
  gatewayRegistry.register("GET", "reports/summary", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const url = new URL(ctx.req.url);
    const searchParams = url.searchParams;

    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!fromDate || !toDate) {
      return jsonError("VALIDATION_ERROR", "ต้องระบุ fromDate และ toDate", 400);
    }

    const categoryId = searchParams.has("categoryId")
      ? Number(searchParams.get("categoryId"))
      : undefined;
    const tagId = searchParams.has("tagId")
      ? Number(searchParams.get("tagId"))
      : undefined;

    const result = await ReportService.getSummary(user.userId, {
      fromDate,
      toDate,
      categoryId,
      tagId,
    });

    return jsonSuccess(result);
  });

  // GET /api/v1/reports/trends
  gatewayRegistry.register("GET", "reports/trends", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const url = new URL(ctx.req.url);
    const searchParams = url.searchParams;

    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const period = searchParams.get("period") || "monthly";

    if (!fromDate || !toDate) {
      return jsonError("VALIDATION_ERROR", "ต้องระบุ fromDate และ toDate", 400);
    }

    const categoryId = searchParams.has("categoryId")
      ? Number(searchParams.get("categoryId"))
      : undefined;
    const tagId = searchParams.has("tagId")
      ? Number(searchParams.get("tagId"))
      : undefined;

    const result = await ReportService.getTrends(user.userId, {
      fromDate,
      toDate,
      period,
      categoryId,
      tagId,
    });

    return jsonSuccess(result);
  });

  // GET /api/v1/reports/export
  gatewayRegistry.register("GET", "reports/export", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const url = new URL(ctx.req.url);
    const searchParams = url.searchParams;

    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const format = searchParams.get("format") || "csv";
    const type = searchParams.get("type") || "full";

    if (!fromDate || !toDate) {
      return jsonError("VALIDATION_ERROR", "ต้องระบุ fromDate และ toDate", 400);
    }

    const categoryId = searchParams.has("categoryId")
      ? Number(searchParams.get("categoryId"))
      : undefined;
    const tagId = searchParams.has("tagId")
      ? Number(searchParams.get("tagId"))
      : undefined;

    const result = await ReportService.exportReport(user.userId, {
      fromDate,
      toDate,
      format,
      type,
      categoryId,
      tagId,
    });

    return new Response(result.content as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": result.contentType,
        "Content-Disposition": `attachment; filename="${result.fileName}"`,
      },
    });
  });
}
