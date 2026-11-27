import { z } from "zod";
import { gatewayRegistry } from "../../gateway-registry";
import { userSettingsService } from "./user-settings.service";
import { getAuthenticatedUser } from "../../auth/current-user";
import { jsonSuccess, jsonError } from "../../api-response";
import { clearAuthCookiesFrom } from "../../auth-endpoints";

const updateSettingsSchema = z.object({
  theme: z.enum(["light", "dark"]),
  currencyCode: z.string().min(1).max(10),
  locale: z.string().min(1).max(20),
  emailBudgetAlertsEnabled: z.boolean(),
});

export function registerUserSettingsRoutes(): void {
  // 1. GET settings (and alias user-settings)
  const handleGetSettings = async (ctx: any) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const settings = await userSettingsService.getSettings(userId);
    return jsonSuccess(settings);
  };

  gatewayRegistry.register("GET", "settings", handleGetSettings);
  gatewayRegistry.register("GET", "user-settings", handleGetSettings);
  gatewayRegistry.register("GET", "user/settings", handleGetSettings);
  gatewayRegistry.register("GET", "users/settings", handleGetSettings);

  // 2. PUT settings (and alias user-settings)
  const handleUpdateSettings = async (ctx: any) => {
    const { userId } = await getAuthenticatedUser(ctx);

    let rawBody: unknown;
    try {
      rawBody =
        typeof ctx.payload.body === "string"
          ? JSON.parse(ctx.payload.body)
          : await ctx.req.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "รูปแบบ JSON ไม่ถูกต้อง", 400);
    }

    const validated = updateSettingsSchema.parse(rawBody);
    const result = await userSettingsService.updateSettings(userId, validated);
    return jsonSuccess(result);
  };

  gatewayRegistry.register("PUT", "settings", handleUpdateSettings);
  gatewayRegistry.register("PUT", "user-settings", handleUpdateSettings);
  gatewayRegistry.register("PUT", "user/settings", handleUpdateSettings);
  gatewayRegistry.register("PUT", "users/settings", handleUpdateSettings);

  // 3. POST users/me/data-reset
  gatewayRegistry.register("POST", "users/me/data-reset", async (ctx) => {
    const { userId } = await getAuthenticatedUser(ctx);
    const result = await userSettingsService.resetFinancialData(userId);
    const response = jsonSuccess(result);
    // Revoke & clear cookies on data reset
    clearAuthCookiesFrom(response);
    return response;
  });
}
