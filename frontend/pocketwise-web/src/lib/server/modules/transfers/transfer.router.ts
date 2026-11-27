import { gatewayRegistry, GatewayContext } from "@/lib/server/gateway-registry";
import { jsonSuccess, jsonError } from "@/lib/server/api-response";
import { getAuthenticatedUser } from "@/lib/server/auth/current-user";
import { TransferService } from "./transfer.service";

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

export function registerTransferRoutes(): void {
  // GET /api/v1/transfers
  gatewayRegistry.register("GET", "transfers", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const result = await TransferService.getAll(user.userId);
    return jsonSuccess(result);
  });

  // GET /api/v1/transfers/:id
  gatewayRegistry.register("GET", "transfers/:id", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const id = Number(ctx.params?.id);
    if (!id || Number.isNaN(id)) {
      return jsonError("BAD_REQUEST", "รหัสรายการโอนไม่ถูกต้อง", 400);
    }

    const result = await TransferService.getById(id, user.userId);
    if (!result) {
      return jsonError("NOT_FOUND", "ไม่พบรายการโอน", 404);
    }
    return jsonSuccess(result);
  });

  // POST /api/v1/transfers
  gatewayRegistry.register("POST", "transfers", async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const body = await parseBody<any>(ctx);
    const result = await TransferService.create(user.userId, body);
    return jsonSuccess(result, 201);
  });
}
