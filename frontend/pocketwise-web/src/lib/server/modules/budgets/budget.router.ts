import { gatewayRegistry, GatewayContext } from "@/lib/server/gateway-registry";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { getAuthenticatedUser } from "@/lib/server/auth/current-user";
import { BudgetService } from "./budget.service";

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

export function registerBudgetRoutes(): void {
  // GET /api/v1/budgets
  gatewayRegistry.register("GET", "budgets", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const result = await BudgetService.getAll(user.userId);
    return jsonSuccess(result);
  });

  // GET /api/v1/budgets/tracking
  gatewayRegistry.register("GET", "budgets/tracking", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const result = await BudgetService.getTracking(user.userId);
    return jsonSuccess(result);
  });

  // GET /api/v1/budgets/:id
  gatewayRegistry.register("GET", "budgets/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสงบประมาณไม่ถูกต้อง", 400);
    }

    const result = await BudgetService.getById(id, user.userId);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบงบประมาณ", 404);
    }
    return jsonSuccess(result);
  });

  // POST /api/v1/budgets
  gatewayRegistry.register("POST", "budgets", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const body = await parseBody<any>(ctx);
    const result = await BudgetService.create(user.userId, body);
    return jsonSuccess(result, 201);
  });

  // PUT /api/v1/budgets/:id
  gatewayRegistry.register("PUT", "budgets/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสงบประมาณไม่ถูกต้อง", 400);
    }

    const body = await parseBody<any>(ctx);
    const result = await BudgetService.update(id, user.userId, body);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบงบประมาณ", 404);
    }
    return jsonSuccess(result);
  });

  // DELETE /api/v1/budgets/:id
  gatewayRegistry.register("DELETE", "budgets/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสงบประมาณไม่ถูกต้อง", 400);
    }

    const deleted = await BudgetService.delete(id, user.userId);
    if (!deleted) {
      return jsonError("NOT_FOUND", "ไม่พบงบประมาณ", 404);
    }
    return new Response(null, { status: 204 });
  });
}
