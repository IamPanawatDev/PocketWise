import { gatewayRegistry, GatewayContext } from "@/lib/server/gateway-registry";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { getAuthenticatedUser } from "@/lib/server/auth/current-user";
import { BankAccountService } from "./bank-account.service";

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

export function registerBankAccountRoutes(): void {
  // GET /api/v1/bank-accounts
  gatewayRegistry.register("GET", "bank-accounts", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const result = await BankAccountService.getAll(user.userId);
    return jsonSuccess(result);
  });

  // GET /api/v1/bank-accounts/:id
  gatewayRegistry.register("GET", "bank-accounts/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสบัญชีไม่ถูกต้อง", 400);
    }
    const result = await BankAccountService.getById(id, user.userId);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบบัญชี", 404);
    }
    return jsonSuccess(result);
  });

  // POST /api/v1/bank-accounts
  gatewayRegistry.register("POST", "bank-accounts", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const body = await parseBody<any>(ctx);
    const result = await BankAccountService.create(user.userId, body);
    return jsonSuccess(result, 201);
  });

  // PUT /api/v1/bank-accounts/:id
  gatewayRegistry.register("PUT", "bank-accounts/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสบัญชีไม่ถูกต้อง", 400);
    }
    const body = await parseBody<any>(ctx);
    const result = await BankAccountService.update(id, user.userId, body);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบบัญชี", 404);
    }
    return jsonSuccess(result);
  });

  // DELETE /api/v1/bank-accounts/:id
  gatewayRegistry.register("DELETE", "bank-accounts/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสบัญชีไม่ถูกต้อง", 400);
    }
    const deleted = await BankAccountService.delete(id, user.userId);
    if (!deleted) {
      return jsonError("NOT_FOUND", "ไม่พบบัญชี", 404);
    }
    return new Response(null, { status: 204 });
  });
}
