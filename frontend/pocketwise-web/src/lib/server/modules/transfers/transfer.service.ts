import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/server/db";
import {
  bankAccounts,
  transactions,
  transferGroups,
} from "@/lib/server/db/schema";
import {
  NotFoundError,
  ValidationErrorAppError,
} from "@/lib/server/api-error";
import { logAudit } from "@/lib/server/audit";

export type TransferGroupStatus = "pending" | "matched" | "confirmed" | "void";

export interface TransferResponse {
  transferGroupId: number;
  fromBankAccountId: number;
  toBankAccountId: number;
  amount: number;
  transferDate: string;
  reference: string | null;
  status: TransferGroupStatus;
  createdAt: string;
}

export interface CreateTransferRequest {
  fromBankAccountId: number;
  toBankAccountId: number;
  amount: number;
  transferDate: string | Date;
  reference?: string | null;
}

function normalizeResponseStatus(status: string): TransferGroupStatus {
  const lower = (status || "").toLowerCase().trim();
  if (lower === "pending") return "pending";
  if (lower === "matched") return "matched";
  if (lower === "void") return "void";
  return "confirmed";
}

export class TransferService {
  /**
   * Get all transfers for a user
   */
  static async getAll(userId: number): Promise<TransferResponse[]> {
    const list = await db
      .select()
      .from(transferGroups)
      .where(
        and(
          eq(transferGroups.userId, userId),
          eq(transferGroups.isDeleted, false)
        )
      )
      .orderBy(desc(transferGroups.transferDate), desc(transferGroups.transferGroupId));

    return list.map((t) => ({
      transferGroupId: t.transferGroupId,
      fromBankAccountId: t.fromBankAccountId,
      toBankAccountId: t.toBankAccountId ?? 0,
      amount: Number(t.amount) || 0,
      transferDate: t.transferDate.toISOString(),
      reference: t.reference,
      status: normalizeResponseStatus(t.status),
      createdAt: t.createdAt.toISOString(),
    }));
  }

  /**
   * Get transfer by ID
   */
  static async getById(id: number, userId: number): Promise<TransferResponse | null> {
    const [t] = await db
      .select()
      .from(transferGroups)
      .where(
        and(
          eq(transferGroups.transferGroupId, id),
          eq(transferGroups.userId, userId),
          eq(transferGroups.isDeleted, false)
        )
      )
      .limit(1);

    if (!t) return null;

    return {
      transferGroupId: t.transferGroupId,
      fromBankAccountId: t.fromBankAccountId,
      toBankAccountId: t.toBankAccountId ?? 0,
      amount: Number(t.amount) || 0,
      transferDate: t.transferDate.toISOString(),
      reference: t.reference,
      status: normalizeResponseStatus(t.status),
      createdAt: t.createdAt.toISOString(),
    };
  }

