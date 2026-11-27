import { gatewayRegistry, GatewayContext } from "@/lib/server/gateway-registry";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { getAuthenticatedUser } from "@/lib/server/auth/current-user";
import { CategoryService } from "./category.service";

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

export function registerCategoryRoutes(): void {
  // ==========================================
  // CATEGORIES
  // ==========================================

  // GET /api/v1/categories
  gatewayRegistry.register("GET", "categories", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const result = await CategoryService.getAll(user.userId);
    return jsonSuccess(result);
  });

  // GET /api/v1/categories/:id
  gatewayRegistry.register("GET", "categories/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสหมวดหมู่ไม่ถูกต้อง", 400);
    }
    const result = await CategoryService.getById(id, user.userId);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบหมวดหมู่", 404);
    }
    return jsonSuccess(result);
  });

  // POST /api/v1/categories
  gatewayRegistry.register("POST", "categories", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const body = await parseBody<any>(ctx);
    const result = await CategoryService.create(user.userId, body);
    return jsonSuccess(result, 201);
  });

  // PUT /api/v1/categories/reorder
  gatewayRegistry.register("PUT", "categories/reorder", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const body = await parseBody<any>(ctx);
    await CategoryService.reorder(user.userId, body);
    return jsonSuccess(null);
  });

  // PUT /api/v1/categories/:id
  gatewayRegistry.register("PUT", "categories/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสหมวดหมู่ไม่ถูกต้อง", 400);
    }
    const body = await parseBody<any>(ctx);
    const result = await CategoryService.update(id, user.userId, body);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบหมวดหมู่", 404);
    }
    return jsonSuccess(result);
  });

  // DELETE /api/v1/categories/:id
  gatewayRegistry.register("DELETE", "categories/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสหมวดหมู่ไม่ถูกต้อง", 400);
    }
    const deleted = await CategoryService.delete(id, user.userId);
    if (!deleted) {
      return jsonError("NOT_FOUND", "ไม่พบหมวดหมู่", 404);
    }
    return jsonSuccess(null);
  });

  // ==========================================
  // CATEGORY RULES
  // ==========================================

  // GET /api/v1/category-rules
  gatewayRegistry.register("GET", "category-rules", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const result = await CategoryService.getAllRules(user.userId);
    return jsonSuccess(result);
  });

  // GET /api/v1/category-rules/suggest
  gatewayRegistry.register("GET", "category-rules/suggest", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const description = ctx.searchParams.get("description") || "";
    const result = await CategoryService.suggestCategory(user.userId, description);
    return jsonSuccess(result);
  });

  // GET /api/v1/category-rules/:id
  gatewayRegistry.register("GET", "category-rules/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสกฎจัดหมวดหมู่ไม่ถูกต้อง", 400);
    }
    const result = await CategoryService.getRuleById(id, user.userId);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบกฎจัดหมวดหมู่", 404);
    }
    return jsonSuccess(result);
  });

  // POST /api/v1/category-rules
  gatewayRegistry.register("POST", "category-rules", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const body = await parseBody<any>(ctx);
    const result = await CategoryService.createRule(user.userId, body);
    return jsonSuccess(result, 201);
  });

  // PUT /api/v1/category-rules/:id
  gatewayRegistry.register("PUT", "category-rules/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสกฎจัดหมวดหมู่ไม่ถูกต้อง", 400);
    }
    const body = await parseBody<any>(ctx);
    const result = await CategoryService.updateRule(id, user.userId, body);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบกฎจัดหมวดหมู่", 404);
    }
    return jsonSuccess(result);
  });

  // DELETE /api/v1/category-rules/:id
  gatewayRegistry.register("DELETE", "category-rules/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสกฎจัดหมวดหมู่ไม่ถูกต้อง", 400);
    }
    const deleted = await CategoryService.deleteRule(id, user.userId);
    if (!deleted) {
      return jsonError("NOT_FOUND", "ไม่พบกฎจัดหมวดหมู่", 404);
    }
    return new Response(null, { status: 204 });
  });
}
