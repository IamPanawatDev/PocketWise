import crypto from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { serverConfig } from "../config";

export interface UserJwtClaims extends JWTPayload {
  sub: string;
  email: string;
  name: string;
  jti: string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"?: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string | string[];
  roles?: string[];
}

const { secretKey: rawSecret, issuer, audience, accessTokenExpMinutes, refreshTokenExpDays } =
  serverConfig.jwt;

const secretKey = new TextEncoder().encode(rawSecret);

/**
 * Generates JWT Access Token conforming to ASP.NET Core Identity claims format
 */
export async function generateAccessToken(
  user: { id: number; email: string; displayName: string },
  roles: string[] = [],
  expiresInMinutes: number = accessTokenExpMinutes,
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  const jti = crypto.randomUUID();

  const token = await new SignJWT({
    sub: user.id.toString(),
    email: user.email,
    name: user.displayName,
    jti,
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier":
      user.id.toString(),
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role":
      roles.length === 1 ? roles[0] : roles,
    roles,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey);

  return { token, expiresAt };
}

/**
 * Verifies JWT token and extracts user claims
 */
export async function verifyAccessToken(
  token: string,
): Promise<UserJwtClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer,
      audience,
    });
    return payload as UserJwtClaims;
  } catch {
    return null;
  }
}

/**
 * Hashes a refresh token with SHA-256 hex string lowercase (matches C# JwtTokenService.HashToken)
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex").toLowerCase();
}

/**
 * Generates a cryptographically random refresh token (64 random bytes Base64)
 */
export function generateRefreshToken(
  expiresInDays: number = refreshTokenExpDays,
): { token: string; hash: string; expiresAt: Date } {
  const randomBytes = crypto.randomBytes(64);
  const token = randomBytes.toString("base64");
  const hash = hashToken(token);
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

  return { token, hash, expiresAt };
}