  /**
   * Create transfer atomically between two bank accounts
   */
  static async create(
    userId: number,
    request: CreateTransferRequest
  ): Promise<TransferResponse> {
    const amount = Number(request.amount);
    if (!amount || amount <= 0 || Number.isNaN(amount)) {
      throw new ValidationErrorAppError("จำนวนเงินต้องมากกว่า 0", [
        { field: "amount", message: "จำนวนเงินต้องมากกว่า 0" },
      ]);
    }

    if (!request.transferDate) {
      throw new ValidationErrorAppError("ต้องระบุวันที่โอน", [
        { field: "transferDate", message: "ต้องระบุวันที่โอน" },
      ]);
    }

    const fromBankAccountId = Number(request.fromBankAccountId);
    const toBankAccountId = Number(request.toBankAccountId);

    if (!fromBankAccountId || fromBankAccountId <= 0) {
      throw new ValidationErrorAppError("ต้องระบุบัญชีต้นทาง", [
        { field: "fromBankAccountId", message: "ต้องระบุบัญชีต้นทาง" },
      ]);
    }

    if (!toBankAccountId || toBankAccountId <= 0) {
      throw new ValidationErrorAppError("ต้องระบุบัญชีปลายทาง", [
        { field: "toBankAccountId", message: "ต้องระบุบัญชีปลายทาง" },
      ]);
    }

    if (fromBankAccountId === toBankAccountId) {
      throw new ValidationErrorAppError("บัญชีต้นทางและปลายทางต้องไม่ซ้ำกัน", [
        { field: "toBankAccountId", message: "บัญชีต้นทางและปลายทางต้องไม่ซ้ำกัน" },
      ]);
    }

    // Verify fromAccount exists and belongs to user
    const [fromAccount] = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.bankAccountId, fromBankAccountId),
          eq(bankAccounts.userId, userId),
          eq(bankAccounts.isDeleted, false)
        )
      )
      .limit(1);

    if (!fromAccount) {
      throw new NotFoundError("ไม่พบบัญชีต้นทาง");
    }

    // Verify toAccount exists and belongs to user
    const [toAccount] = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.bankAccountId, toBankAccountId),
          eq(bankAccounts.userId, userId),
          eq(bankAccounts.isDeleted, false)
        )
      )
      .limit(1);

    if (!toAccount) {
      throw new NotFoundError("ไม่พบบัญชีปลายทาง");
    }

    const parsedDate =
      typeof request.transferDate === "string"
        ? new Date(request.transferDate)
        : request.transferDate;
    const ref = request.reference?.trim() || null;

    // Execute transfer group and 2 transactions in an atomic transaction
    const createdTransfer = await db.transaction(async (tx) => {
      const [transferGroup] = await tx
        .insert(transferGroups)
        .values({
          userId,
          fromBankAccountId,
          toBankAccountId,
          amount: amount.toFixed(2),
          transferDate: parsedDate,
          reference: ref,
          status: "Confirmed",
          isDeleted: false,
          createdAt: new Date(),
        })
        .returning();

      // 1. Outgoing transaction (from source account)
      const outDesc = `โอนออกไปยัง ${toAccount.accountName}`;
      await tx.insert(transactions).values({
        userId,
        transactionType: "Transfer",
        amount: amount.toFixed(2),
        currencyCode: "THB",
        transactionDate: parsedDate,
        description: outDesc,
        bankAccountId: fromBankAccountId,
        sourceType: "Manual",
        status: "Confirmed",
        transferGroupId: transferGroup.transferGroupId,
        isDeleted: false,
        createdAt: new Date(),
      });

      // 2. Incoming transaction (to target account)
      const inDesc = `โอนเข้าจาก ${fromAccount.accountName}`;
      await tx.insert(transactions).values({
        userId,
        transactionType: "Transfer",
        amount: amount.toFixed(2),
        currencyCode: "THB",
        transactionDate: parsedDate,
        description: inDesc,
        bankAccountId: toBankAccountId,
        sourceType: "Manual",
        status: "Confirmed",
        transferGroupId: transferGroup.transferGroupId,
        isDeleted: false,
        createdAt: new Date(),
      });

      return transferGroup;
    });

    await logAudit(
      userId,
      "Create",
      "TransferGroups",
      createdTransfer.transferGroupId.toString(),
      {
        amount: createdTransfer.amount,
        transferDate: createdTransfer.transferDate,
        reference: createdTransfer.reference,
        fromBankAccountId,
        toBankAccountId,
        fromAccountName: fromAccount.accountName,
        toAccountName: toAccount.accountName,
      }
    );

    return {
      transferGroupId: createdTransfer.transferGroupId,
      fromBankAccountId: createdTransfer.fromBankAccountId,
      toBankAccountId: createdTransfer.toBankAccountId ?? 0,
      amount: Number(createdTransfer.amount) || 0,
      transferDate: createdTransfer.transferDate.toISOString(),
      reference: createdTransfer.reference,
      status: normalizeResponseStatus(createdTransfer.status),
      createdAt: createdTransfer.createdAt.toISOString(),
    };
  }
}
