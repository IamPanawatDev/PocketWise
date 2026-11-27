import { eq, and, isNull } from "drizzle-orm";
import { db } from "../../db";
import {
  userSettings,
  transactions,
  transferGroups,
  budgets,
  recurringTransactions,
  bankAccounts,
  creditCards,
  creditCardStatements,
  creditCardStatementItems,
  installmentPlans,
  userRefreshTokens,
  auditLogs,
} from "../../db/schema";
import type {
  UserSettingsResponse,
  UpdateUserSettingsRequest,
  DataResetResponse,
} from "@/types/settings.types";

export class UserSettingsService {
  /**
   * Get or create default user settings
   */
  public async getSettings(userId: number): Promise<UserSettingsResponse> {
    const [existing] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (existing) {
      return this.mapResponse(existing);
    }

    // Create default settings if not exists
    const [created] = await db
      .insert(userSettings)
      .values({
        userId,
        theme: "dark",
        currencyCode: "THB",
        locale: "th-TH",
        emailBudgetAlertsEnabled: true,
      })
      .returning();

    return this.mapResponse(created);
  }

  /**
   * Update user settings
   */
  public async updateSettings(
    userId: number,
    data: UpdateUserSettingsRequest,
  ): Promise<UserSettingsResponse> {
    // Ensure settings exist
    await this.getSettings(userId);

    const [updated] = await db
      .update(userSettings)
      .set({
        theme: data.theme,
        currencyCode: data.currencyCode,
        locale: data.locale,
        emailBudgetAlertsEnabled: data.emailBudgetAlertsEnabled,
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId))
      .returning();

    // Log audit action
    try {
      await db.insert(auditLogs).values({
        userId,
        action: "Update",
        entityType: "UserSettings",
        entityId: userId.toString(),
        detailsJson: JSON.stringify(data),
      });
    } catch (e) {
      console.warn("Failed to log audit for updateSettings:", e);
    }

    return this.mapResponse(updated);
  }

  /**
   * Reset all financial data for the given user
   */
  public async resetFinancialData(userId: number): Promise<DataResetResponse> {
    const resetAt = new Date();

    await db.transaction(async (tx) => {
      // 1. Delete transactions & groups
      await tx.delete(transactions).where(eq(transactions.userId, userId));
      await tx.delete(transferGroups).where(eq(transferGroups.userId, userId));

      // 2. Delete budgets & recurring
      await tx.delete(budgets).where(eq(budgets.userId, userId));
      await tx
        .delete(recurringTransactions)
        .where(eq(recurringTransactions.userId, userId));

      // 3. Delete accounts & cards
      await tx.delete(installmentPlans).where(eq(installmentPlans.userId, userId));
      await tx.delete(creditCards).where(eq(creditCards.userId, userId));
      await tx.delete(bankAccounts).where(eq(bankAccounts.userId, userId));

      // 4. Revoke user refresh tokens
      await tx
        .update(userRefreshTokens)
        .set({ revokedAt: resetAt, reasonRevoked: "ResetFinancialData" })
        .where(
          and(
            eq(userRefreshTokens.userId, userId),
            isNull(userRefreshTokens.revokedAt),
          ),
        );

      // 5. Audit Log
      await tx.insert(auditLogs).values({
        userId,
        action: "Delete",
        entityType: "UserData",
        entityId: userId.toString(),
        detailsJson: JSON.stringify({ action: "ResetFinancialData", resetAt }),
      });
    });

    return {
      resetAt: resetAt.toISOString(),
    };
  }

  private mapResponse(record: typeof userSettings.$inferSelect): UserSettingsResponse {
    return {
      theme: record.theme as "light" | "dark",
      currencyCode: record.currencyCode,
      locale: record.locale,
      emailBudgetAlertsEnabled: record.emailBudgetAlertsEnabled,
      isEmailServiceEnabled: true,
      updatedAt: record.updatedAt.toISOString(),
    };
  }
}

export const userSettingsService = new UserSettingsService();
