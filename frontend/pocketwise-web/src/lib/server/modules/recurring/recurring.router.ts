import { gatewayRegistry, GatewayContext } from "@/lib/server/gateway-registry";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { getAuthenticatedUser } from "@/lib/server/auth/current-user";
import { RecurringTransactionService } from "./recurring.service";

async function parseBody<T>(ctx: GatewayContext): Promise<T> {
  if (typeof ctx.payload?.body === "string") {
    try {
      return JSON.parse(ctx.payload.body) as T;
    } catch {
      return {} as T;
    }
  }
  return ctx.req.json().catch(() => ({} as T));
}

export function registerRecurringTransactionRoutes(): void {
  // GET /api/v1/recurring-transactions
  gatewayRegistry.register("GET", "recurring-transactions", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const result = await RecurringTransactionService.getAll(user.userId);
    return jsonSuccess(result);
  });

  // GET /api/v1/recurring-transactions/:id
  gatewayRegistry.register("GET", "recurring-transactions/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสรายการประจำไม่ถูกต้อง", 400);
    }

    const result = await RecurringTransactionService.getById(id, user.userId);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบรายการประจำ", 404);
    }
    return jsonSuccess(result);
  });

  // POST /api/v1/recurring-transactions
  gatewayRegistry.register("POST", "recurring-transactions", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const body = await parseBody<any>(ctx);
    const result = await RecurringTransactionService.create(user.userId, body);
    return jsonSuccess(result, 201);
  });

  // PUT /api/v1/recurring-transactions/:id
  gatewayRegistry.register("PUT", "recurring-transactions/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสรายการประจำไม่ถูกต้อง", 400);
    }

    const body = await parseBody<any>(ctx);
    const result = await RecurringTransactionService.update(id, user.userId, body);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบรายการประจำ", 404);
    }
    return jsonSuccess(result);
  });

  // PATCH /api/v1/recurring-transactions/:id/toggle
  gatewayRegistry.register("PATCH", "recurring-transactions/:id/toggle", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสรายการประจำไม่ถูกต้อง", 400);
    }

    const result = await RecurringTransactionService.toggleActive(id, user.userId);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบรายการประจำ", 404);
    }
    return jsonSuccess(result);
  });

  // DELETE /api/v1/recurring-transactions/:id
  gatewayRegistry.register("DELETE", "recurring-transactions/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสรายการประจำไม่ถูกต้อง", 400);
    }

    const deleted = await RecurringTransactionService.delete(id, user.userId);
    if (!deleted) {
      return jsonError("NOT_FOUND", "ไม่พบรายการประจำ", 404);
    }
    return new Response(null, { status: 204 });
  });
}
