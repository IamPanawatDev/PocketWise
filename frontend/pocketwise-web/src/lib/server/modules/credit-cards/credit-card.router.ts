import { gatewayRegistry, GatewayContext } from "@/lib/server/gateway-registry";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { getAuthenticatedUser } from "@/lib/server/auth/current-user";
import { CreditCardService } from "./credit-card.service";

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

export function registerCreditCardRoutes(): void {
  // GET /api/v1/credit-cards
  gatewayRegistry.register("GET", "credit-cards", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const result = await CreditCardService.getAll(user.userId);
    return jsonSuccess(result);
  });

  // GET /api/v1/credit-cards/:id
  gatewayRegistry.register("GET", "credit-cards/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสบัตรเครดิตไม่ถูกต้อง", 400);
    }
    const result = await CreditCardService.getById(id, user.userId);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบบัตรเครดิต", 404);
    }
    return jsonSuccess(result);
  });

  // POST /api/v1/credit-cards
  gatewayRegistry.register("POST", "credit-cards", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const body = await parseBody<any>(ctx);
    const result = await CreditCardService.create(user.userId, body);
    return jsonSuccess(result, 201);
  });

  // PUT /api/v1/credit-cards/:id
  gatewayRegistry.register("PUT", "credit-cards/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสบัตรเครดิตไม่ถูกต้อง", 400);
    }
    const body = await parseBody<any>(ctx);
    const result = await CreditCardService.update(id, user.userId, body);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบบัตรเครดิต", 404);
    }
    return jsonSuccess(result);
  });

  // DELETE /api/v1/credit-cards/:id
  gatewayRegistry.register("DELETE", "credit-cards/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสบัตรเครดิตไม่ถูกต้อง", 400);
    }
    const deleted = await CreditCardService.delete(id, user.userId);
    if (!deleted) {
      return jsonError("NOT_FOUND", "ไม่พบบัตรเครดิต", 404);
    }
    return new Response(null, { status: 204 });
  });

  // GET /api/v1/credit-cards/:cardId/statements
  gatewayRegistry.register("GET", "credit-cards/:cardId/statements", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const cardId = Number(ctx.params?.cardId);
    if (!cardId || Number.isNaN(cardId)) {
      return jsonError("BAD_REQUEST", "รหัสบัตรเครดิตไม่ถูกต้อง", 400);
    }
    const result = await CreditCardService.getStatementsByCardId(user.userId, cardId);
    return jsonSuccess(result);
  });

  // GET /api/v1/credit-cards/statements/:statementId
  gatewayRegistry.register("GET", "credit-cards/statements/:statementId", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const statementId = Number(ctx.params?.statementId);
    if (!statementId || Number.isNaN(statementId)) {
      return jsonError("BAD_REQUEST", "รหัสใบแจ้งยอดไม่ถูกต้อง", 400);
    }
    const result = await CreditCardService.getStatementById(user.userId, statementId);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบใบแจ้งยอดที่ระบุ", 404);
    }
    return jsonSuccess(result);
  });

  // POST /api/v1/credit-cards/statements/:statementId/confirm-items
  gatewayRegistry.register("POST", "credit-cards/statements/:statementId/confirm-items", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const statementId = Number(ctx.params?.statementId);
    if (!statementId || Number.isNaN(statementId)) {
      return jsonError("BAD_REQUEST", "รหัสใบแจ้งยอดไม่ถูกต้อง", 400);
    }
    const body = await parseBody<any>(ctx);
    const result = await CreditCardService.confirmStatementItems(user.userId, statementId, body);
    return jsonSuccess(result);
  });

  // POST /api/v1/credit-cards/:cardId/statements/:statementId/confirm-items (alias)
  gatewayRegistry.register(
    "POST",
    "credit-cards/:cardId/statements/:statementId/confirm-items",
    async (ctx) => {
      const user = await getAuthenticatedUser(ctx);
      const statementId = Number(ctx.params?.statementId);
      if (!statementId || Number.isNaN(statementId)) {
        return jsonError("BAD_REQUEST", "รหัสใบแจ้งยอดไม่ถูกต้อง", 400);
      }
      const body = await parseBody<any>(ctx);
      const result = await CreditCardService.confirmStatementItems(user.userId, statementId, body);
      return jsonSuccess(result);
    }
  );
}
