import { gatewayRegistry, GatewayContext } from "@/lib/server/gateway-registry";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { getAuthenticatedUser } from "@/lib/server/auth/current-user";
import { TransactionService, TransactionFilter } from "./transaction.service";

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

export function registerTransactionRoutes(): void {
  // GET /api/v1/transactions
  gatewayRegistry.register("GET", "transactions", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const url = new URL(ctx.req.url);
    const searchParams = url.searchParams;

    const categoryId = searchParams.has("categoryId")
      ? Number(searchParams.get("categoryId"))
      : undefined;
    const tagId = searchParams.has("tagId")
      ? Number(searchParams.get("tagId"))
      : undefined;
    const bankAccountId = searchParams.has("bankAccountId")
      ? Number(searchParams.get("bankAccountId"))
      : undefined;
    const creditCardId = searchParams.has("creditCardId")
      ? Number(searchParams.get("creditCardId"))
      : undefined;
    const sourceType = searchParams.get("sourceType") || undefined;
    const type = searchParams.get("type") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;
    const q = searchParams.get("q") || undefined;

    const page = Number(searchParams.get("page")) || 1;
    const pageSize = Number(searchParams.get("pageSize")) || 20;
    const sortBy = searchParams.get("sortBy") || "transactionDate";
    const sortDescParam = searchParams.get("sortDesc");
    const sortDesc = sortDescParam === null ? true : sortDescParam.toLowerCase() !== "false";

    const filter: TransactionFilter = {
      categoryId,
      tagId,
      bankAccountId,
      creditCardId,
      sourceType,
      type,
      fromDate,
      toDate,
      q,
    };

    const result = await TransactionService.getPaged(
      user.userId,
      filter,
      page,
      pageSize,
      sortBy,
      sortDesc
    );

    return jsonSuccess(result);
  });

  // GET /api/v1/transactions/:id
  gatewayRegistry.register("GET", "transactions/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสรายการไม่ถูกต้อง", 400);
    }

    const result = await TransactionService.getById(id, user.userId);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบรายการ", 404);
    }
    return jsonSuccess(result);
  });

  // POST /api/v1/transactions
  gatewayRegistry.register("POST", "transactions", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const body = await parseBody<any>(ctx);
    const result = await TransactionService.create(user.userId, body);
    return jsonSuccess(result, 201);
  });

  // PUT /api/v1/transactions/:id
  gatewayRegistry.register("PUT", "transactions/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสรายการไม่ถูกต้อง", 400);
    }

    const body = await parseBody<any>(ctx);
    const result = await TransactionService.update(id, user.userId, body);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบรายการ", 404);
    }
    return jsonSuccess(result);
  });

  // DELETE /api/v1/transactions/:id
  gatewayRegistry.register("DELETE", "transactions/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสรายการไม่ถูกต้อง", 400);
    }

    const deleted = await TransactionService.delete(id, user.userId);
    if (!deleted) {
      return jsonError("NOT_FOUND", "ไม่พบรายการ", 404);
    }
    return new Response(null, { status: 204 });
  });

  // POST /api/v1/transactions/bulk-delete
  gatewayRegistry.register("POST", "transactions/bulk-delete", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const body = await parseBody<{ transactionIds?: number[] }>(ctx);
    const count = await TransactionService.bulkDelete(user.userId, body.transactionIds || []);
    return jsonSuccess(count);
  });
}
