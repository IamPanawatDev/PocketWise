import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  bankAccounts,
  transactions,
  transferGroups,
} from "@/lib/server/db/schema";
import {
  ConflictError,
  ValidationErrorAppError,
} from "@/lib/server/api-error";
import { logAudit } from "@/lib/server/audit";
import { normalizeBankCode } from "@/lib/server/thai-bank-helper";

export type AccountType = "cash" | "bank" | "wallet" | "other";

export interface BankAccountResponse {
  bankAccountId: number;
  bankCode: string | null;
  bankName: string;
  accountName: string;
  accountNumberMasked: string | null;
  accountType: AccountType;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
}

export interface CreateBankAccountRequest {
  bankCode?: string | null;
  bankName: string;
  accountName: string;
  accountNumberMasked?: string | null;
  accountType: AccountType;
}

export interface UpdateBankAccountRequest extends CreateBankAccountRequest {
  isActive: boolean;
}

function toDbAccountType(type: string): string {
  const lower = (type || "").toLowerCase().trim();
  if (lower === "cash") return "Cash";
  if (lower === "wallet") return "Wallet";
  if (lower === "other") return "Other";
  return "Bank";
}

function toResponseAccountType(type: string): AccountType {
  const lower = (type || "").toLowerCase().trim();
  if (lower === "cash") return "cash";
  if (lower === "wallet") return "wallet";
  if (lower === "other") return "other";
  return "bank";
}

