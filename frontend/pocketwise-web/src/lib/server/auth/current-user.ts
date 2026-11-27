import type { GatewayContext } from "../gateway-registry";
import { verifyAccessToken, type UserJwtClaims } from "./jwt";
import { UnauthorizedError, ForbiddenError } from "../api-error";

export async function getAuthenticatedUser(
  ctx: GatewayContext,
): Promise<{ userId: number; email: string; name: string; roles: string[] }> {
  let token = ctx.token;
  if (!token) {
    const authHeader = ctx.req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    throw new UnauthorizedError("กรุณาเข้าสู่ระบบก่อนดำเนินการ");
  }

  const claims: UserJwtClaims | null = await verifyAccessToken(token);
  if (!claims?.sub) {
    throw new UnauthorizedError("โทเค็นไม่ถูกต้องหรือหมดอายุ");
  }

  const userId = Number(claims.sub);
  if (isNaN(userId) || userId <= 0) {
    throw new UnauthorizedError("ข้อมูลผู้ใช้ในโทเค็นไม่ถูกต้อง");
  }

  const roleClaim = claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
  const roles: string[] = Array.isArray(roleClaim)
    ? roleClaim
    : typeof roleClaim === "string"
      ? [roleClaim]
      : claims.roles ?? [];

  return {
    userId,
    email: claims.email ?? "",
    name: claims.name ?? "",
    roles,
  };
}

export async function requireRoles(
  ctx: GatewayContext,
  allowedRoles: string[],
): Promise<{ userId: number; email: string; name: string; roles: string[] }> {
  const user = await getAuthenticatedUser(ctx);
  const normalizedAllowed = allowedRoles.map((a) => a.toLowerCase());
  const hasRole = user.roles.some((r) => normalizedAllowed.includes(r.toLowerCase()));
  if (!hasRole) {
    throw new ForbiddenError("คุณไม่มีสิทธิ์ในการเข้าถึงข้อมูลส่วนนี้");
  }
  return user;
}
