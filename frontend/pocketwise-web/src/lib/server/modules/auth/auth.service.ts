import { eq, sql, and, isNull, or, isNotNull, lte } from "drizzle-orm";
import { db } from "../../db";
import {
  users,
  roles,
  userRoles,
  userRefreshTokens,
  userSettings,
  auditLogs,
  securityEvents,
} from "../../db/schema";
import { verifyPassword, hashPassword } from "../../auth/password";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from "../../auth/jwt";
import {
  UnauthorizedError,
  ConflictError,
  AccountSuspendedError,
  ValidationErrorAppError,
} from "../../api-error";

export interface AuthResult {
  accessToken: string;
  accessTokenExpiresAt: Date;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: {
    id: number;
    email: string;
    displayName: string;
    isEmailVerified: boolean;
    roles: string[];
  };
}

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  public async login(
    email: string,
    password: string,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<AuthResult> {
    const normalizedEmail = email.trim().toUpperCase();

    const [user] = await db
      .select()
      .from(users)
      .where(sql`UPPER(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    if (!user || !user.isActive) {
      // Record failed security event
      await this.recordSecurityEvent(
        "LOGIN_FAILED",
        user?.id ?? null,
        false,
        ipAddress,
        userAgent,
        { reason: "User not found or inactive", email },
      );
      throw new UnauthorizedError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    if (user.isSuspended) {
      await this.recordSecurityEvent(
        "LOGIN_FAILED",
        user.id,
        false,
        ipAddress,
        userAgent,
        { reason: "Account suspended", userSuspensionReason: user.suspensionReason },
      );
      throw new AccountSuspendedError(
        user.suspensionReason ?? "บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
      );
    }

    if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
      await this.recordSecurityEvent(
        "LOGIN_FAILED",
        user.id,
        false,
        ipAddress,
        userAgent,
        { reason: "Invalid password" },
      );
      throw new UnauthorizedError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }

    // Retrieve user roles
    const userRoleList = await this.getUserRoles(user.id);

    // Generate tokens
    const { token: accessToken, expiresAt: accessTokenExpiresAt } =
      await generateAccessToken(
        { id: user.id, email: user.email ?? "", displayName: user.displayName },
        userRoleList,
      );

    const { token: refreshToken, hash: refreshHash, expiresAt: refreshTokenExpiresAt } =
      generateRefreshToken();

    // Save refresh token in DB
    await db.insert(userRefreshTokens).values({
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: refreshTokenExpiresAt,
      userAgent: userAgent ? userAgent.slice(0, 500) : null,
      createdByIp: ipAddress ? ipAddress.slice(0, 50) : null,
    });

    // Record success
    await this.recordSecurityEvent(
      "LOGIN_SUCCEEDED",
      user.id,
      true,
      ipAddress,
      userAgent,
      { action: "Password login" },
    );

    return {
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      user: {
        id: user.id,
        email: user.email ?? "",
        displayName: user.displayName,
        isEmailVerified: user.isEmailVerified,
        roles: userRoleList,
      },
    };
  }

  /**
   * Register a new user
   */
  public async register(
    displayName: string,
    email: string,
    password: string,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<AuthResult> {
    const normalizedEmail = email.trim().toUpperCase();

    // Check duplicate
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`UPPER(${users.email}) = ${normalizedEmail}`)
      .limit(1);

    if (existing) {
      throw new ConflictError("อีเมลนี้ถูกใช้งานแล้ว");
    }

    const hashedPassword = hashPassword(password);
    const securityStamp = crypto.randomUUID();
    const concurrencyStamp = crypto.randomUUID();

    // Insert user inside transaction
    return await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          displayName: displayName.trim(),
          userName: email.trim(),
          normalizedUserName: normalizedEmail,
          email: email.trim(),
          normalizedEmail,
          emailConfirmed: false,
          passwordHash: hashedPassword,
          securityStamp,
          concurrencyStamp,
          phoneNumberConfirmed: false,
          twoFactorEnabled: false,
          lockoutEnabled: true,
          accessFailedCount: 0,
          isActive: true,
          isEmailVerified: false,
          isSuspended: false,
        })
        .returning();

      // Create default settings
      await tx.insert(userSettings).values({
        userId: newUser.id,
      });

      // Find or assign 'Member' role
      const [memberRole] = await tx
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, "Member"))
        .limit(1);

      if (memberRole) {
        await tx.insert(userRoles).values({
          userId: newUser.id,
          roleId: memberRole.id,
        });
      }

      const userRoleList = memberRole ? ["Member"] : [];

      // Generate tokens
      const { token: accessToken, expiresAt: accessTokenExpiresAt } =
        await generateAccessToken(
          { id: newUser.id, email: newUser.email ?? "", displayName: newUser.displayName },
          userRoleList,
        );

      const { token: refreshToken, hash: refreshHash, expiresAt: refreshTokenExpiresAt } =
        generateRefreshToken();

      await tx.insert(userRefreshTokens).values({
        userId: newUser.id,
        tokenHash: refreshHash,
        expiresAt: refreshTokenExpiresAt,
        userAgent: userAgent ? userAgent.slice(0, 500) : null,
        createdByIp: ipAddress ? ipAddress.slice(0, 50) : null,
      });

      return {
        accessToken,
        accessTokenExpiresAt,
        refreshToken,
        refreshTokenExpiresAt,
        user: {
          id: newUser.id,
          email: newUser.email ?? "",
          displayName: newUser.displayName,
          isEmailVerified: newUser.isEmailVerified,
          roles: userRoleList,
        },
      };
    });
  }

  /**
   * Refresh access token using valid refresh token
   */
  public async refresh(
    refreshTokenStr: string,
    ipAddress?: string | null,
    userAgent?: string | null,
  ): Promise<AuthResult> {
    const tokenHash = hashToken(refreshTokenStr);

    const [storedToken] = await db
      .select()
      .from(userRefreshTokens)
      .where(
        and(
          eq(userRefreshTokens.tokenHash, tokenHash),
          isNull(userRefreshTokens.revokedAt),
        ),
      )
      .limit(1);

    if (!storedToken || storedToken.expiresAt <= new Date()) {
      throw new UnauthorizedError("Refresh token ไม่ถูกต้องหรือหมดอายุ");
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, storedToken.userId))
      .limit(1);

    if (!user || !user.isActive || user.isSuspended) {
      throw new UnauthorizedError("บัญชีนี้ไม่สามารถใช้งานได้");
    }

    const userRoleList = await this.getUserRoles(user.id);

    const { token: accessToken, expiresAt: accessTokenExpiresAt } =
      await generateAccessToken(
        { id: user.id, email: user.email ?? "", displayName: user.displayName },
        userRoleList,
      );

    const { token: newRefreshToken, hash: newRefreshHash, expiresAt: refreshTokenExpiresAt } =
      generateRefreshToken();

    // Mark previous token as replaced
    await db
      .update(userRefreshTokens)
      .set({
        revokedAt: new Date(),
        revokedByIp: ipAddress ? ipAddress.slice(0, 50) : null,
        replacedByTokenHash: newRefreshHash,
        reasonRevoked: "ReplacedByNewToken",
      })
      .where(eq(userRefreshTokens.refreshTokenId, storedToken.refreshTokenId));

    await db.insert(userRefreshTokens).values({
      userId: user.id,
      tokenHash: newRefreshHash,
      expiresAt: refreshTokenExpiresAt,
      userAgent: userAgent ? userAgent.slice(0, 500) : null,
      createdByIp: ipAddress ? ipAddress.slice(0, 50) : null,
    });

    return {
      accessToken,
      accessTokenExpiresAt,
      refreshToken: newRefreshToken,
      refreshTokenExpiresAt,
      user: {
        id: user.id,
        email: user.email ?? "",
        displayName: user.displayName,
        isEmailVerified: user.isEmailVerified,
        roles: userRoleList,
      },
    };
  }

  /**
   * Get user profile by userId
   */
  public async getProfile(userId: number) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new UnauthorizedError("ไม่พบข้อมูลผู้ใช้");
    }

    const roleList = await this.getUserRoles(user.id);

    return {
      id: user.id,
      email: user.email ?? "",
      displayName: user.displayName,
      birthDate: user.birthDate,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      roles: roleList,
    };
  }

  /**
   * Revoke refresh token upon logout
   */
  public async logout(userId?: number | null, refreshTokenStr?: string | null): Promise<void> {
    const now = new Date();
    if (refreshTokenStr) {
      const tokenHash = hashToken(refreshTokenStr);
      await db
        .update(userRefreshTokens)
        .set({ revokedAt: now, reasonRevoked: "Logout" })
        .where(eq(userRefreshTokens.tokenHash, tokenHash));
    } else if (userId) {
      await db
        .update(userRefreshTokens)
        .set({ revokedAt: now, reasonRevoked: "Logout" })
        .where(
          and(
            eq(userRefreshTokens.userId, userId),
            isNull(userRefreshTokens.revokedAt),
          ),
        );
    }
  }

  /**
   * Purge expired or revoked refresh tokens (called by cleanup cron)
   */
  public async purgeExpiredRefreshTokens(nowUtc?: Date): Promise<number> {
    const now = nowUtc || new Date();
    const deleted = await db
      .delete(userRefreshTokens)
      .where(
        or(
          lte(userRefreshTokens.expiresAt, now),
          isNotNull(userRefreshTokens.revokedAt)
        )
      )
      .returning({ id: userRefreshTokens.refreshTokenId });

    return deleted.length;
  }

  private async getUserRoles(userId: number): Promise<string[]> {
    const userRoleRecords = await db
      .select({ roleName: roles.name })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    return userRoleRecords
      .map((r) => r.roleName)
      .filter((name): name is string => Boolean(name));
  }

  private async recordSecurityEvent(
    eventType: string,
    userId: number | null,
    succeeded: boolean,
    ipAddress?: string | null,
    userAgent?: string | null,
    details?: Record<string, unknown>,
  ): Promise<void> {
    try {
      await db.insert(securityEvents).values({
        targetUserId: userId,
        actorUserId: userId,
        eventType,
        succeeded,
        detailsJson: details ? JSON.stringify(details) : null,
        ipAddress: ipAddress ? ipAddress.slice(0, 50) : null,
        userAgent: userAgent ? userAgent.slice(0, 255) : null,
      });
    } catch (e) {
      console.warn("Failed to record security event:", e);
    }
  }
}

export const authService = new AuthService();
