import { lt } from "drizzle-orm";
import { db } from "@/lib/server/db";
import { auditLogs } from "@/lib/server/db/schema";

export type AuditAction =
  | "Create"
  | "Update"
  | "Delete"
  | "Login"
  | "Logout"
  | "PasswordChange"
  | "DataReset"
  | "Import"
  | "Export";

export async function logAudit(
  userId: number | null,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  details?: unknown
): Promise<void> {
  try {
    const detailsJson = details ? JSON.stringify(details) : null;
    await db.insert(auditLogs).values({
      userId: userId && userId > 0 ? userId : null,
      action,
      entityType,
      entityId,
      detailsJson,
      occurredAt: new Date(),
    });
  } catch (err) {
    console.error("[AuditLog] Failed to record audit log:", err);
  }
}

export async function purgeAuditLogs(retentionDays = 90): Promise<number> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const deleted = await db
      .delete(auditLogs)
      .where(lt(auditLogs.occurredAt, cutoff))
      .returning({ id: auditLogs.auditLogId });

    return deleted.length;
  } catch (err) {
    console.error("[AuditLog] Failed to purge old audit logs:", err);
    return 0;
  }
}
