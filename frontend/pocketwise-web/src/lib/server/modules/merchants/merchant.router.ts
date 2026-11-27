import { gatewayRegistry, GatewayContext } from "@/lib/server/gateway-registry";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { getAuthenticatedUser } from "@/lib/server/auth/current-user";
import { MerchantService } from "./merchant.service";

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

export function registerMerchantRoutes(): void {
  // GET /api/v1/merchants
  gatewayRegistry.register("GET", "merchants", async (ctx) => {
    await getAuthenticatedUser(ctx);
    const result = await MerchantService.getAll();
    return jsonSuccess(result);
  });

  // GET /api/v1/merchants/:id
  gatewayRegistry.register("GET", "merchants/:id", async (ctx) => {
    await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสร้านค้าไม่ถูกต้อง", 400);
    }
    const result = await MerchantService.getById(id);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบร้านค้า", 404);
    }
    return jsonSuccess(result);
  });

  // POST /api/v1/merchants
  gatewayRegistry.register("POST", "merchants", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const body = await parseBody<any>(ctx);
    const result = await MerchantService.create(user.userId, body);
    return jsonSuccess(result, 201);
  });

  // PUT /api/v1/merchants/:id
  gatewayRegistry.register("PUT", "merchants/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสร้านค้าไม่ถูกต้อง", 400);
    }
    const body = await parseBody<any>(ctx);
    const result = await MerchantService.update(id, user.userId, body);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบร้านค้า", 404);
    }
    return jsonSuccess(result);
  });

  // DELETE /api/v1/merchants/:id
  gatewayRegistry.register("DELETE", "merchants/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสร้านค้าไม่ถูกต้อง", 400);
    }
    const deleted = await MerchantService.delete(id, user.userId);
    if (!deleted) {
      return jsonError("NOT_FOUND", "ไม่พบร้านค้า", 404);
    }
    return new Response(null, { status: 204 });
  });
}
