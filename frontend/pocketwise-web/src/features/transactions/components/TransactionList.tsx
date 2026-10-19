"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTransactions, useDeleteTransaction } from "@/features/transactions/hooks/useTransactions";
import type { TransactionFilter, TransactionResponse } from "@/types/transaction.types";
import { ApiError } from "@/lib/api-client";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TransactionForm } from "./TransactionForm";

export function TransactionList() {
  const [filter, setFilter] = useState<TransactionFilter>({});
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TransactionResponse | null>(null);

  const { data, isLoading } = useTransactions(filter, page);
  const remove = useDeleteTransaction();

  const handleFilterChange = (patch: Partial<TransactionFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">รายการรายรับรายจ่าย</h1>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          + เพิ่มรายการ
        </Button>
      </div>

      {(showForm || editing) && (
        <TransactionForm
          onClose={() => { setShowForm(false); setEditing(null); }}
          editing={editing ?? undefined}
        />
      )}

      <Card className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-sm text-[var(--pw-ink)]/70 mb-1">ค้นหา</label>
          <Input
            className="w-56 px-3 py-2 text-sm"
            placeholder="คำค้น..."
            value={filter.q ?? ""}
            onChange={(e) => handleFilterChange({ q: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="block text-sm text-[var(--pw-ink)]/70 mb-1">ประเภท</label>
          <Select
            className="w-40 px-3 py-2 text-sm"
            value={filter.type ?? ""}
            onChange={(e) => handleFilterChange({ type: e.target.value || undefined })}
          >
            <option value="">ทั้งหมด</option>
            <option value="income">รายรับ</option>
            <option value="expense">รายจ่าย</option>
            <option value="transfer">โอน</option>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <p className="text-[var(--pw-ink)]/70">กำลังโหลด...</p>
      ) : !data || data.items.length === 0 ? (
        <Card className="text-center text-[var(--pw-ink)]/70">
          ยังไม่มีรายการ
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)]/70">
              <tr>
                <th className="px-4 py-3">วันที่</th>
                <th className="px-4 py-3">รายละเอียด</th>
                <th className="px-4 py-3">หมวดหมู่</th>
                <th className="px-4 py-3">จำนวน</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.transactionId} className="border-t border-[var(--pw-hairline)]">
                  <td className="px-4 py-3">{formatDateTime(t.transactionDate)}</td>
                  <td className="px-4 py-3">{t.description ?? "-"}</td>
                  <td className="px-4 py-3">{t.categoryName ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={t.transactionType === "expense" ? "text-[var(--pw-magenta)]" : "text-[var(--pw-green)]"}>
                      {t.transactionType === "expense" ? "-" : "+"}
                      {formatCurrency(t.amount, t.currencyCode)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="mr-2 text-[var(--pw-link)]"
                      onClick={() => { setEditing(t); setShowForm(false); }}
                    >
                      แก้ไข
                    </button>
                    <ConfirmDialog
                      title="ลบรายการนี้?"
                      description="การลบจะไม่สามารถย้อนกลับได้"
                      confirmLabel="ลบ"
                      pending={remove.isPending}
                      onConfirm={() => {
                        remove.mutate(t.transactionId, {
                          onSuccess: () => toast.success("ลบรายการแล้ว"),
                          onError: (e) => toast.error(e instanceof ApiError ? e.message : "ลบไม่สำเร็จ"),
                        });
                      }}
                      trigger={
                        <button className="text-[var(--pw-magenta)]">ลบ</button>
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--pw-hairline)] px-4 py-3">
              <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                ก่อนหน้า
              </Button>
              <span className="text-sm text-[var(--pw-ink)]/70">
                หน้า {page} / {data.totalPages}
              </span>
              <Button variant="ghost" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                ถัดไป
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
