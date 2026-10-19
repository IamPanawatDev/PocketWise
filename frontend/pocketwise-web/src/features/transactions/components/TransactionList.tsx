"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useTransactions, useDeleteTransaction } from "@/features/transactions/hooks/useTransactions";
import type { TransactionFilter, TransactionResponse } from "@/types/transaction.types";
import { ApiError } from "@/lib/api-client";
import {
  cn,
  formatCurrency,
  formatDateTime,
  getReadableTextColor,
  isGregorianDateInput,
  thailandDateBoundaryToUtcIso,
  toThailandDateInputValue,
} from "@/lib/utils";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useTags } from "@/features/tags/hooks/useTags";
import { useBankAccounts } from "@/features/accounts/hooks/useBankAccounts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { TransactionForm } from "./TransactionForm";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";

export function TransactionList({
  initialFilter,
}: {
  initialFilter: Pick<TransactionFilter, "fromDate" | "toDate">;
}) {
  const [filter, setFilter] = useState<TransactionFilter>(initialFilter);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<"transactionDate" | "amount">("transactionDate");
  const [sortDesc, setSortDesc] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TransactionResponse | null>(null);

  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const { data: bankAccounts } = useBankAccounts();
  const accountFilterId = filter.bankAccountId ??
    (bankAccounts?.length === 1 ? bankAccounts[0].bankAccountId : undefined);
  const effectiveFilter = { ...filter, bankAccountId: accountFilterId };
  const { data, isLoading } = useTransactions(effectiveFilter, page, sortBy, sortDesc);
  const remove = useDeleteTransaction();

  const handleFilterChange = (patch: Partial<TransactionFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-bold sm:text-2xl">รายการรายรับรายจ่าย</h1>
        <Button className="w-full sm:w-auto" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus />
          เพิ่มรายการ
        </Button>
      </div>

      {(showForm || editing) && (
        <TransactionForm
          key={editing?.transactionId ?? "new"}
          onClose={() => { setShowForm(false); setEditing(null); }}
          editing={editing ?? undefined}
        />
      )}

      <Card className="mb-4 grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
        <FormField
          label={<span className="inline-flex items-center gap-1"><Search className="size-4" />ค้นหา</span>}
          htmlFor="transaction-search"
          className="w-full min-w-0"
        >
          <Input
            id="transaction-search"
            className="px-3 py-2 text-sm"
            placeholder="คำค้น..."
            value={filter.q ?? ""}
            onChange={(e) => handleFilterChange({ q: e.target.value || undefined })}
          />
        </FormField>
        <FormField label="ประเภท" htmlFor="transaction-type-filter" className="w-full min-w-0">
          <Select
            value={filter.type ?? "all"}
            onValueChange={(value) => handleFilterChange({
              type: value === "all"
                ? undefined
                : value === "income"
                  ? "income"
                  : value === "expense"
                    ? "expense"
                    : "transfer",
            })}
          >
            <SelectTrigger id="transaction-type-filter">
              <SelectValue placeholder="ทั้งหมด" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทั้งหมด</SelectItem>
              <SelectItem value="income">รายรับ</SelectItem>
              <SelectItem value="expense">รายจ่าย</SelectItem>
              <SelectItem value="transfer">โอน</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="หมวดหมู่" htmlFor="transaction-category-filter" className="w-full min-w-0">
          <Select
            value={filter.categoryId === undefined ? "all" : String(filter.categoryId)}
            onValueChange={(value) => handleFilterChange({
              categoryId: value === "all" ? undefined : Number(value),
            })}
          >
            <SelectTrigger id="transaction-category-filter">
              <SelectValue placeholder="ทุกหมวดหมู่" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกหมวดหมู่</SelectItem>
              {categories?.map((category) => (
                <SelectItem key={category.categoryId} value={String(category.categoryId)}>{category.categoryName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="แท็ก" htmlFor="transaction-tag-filter" className="w-full min-w-0">
          <Select
            value={filter.tagId === undefined ? "all" : String(filter.tagId)}
            onValueChange={(value) => handleFilterChange({
              tagId: value === "all" ? undefined : Number(value),
            })}
          >
            <SelectTrigger id="transaction-tag-filter">
              <SelectValue placeholder="ทุกแท็ก" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ทุกแท็ก</SelectItem>
              {tags?.map((tag) => (
                <SelectItem key={tag.tagId} value={String(tag.tagId)}>{tag.tagName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="บัญชี" htmlFor="transaction-account-filter" className="w-full min-w-0">
          <Select
            value={accountFilterId === undefined ? "all" : String(accountFilterId)}
            onValueChange={(value) => handleFilterChange({
              bankAccountId: value === "all" ? undefined : Number(value),
            })}
          >
            <SelectTrigger id="transaction-account-filter">
              <SelectValue placeholder="ทุกบัญชี" />
            </SelectTrigger>
            <SelectContent>
              {bankAccounts?.length !== 1 && <SelectItem value="all">ทุกบัญชี</SelectItem>}
              {bankAccounts?.map((account) => (
                <SelectItem key={account.bankAccountId} value={String(account.bankAccountId)}>{account.accountName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="ตั้งแต่วันที่ (ค.ศ.)" htmlFor="transaction-from-date" className="w-full min-w-0">
          <DateInput
            id="transaction-from-date"
            className="px-3 py-2 text-sm"
            value={filter.fromDate ? toThailandDateInputValue(filter.fromDate) : ""}
            onChange={(value) => {
              if (value && !isGregorianDateInput(value)) {
                toast.error("กรุณาใช้ปี ค.ศ. (Gregorian) ไม่ใช่ปี พ.ศ.");
                return;
              }
              handleFilterChange({
                fromDate: value ? thailandDateBoundaryToUtcIso(value) : undefined,
              });
            }}
          />
        </FormField>
        <FormField label="ถึงวันที่ (ค.ศ.)" htmlFor="transaction-to-date" className="w-full min-w-0">
          <DateInput
            id="transaction-to-date"
            className="px-3 py-2 text-sm"
            value={filter.toDate ? toThailandDateInputValue(filter.toDate) : ""}
            onChange={(value) => {
              if (value && !isGregorianDateInput(value)) {
                toast.error("กรุณาใช้ปี ค.ศ. (Gregorian) ไม่ใช่ปี พ.ศ.");
                return;
              }
              handleFilterChange({
                toDate: value ? thailandDateBoundaryToUtcIso(value, true) : undefined,
              });
            }}
          />
        </FormField>
        <FormField label="เรียงตาม" htmlFor="transaction-sort-by" className="w-full min-w-0">
          <Select
            value={sortBy}
            onValueChange={(value) => {
              setSortBy(value === "amount" ? "amount" : "transactionDate");
              setPage(1);
            }}
          >
            <SelectTrigger id="transaction-sort-by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="transactionDate">วันที่</SelectItem>
              <SelectItem value="amount">จำนวนเงิน</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="ลำดับ" htmlFor="transaction-sort-order" className="w-full min-w-0">
          <Select
            value={sortDesc ? "desc" : "asc"}
            onValueChange={(value) => {
              setSortDesc(value === "desc");
              setPage(1);
            }}
          >
            <SelectTrigger id="transaction-sort-order">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">มากไปน้อย / ใหม่ไปเก่า</SelectItem>
              <SelectItem value="asc">น้อยไปมาก / เก่าไปใหม่</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </Card>

      {isLoading ? (
        <p className="text-[var(--pw-ink)]/70">กำลังโหลด...</p>
      ) : !data || data.items.length === 0 ? (
        <Card className="text-center text-[var(--pw-ink)]/70">
          ยังไม่มีรายการ
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-[var(--pw-hairline)] md:hidden">
            {data.items.map((t) => (
              <article key={t.transactionId} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{t.description ?? "-"}</p>
                    <p className="mt-1 text-xs text-[var(--pw-ink)]/60">
                      {formatDateTime(t.transactionDate)} · {t.categoryName ?? "ไม่มีหมวดหมู่"}
                    </p>
                  </div>
                  <span className={cn(
                    "shrink-0 font-semibold",
                    t.transactionType === "expense"
                      ? "text-[var(--pw-expense)]"
                      : t.transactionType === "income"
                        ? "text-[var(--pw-green)]"
                        : "text-[var(--pw-link)]",
                  )}>
                    {t.transactionType === "expense" ? "-" : t.transactionType === "income" ? "+" : "↔"}
                    {formatCurrency(t.amount, t.currencyCode)}
                  </span>
                </div>
                {t.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {t.tags.map((tag) => {
                      const color = tags?.find((item) => item.tagId === tag.tagId)?.color ?? "#ec48bd";
                      return (
                        <span
                          key={tag.tagId}
                          className="rounded-full px-2 py-0.5 text-xs"
                          style={{ backgroundColor: color, color: getReadableTextColor(color) }}
                        >
                          #{tag.tagName}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-h-10 flex-1"
                    onClick={() => { setEditing(t); setShowForm(false); }}
                  >
                    <Pencil />
                    แก้ไข
                  </Button>
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
                      <Button size="sm" variant="destructive" className="min-h-10 flex-1">
                        <Trash2 />
                        ลบ
                      </Button>
                    }
                  />
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)]">
              <tr>
                <th className="px-4 py-3">วันที่ (เวลาไทย)</th>
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
                  <td className="px-4 py-3">
                    <div className="space-y-1.5">
                      <p>{t.description ?? "-"}</p>
                      {t.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {t.tags.map((tag) => {
                            const color = tags?.find((item) => item.tagId === tag.tagId)?.color ?? "#ec48bd";
                            return (
                              <span
                                key={tag.tagId}
                                className="rounded-full px-2 py-0.5 text-xs"
                                style={{ backgroundColor: color, color: getReadableTextColor(color) }}
                              >
                                #{tag.tagName}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{t.categoryName ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      t.transactionType === "expense"
                        ? "text-[var(--pw-expense)]"
                        : t.transactionType === "income"
                          ? "text-[var(--pw-green)]"
                          : "text-[var(--pw-link)]",
                    )}>
                      {t.transactionType === "expense" ? "-" : t.transactionType === "income" ? "+" : "↔"}
                      {formatCurrency(t.amount, t.currencyCode)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => { setEditing(t); setShowForm(false); }}
                    >
                      <Pencil />
                      แก้ไข
                    </Button>
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
                        <Button size="sm" variant="destructive">
                          <Trash2 />
                          ลบ
                        </Button>
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--pw-hairline)] px-4 py-3">
              <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft />
                ก่อนหน้า
              </Button>
              <span className="text-sm text-[var(--pw-ink)]/70">
                หน้า {page} / {data.totalPages}
              </span>
              <Button variant="ghost" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                ถัดไป
                <ChevronRight />
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