export class BankAccountService {
  /**
   * Calculates balances for all user's bank accounts based on transactions and transfers.
   */
  private static async getBalances(userId: number): Promise<Map<number, number>> {
    const txs = await db
      .select({
        bankAccountId: transactions.bankAccountId,
        transactionType: transactions.transactionType,
        amount: transactions.amount,
        transferGroupId: transactions.transferGroupId,
        toBankAccountId: transferGroups.toBankAccountId,
        fromBankAccountId: transferGroups.fromBankAccountId,
      })
      .from(transactions)
      .leftJoin(
        transferGroups,
        eq(transactions.transferGroupId, transferGroups.transferGroupId)
      )
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.isDeleted, false),
          sql`${transactions.bankAccountId} IS NOT NULL`
        )
      );

    const balances = new Map<number, number>();

    for (const t of txs) {
      if (!t.bankAccountId) continue;
      const accId = t.bankAccountId;
      const amt = Number(t.amount) || 0;
      const current = balances.get(accId) ?? 0;

      const type = (t.transactionType || "").toLowerCase();
      if (type === "income") {
        balances.set(accId, current + amt);
      } else if (type === "expense") {
        balances.set(accId, current - amt);
      } else if (type === "transfer") {
        if (t.toBankAccountId === accId) {
          balances.set(accId, current + amt);
        } else if (t.fromBankAccountId === accId) {
          balances.set(accId, current - amt);
        }
      }
    }

    return balances;
  }

  static async getAll(userId: number): Promise<BankAccountResponse[]> {
    const list = await db
      .select()
      .from(bankAccounts)
      .where(
        and(eq(bankAccounts.userId, userId), eq(bankAccounts.isDeleted, false))
      )
      .orderBy(asc(bankAccounts.accountName));

    const balances = await this.getBalances(userId);

    return list.map((a) => ({
      bankAccountId: a.bankAccountId,
      bankCode: a.bankCode,
      bankName: a.bankName,
      accountName: a.accountName,
      accountNumberMasked: a.accountNumberMasked,
      accountType: toResponseAccountType(a.accountType),
      currentBalance: balances.get(a.bankAccountId) ?? 0,
      isActive: a.isActive,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  static async getById(
    id: number,
    userId: number
  ): Promise<BankAccountResponse | null> {
    const [account] = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.bankAccountId, id),
          eq(bankAccounts.userId, userId),
          eq(bankAccounts.isDeleted, false)
        )
      )
      .limit(1);

    if (!account) return null;

    const balances = await this.getBalances(userId);

    return {
      bankAccountId: account.bankAccountId,
      bankCode: account.bankCode,
      bankName: account.bankName,
      accountName: account.accountName,
      accountNumberMasked: account.accountNumberMasked,
      accountType: toResponseAccountType(account.accountType),
      currentBalance: balances.get(account.bankAccountId) ?? 0,
      isActive: account.isActive,
      createdAt: account.createdAt.toISOString(),
    };
  }

  static async create(
    userId: number,
    request: CreateBankAccountRequest
  ): Promise<BankAccountResponse> {
    const trimmedAccountName = (request.accountName || "").trim();
    const trimmedBankName = (request.bankName || "").trim();

    if (!trimmedAccountName || !trimmedBankName) {
      throw new ValidationErrorAppError("กรุณากรอกข้อมูลบัญชีให้ครบถ้วน", [
        ...(!trimmedAccountName
          ? [{ field: "accountName", message: "ชื่อบัญชีต้องไม่ว่างเปล่า" }]
          : []),
        ...(!trimmedBankName
          ? [{ field: "bankName", message: "ชื่อธนาคารต้องไม่ว่างเปล่า" }]
          : []),
      ]);
    }

    const resolvedBankCode =
      normalizeBankCode(request.bankCode) ??
      normalizeBankCode(trimmedBankName) ??
      request.bankCode?.trim().toUpperCase() ??
      null;

    const [created] = await db
      .insert(bankAccounts)
      .values({
        userId,
        bankCode: resolvedBankCode,
        bankName: trimmedBankName,
        accountName: trimmedAccountName,
        accountNumberMasked: request.accountNumberMasked?.trim() ?? null,
        accountType: toDbAccountType(request.accountType),
        isActive: true,
        isDeleted: false,
        createdAt: new Date(),
      })
      .returning();

    await logAudit(userId, "Create", "BankAccounts", created.bankAccountId.toString(), {
      bankCode: created.bankCode,
      bankName: created.bankName,
      accountName: created.accountName,
      accountNumberMasked: created.accountNumberMasked,
      accountType: created.accountType,
    });

    return {
      bankAccountId: created.bankAccountId,
      bankCode: created.bankCode,
      bankName: created.bankName,
      accountName: created.accountName,
      accountNumberMasked: created.accountNumberMasked,
      accountType: toResponseAccountType(created.accountType),
      currentBalance: 0,
      isActive: created.isActive,
      createdAt: created.createdAt.toISOString(),
    };
  }

  static async update(
    id: number,
    userId: number,
    request: UpdateBankAccountRequest
  ): Promise<BankAccountResponse | null> {
    const trimmedAccountName = (request.accountName || "").trim();
    const trimmedBankName = (request.bankName || "").trim();

    if (!trimmedAccountName || !trimmedBankName) {
      throw new ValidationErrorAppError("กรุณากรอกข้อมูลบัญชีให้ครบถ้วน", [
        ...(!trimmedAccountName
          ? [{ field: "accountName", message: "ชื่อบัญชีต้องไม่ว่างเปล่า" }]
          : []),
        ...(!trimmedBankName
          ? [{ field: "bankName", message: "ชื่อธนาคารต้องไม่ว่างเปล่า" }]
          : []),
      ]);
    }

    const [existing] = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.bankAccountId, id),
          eq(bankAccounts.userId, userId),
          eq(bankAccounts.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) return null;

    const resolvedBankCode =
      normalizeBankCode(request.bankCode) ??
      normalizeBankCode(trimmedBankName) ??
      request.bankCode?.trim().toUpperCase() ??
      null;

    const beforeState = {
      bankCode: existing.bankCode,
      bankName: existing.bankName,
      accountName: existing.accountName,
      accountNumberMasked: existing.accountNumberMasked,
      accountType: existing.accountType,
      isActive: existing.isActive,
    };

    const [updated] = await db
      .update(bankAccounts)
      .set({
        bankCode: resolvedBankCode,
        bankName: trimmedBankName,
        accountName: trimmedAccountName,
        accountNumberMasked: request.accountNumberMasked?.trim() ?? null,
        accountType: toDbAccountType(request.accountType),
        isActive: request.isActive ?? existing.isActive,
      })
      .where(eq(bankAccounts.bankAccountId, id))
      .returning();

    await logAudit(userId, "Update", "BankAccounts", id.toString(), {
      before: beforeState,
      after: {
        bankCode: updated.bankCode,
        bankName: updated.bankName,
        accountName: updated.accountName,
        accountNumberMasked: updated.accountNumberMasked,
        accountType: updated.accountType,
        isActive: updated.isActive,
      },
    });

    const balances = await this.getBalances(userId);

    return {
      bankAccountId: updated.bankAccountId,
      bankCode: updated.bankCode,
      bankName: updated.bankName,
      accountName: updated.accountName,
      accountNumberMasked: updated.accountNumberMasked,
      accountType: toResponseAccountType(updated.accountType),
      currentBalance: balances.get(updated.bankAccountId) ?? 0,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  static async delete(id: number, userId: number): Promise<boolean> {
    const [existing] = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.bankAccountId, id),
          eq(bankAccounts.userId, userId),
          eq(bankAccounts.isDeleted, false)
        )
      )
      .limit(1);

    if (!existing) return false;

    // Check if account has transactions
    const [usedInTx] = await db
      .select({ id: transactions.transactionId })
      .from(transactions)
      .where(
        and(
          eq(transactions.bankAccountId, id),
          eq(transactions.isDeleted, false)
        )
      )
      .limit(1);

    if (usedInTx) {
      throw new ConflictError("ไม่สามารถลบบัญชีที่มีรายการใช้งานอยู่ได้");
    }

    // Soft delete per C# implementation
    await db
      .update(bankAccounts)
      .set({ isDeleted: true })
      .where(eq(bankAccounts.bankAccountId, id));

    await logAudit(userId, "Delete", "BankAccounts", id.toString(), {
      accountName: existing.accountName,
      bankName: existing.bankName,
      isDeleted: true,
    });

    return true;
  }
}
