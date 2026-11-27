import { z } from "zod";
import { gatewayRegistry, type GatewayContext } from "../../gateway-registry";
import { authService } from "./auth.service";
import { jsonSuccess, jsonError } from "../../api-response";
import { setAuthCookiesFromData, clearAuthCookiesFrom } from "../../auth-endpoints";
import { verifyAccessToken } from "../../auth/jwt";
import { UnauthorizedError } from "../../api-error";

const loginSchema = z.object({
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
});

const registerSchema = z.object({
  displayName: z.string().min(1, "กรุณากรอกชื่อที่แสดง"),
  email: z.string().email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "ต้องระบุ Refresh Token"),
});

function getClientIp(ctx: GatewayContext): string | null {
  return (
    ctx.req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    ctx.req.headers.get("x-real-ip") ??
    null
  );
}

function getClientUserAgent(ctx: GatewayContext): string | null {
  return ctx.req.headers.get("user-agent") ?? null;
}

export function registerAuthRoutes(): void {
  // 1. POST auth/login
  gatewayRegistry.register("POST", "auth/login", async (ctx) => {
    let rawBody: unknown;
    try {
      rawBody = typeof ctx.payload.body === "string" ? JSON.parse(ctx.payload.body) : await ctx.req.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "รูปแบบ JSON ไม่ถูกต้อง", 400);
    }

    const { email, password } = loginSchema.parse(rawBody);
    const ip = getClientIp(ctx);
    const ua = getClientUserAgent(ctx);

    const result = await authService.login(email, password, ip, ua);

    const response = jsonSuccess({
      accessToken: result.accessToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt.toISOString(),
      refreshToken: result.refreshToken,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString(),
      user: result.user,
    });

    // Set auth cookies for web browser
    setAuthCookiesFromData(response, {
      accessToken: result.accessToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt.toISOString(),
      refreshToken: result.refreshToken,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString(),
    });

    return response;
  });

  // 2. POST auth/register
  gatewayRegistry.register("POST", "auth/register", async (ctx) => {
    let rawBody: unknown;
    try {
      rawBody = typeof ctx.payload.body === "string" ? JSON.parse(ctx.payload.body) : await ctx.req.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "รูปแบบ JSON ไม่ถูกต้อง", 400);
    }

    const { displayName, email, password } = registerSchema.parse(rawBody);
    const ip = getClientIp(ctx);
    const ua = getClientUserAgent(ctx);

    const result = await authService.register(displayName, email, password, ip, ua);

    const response = jsonSuccess(
      {
        accessToken: result.accessToken,
        accessTokenExpiresAt: result.accessTokenExpiresAt.toISOString(),
        refreshToken: result.refreshToken,
        refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString(),
        user: result.user,
      },
      201,
    );

    setAuthCookiesFromData(response, {
      accessToken: result.accessToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt.toISOString(),
      refreshToken: result.refreshToken,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString(),
    });

    return response;
  });

  // 3. POST auth/refresh
  gatewayRegistry.register("POST", "auth/refresh", async (ctx) => {
    let rawBody: unknown;
    try {
      rawBody = typeof ctx.payload.body === "string" ? JSON.parse(ctx.payload.body) : await ctx.req.json();
    } catch {
      return jsonError("VALIDATION_ERROR", "รูปแบบ JSON ไม่ถูกต้อง", 400);
    }

    const { refreshToken } = refreshSchema.parse(rawBody);
    const ip = getClientIp(ctx);
    const ua = getClientUserAgent(ctx);

    const result = await authService.refresh(refreshToken, ip, ua);

    const response = jsonSuccess({
      accessToken: result.accessToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt.toISOString(),
      refreshToken: result.refreshToken,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString(),
      user: result.user,
    });

    setAuthCookiesFromData(response, {
      accessToken: result.accessToken,
      accessTokenExpiresAt: result.accessTokenExpiresAt.toISOString(),
      refreshToken: result.refreshToken,
      refreshTokenExpiresAt: result.refreshTokenExpiresAt.toISOString(),
    });

    return response;
  });

  // 4. POST auth/logout
  gatewayRegistry.register("POST", "auth/logout", async (ctx) => {
    let userId: number | null = null;
    if (ctx.token) {
      const claims = await verifyAccessToken(ctx.token);
      if (claims?.sub) {
        userId = Number(claims.sub);
      }
    }

    await authService.logout(userId);

    const response = jsonSuccess(null);
    clearAuthCookiesFrom(response);
    return response;
  });

  // 5. GET auth/me
  gatewayRegistry.register("GET", "auth/me", async (ctx) => {
    let token = ctx.token;
    if (!token) {
      const authHeader = ctx.req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      throw new UnauthorizedError("กรุณาเข้าสู่ระบบ");
    }

    const claims = await verifyAccessToken(token);
    if (!claims || !claims.sub) {
      throw new UnauthorizedError("โทเค็นไม่ถูกต้องหรือหมดอายุ");
    }

    const userId = Number(claims.sub);
    const profile = await authService.getProfile(userId);

    return jsonSuccess(profile);
  });
}
