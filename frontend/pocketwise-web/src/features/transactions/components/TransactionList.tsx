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
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { TransactionForm } from "./TransactionForm";
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  Layers,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  Tag,
  Trash2,
} from "lucide-react";

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
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <ReceiptText className="size-6 text-[var(--pw-primary)]" />
          รายการรายรับรายจ่าย
        </h1>
        <Button className="w-full sm:w-auto" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus />
          เพิ่มรายการ
        </Button>
      </div>

      <BottomSheet
        open={showForm || editing !== null}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setShowForm(false);
            setEditing(null);
          }
        }}
        title={editing ? "แก้ไขรายการ" : "เพิ่มรายการใหม่"}
        description={
          editing
            ? "ปรับเปลี่ยนรายละเอียดของรายการธุรกรรม"
            : "บันทึกรายการรายรับ รายจ่าย หรือโอนเงินใหม่"
        }
      >
        <TransactionForm
          key={editing?.transactionId ?? "new"}
          onClose={() => { setShowForm(false); setEditing(null); }}
          editing={editing ?? undefined}
        />
      </BottomSheet>

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
          <div id="transaction-type-filter" className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="กรองประเภทธุรกรรม">
            <button
              type="button"
              role="radio"
              aria-checked={!filter.type}
              onClick={() => handleFilterChange({ type: undefined })}
              className={cn(
                "flex h-10 cursor-pointer items-center justify-center gap-1 rounded-[var(--pw-rounded-sm)] border text-xs sm:text-sm font-medium transition-colors",
                !filter.type
                  ? "border-[var(--pw-primary)] bg-[var(--pw-primary)] text-white shadow-sm"
                  : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-primary)] hover:text-[var(--pw-primary)] hover:bg-[var(--pw-primary)]/10",
              )}
            >
              <Layers className="size-3.5" />
              ทั้งหมด
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={filter.type === "expense"}
              onClick={() => handleFilterChange({ type: "expense" })}
              className={cn(
                "flex h-10 cursor-pointer items-center justify-center gap-1 rounded-[var(--pw-rounded-sm)] border text-xs sm:text-sm font-medium transition-colors",
                filter.type === "expense"
                  ? "border-[var(--pw-expense)] bg-[var(--pw-expense)] text-white shadow-sm"
                  : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-expense)] hover:text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/10",
              )}
            >
              <ArrowDownRight className="size-3.5" />
              รายจ่าย
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={filter.type === "income"}
              onClick={() => handleFilterChange({ type: "income" })}
              className={cn(
                "flex h-10 cursor-pointer items-center justify-center gap-1 rounded-[var(--pw-rounded-sm)] border text-xs sm:text-sm font-medium transition-colors",
                filter.type === "income"
                  ? "border-[var(--pw-green)] bg-[var(--pw-green)] text-black font-semibold shadow-sm"
                  : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-green)] hover:text-[var(--pw-green)] hover:bg-[var(--pw-green)]/10",
              )}
            >
              <ArrowUpRight className="size-3.5" />
              รายรับ
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={filter.type === "transfer"}
              onClick={() => handleFilterChange({ type: "transfer" })}
              className={cn(
                "flex h-10 cursor-pointer items-center justify-center gap-1 rounded-[var(--pw-rounded-sm)] border text-xs sm:text-sm font-medium transition-colors",
                filter.type === "transfer"
                  ? "border-[var(--pw-link)] bg-[var(--pw-link)] text-black font-semibold shadow-sm"
                  : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-link)] hover:text-[var(--pw-link)] hover:bg-[var(--pw-link)]/10",
              )}
            >
              <ArrowRightLeft className="size-3.5" />
              โอน
            </button>
          </div>
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
        <Card className="flex flex-col items-center justify-center py-12 text-center text-[var(--pw-ink)]/65">
          <ReceiptText className="mb-3 size-12 opacity-35 text-[var(--pw-primary)]" />
          <p className="text-base font-semibold text-[var(--pw-ink)]">ยังไม่มีรายการธุรกรรม</p>
          <p className="mt-1 text-xs text-[var(--pw-ink)]/60">กดปุ่ม &quot;เพิ่มรายการ&quot; ด้านบนเพื่อเริ่มต้นบันทึก</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((t) => (
              <div
                key={t.transactionId}
                className={cn(
                  "relative flex flex-col justify-between rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/40 p-4 transition hover:bg-[var(--pw-surface-raised)]/70 shadow-xs",
                  t.transactionType === "expense"
                    ? "border-l-4 border-l-[var(--pw-expense)]"
                    : t.transactionType === "income"
                      ? "border-l-4 border-l-[var(--pw-green)]"
                      : "border-l-4 border-l-[var(--pw-link)]",
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {t.description ? (
                        <p className="break-words font-semibold text-base text-[var(--pw-ink)]">
                          {t.description}
                        </p>
                      ) : (
                        <p className="break-words text-sm italic font-normal text-[var(--pw-ink)]/40">
                          (ไม่ระบุรายละเอียด)
                        </p>
                      )}
                      <p className="mt-1 text-xs text-[var(--pw-ink)]/60">
                        {formatDateTime(t.transactionDate)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={cn(
                          "text-base font-bold sm:text-lg block",
                          t.transactionType === "expense"
                            ? "text-[var(--pw-expense)]"
                            : t.transactionType === "income"
                              ? "text-[var(--pw-green)]"
                              : "text-[var(--pw-link)]",
                        )}
                      >
                        {t.transactionType === "expense" ? "-" : t.transactionType === "income" ? "+" : "↔"}
                        {formatCurrency(t.amount, t.currencyCode)}
                      </span>
                      <span
                        className={cn(
                          "mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                          t.transactionType === "expense"
                            ? "bg-[var(--pw-expense)]/15 text-[var(--pw-expense)]"
                            : t.transactionType === "income"
                              ? "bg-[var(--pw-green)]/15 text-[var(--pw-green)]"
                              : "bg-[var(--pw-link)]/15 text-[var(--pw-link)]",
                        )}
                      >
                        {t.transactionType === "expense" ? "รายจ่าย" : t.transactionType === "income" ? "รายรับ" : "โอน"}
                      </span>
                    </div>
                  </div>

                  <div className="my-3 flex flex-wrap items-center gap-1.5 text-xs text-[var(--pw-ink)]/75">
                    <span className="rounded bg-[var(--pw-surface-indigo)] px-2 py-0.5 border border-[var(--pw-hairline)]">
                      {t.categoryName ?? "ไม่มีหมวดหมู่"}
                    </span>
                    {Boolean(t.bankAccountId && bankAccounts?.find((b) => b.bankAccountId === t.bankAccountId)?.accountName) && (
                      <span className="inline-flex items-center rounded bg-[var(--pw-surface-indigo)] px-2 py-0.5 border border-[var(--pw-hairline)] text-[var(--pw-ink)]/70">
                        <Landmark className="mr-1 size-3 text-[var(--pw-link)]" />
                        {bankAccounts?.find((b) => b.bankAccountId === t.bankAccountId)?.accountName}
                      </span>
                    )}
                    {t.sourceType && t.sourceType !== "manual" && (
                      <span className="inline-flex items-center rounded bg-[var(--pw-primary)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--pw-primary)]">
                        {t.sourceType === "cardStatement" ? (
                          <>
                            <CreditCard className="mr-1 size-3" />
                            บัตรเครดิต
                          </>
                        ) : t.sourceType === "slip" ? (
                          "สลิป"
                        ) : (
                          t.sourceType
                        )}
                      </span>
                    )}
                    {t.tags.length > 0 &&
                      t.tags.map((tag) => {
                        const color = tags?.find((item) => item.tagId === tag.tagId)?.color ?? "#ec48bd";
                        return (
                          <span
                            key={tag.tagId}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{ backgroundColor: color, color: getReadableTextColor(color) }}
                          >
                            <Tag className="mr-1 size-2.5 opacity-80" />
                            {tag.tagName}
                          </span>
                        );
                      })}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-[var(--pw-hairline)] pt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 text-xs px-3"
                    onClick={() => {
                      setEditing(t);
                      setShowForm(false);
                    }}
                  >
                    <Pencil className="size-3.5" />
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
                      <Button size="sm" variant="destructive" className="h-8 text-xs px-3">
                        <Trash2 className="size-3.5" />
                        ลบ
                      </Button>
                    }
                  />
                </div>
              </div>
            ))}
          </div>

          {data.totalPages > 1 && (
            <div className="flex items-center justify-between rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/30 px-4 py-3">
              <Button variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft />
                ก่อนหน้า
              </Button>
              <span className="text-sm text-[var(--pw-ink)]/70">
                หน้า {page} / {data.totalPages} ({data.totalItems} รายการ)
              </span>
              <Button variant="ghost" disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
                ถัดไป
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
