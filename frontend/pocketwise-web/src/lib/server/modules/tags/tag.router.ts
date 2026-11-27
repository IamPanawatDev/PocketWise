import { gatewayRegistry, GatewayContext } from "@/lib/server/gateway-registry";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { getAuthenticatedUser } from "@/lib/server/auth/current-user";
import { TagService } from "./tag.service";

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

export function registerTagRoutes(): void {
  // GET /api/v1/tags
  gatewayRegistry.register("GET", "tags", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const result = await TagService.getAll(user.userId);
    return jsonSuccess(result);
  });

  // GET /api/v1/tags/:id
  gatewayRegistry.register("GET", "tags/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสแท็กไม่ถูกต้อง", 400);
    }
    const result = await TagService.getById(id, user.userId);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบแท็ก", 404);
    }
    return jsonSuccess(result);
  });

  // POST /api/v1/tags
  gatewayRegistry.register("POST", "tags", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const body = await parseBody<any>(ctx);
    const result = await TagService.create(user.userId, body);
    return jsonSuccess(result, 201);
  });

  // PUT /api/v1/tags/reorder
  gatewayRegistry.register("PUT", "tags/reorder", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const body = await parseBody<any>(ctx);
    await TagService.reorder(user.userId, body);
    return jsonSuccess(null);
  });

  // PUT /api/v1/tags/:id
  gatewayRegistry.register("PUT", "tags/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสแท็กไม่ถูกต้อง", 400);
    }
    const body = await parseBody<any>(ctx);
    const result = await TagService.update(id, user.userId, body);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบแท็ก", 404);
    }
    return jsonSuccess(result);
  });

  // DELETE /api/v1/tags/:id
  gatewayRegistry.register("DELETE", "tags/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสแท็กไม่ถูกต้อง", 400);
    }
    const deleted = await TagService.delete(id, user.userId);
    if (!deleted) {
      return jsonError("NOT_FOUND", "ไม่พบแท็ก", 404);
    }
    return new Response(null, { status: 204 });
  });
}
