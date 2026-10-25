"use client";

import { useMemo, useState } from "react";
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
import { useCreditCards } from "@/features/credit-cards/hooks/useCreditCards";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
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
import { TransactionCardsSkeleton } from "@/components/shared/Skeletons";
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
  SlidersHorizontal,
  Tag,
  Trash2,
  X,
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
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [editing, setEditing] = useState<TransactionResponse | null>(null);

  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const { data: bankAccounts } = useBankAccounts();
  const { data: creditCards } = useCreditCards();
  const { data, isLoading } = useTransactions(filter, page, sortBy, sortDesc);
  const remove = useDeleteTransaction();

  const handleFilterChange = (patch: Partial<TransactionFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter.type) count++;
    if (filter.categoryId !== undefined) count++;
    if (filter.tagId !== undefined) count++;
    if (filter.bankAccountId !== undefined) count++;
    if (filter.creditCardId !== undefined) count++;
    if (filter.fromDate) count++;
    if (filter.toDate) count++;
    if (sortBy !== "transactionDate" || !sortDesc) count++;
    return count;
  }, [filter, sortBy, sortDesc]);

  const resetFilters = () => {
    setFilter({});
    setSortBy("transactionDate");
    setSortDesc(true);
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

      {/* Search & Filter Trigger Bar */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--pw-ink)]/50 pointer-events-none" />
            <Input
              id="transaction-search"
              className="pl-9 pr-3 py-2 text-base md:text-sm bg-[var(--pw-canvas)] w-full"
              placeholder="ค้นหารายการ, ร้านค้า, หมายเหตุ..."
              value={filter.q ?? ""}
              onChange={(e) => handleFilterChange({ q: e.target.value || undefined })}
            />
          </div>
          <Button
            type="button"
            variant={activeFilterCount > 0 ? "secondary" : "outline"}
            className="shrink-0 relative gap-2"
            onClick={() => setShowFilterSheet(true)}
            aria-label="เปิดตัวกรองรายการ"
          >
            <SlidersHorizontal className="size-4" />
            <span>ตัวกรอง</span>
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--pw-primary)] text-[11px] font-bold text-[var(--pw-on-primary)]">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-[var(--pw-ink)]/50 font-medium mr-1">ตัวกรองที่เลือก:</span>
            {filter.type && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-1 text-[var(--pw-ink)]">
                {filter.type === "expense" ? "รายจ่าย" : filter.type === "income" ? "รายรับ" : "โอน"}
                <button
                  type="button"
                  onClick={() => handleFilterChange({ type: undefined })}
                  className="hover:text-[var(--pw-expense)] ml-0.5"
                  aria-label="ลบตัวกรองประเภท"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {filter.categoryId !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-1 text-[var(--pw-ink)]">
                หมวด: {categories?.find((c) => c.categoryId === filter.categoryId)?.categoryName ?? filter.categoryId}
                <button
                  type="button"
                  onClick={() => handleFilterChange({ categoryId: undefined })}
                  className="hover:text-[var(--pw-expense)] ml-0.5"
                  aria-label="ลบตัวกรองหมวดหมู่"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {filter.tagId !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-1 text-[var(--pw-ink)]">
                แท็ก: {tags?.find((t) => t.tagId === filter.tagId)?.tagName ?? filter.tagId}
                <button
                  type="button"
                  onClick={() => handleFilterChange({ tagId: undefined })}
                  className="hover:text-[var(--pw-expense)] ml-0.5"
                  aria-label="ลบตัวกรองแท็ก"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {filter.bankAccountId !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-1 text-[var(--pw-ink)]">
                บัญชี: {bankAccounts?.find((a) => a.bankAccountId === filter.bankAccountId)?.accountName ?? filter.bankAccountId}
                <button
                  type="button"
                  onClick={() => handleFilterChange({ bankAccountId: undefined })}
                  className="hover:text-[var(--pw-expense)] ml-0.5"
                  aria-label="ลบตัวกรองบัญชี"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {filter.creditCardId !== undefined && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-1 text-[var(--pw-ink)]">
                บัตรเครดิต: {creditCards?.find((c) => c.creditCardId === filter.creditCardId)?.cardName ?? filter.creditCardId}
                <button
                  type="button"
                  onClick={() => handleFilterChange({ creditCardId: undefined })}
                  className="hover:text-[var(--pw-expense)] ml-0.5"
                  aria-label="ลบตัวกรองบัตรเครดิต"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {(filter.fromDate || filter.toDate) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-1 text-[var(--pw-ink)]">
                ช่วงวันที่
                <button
                  type="button"
                  onClick={() => handleFilterChange({ fromDate: undefined, toDate: undefined })}
                  className="hover:text-[var(--pw-expense)] ml-0.5"
                  aria-label="ลบตัวกรองวันที่"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            {(sortBy !== "transactionDate" || !sortDesc) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-1 text-[var(--pw-ink)]">
                เรียงตาม{sortBy === "amount" ? "จำนวนเงิน" : "วันที่"}({sortDesc ? "มาก-น้อย" : "น้อย-มาก"})
                <button
                  type="button"
                  onClick={() => { setSortBy("transactionDate"); setSortDesc(true); setPage(1); }}
                  className="hover:text-[var(--pw-expense)] ml-0.5"
                  aria-label="รีเซ็ตการเรียงลำดับ"
                >
                  <X className="size-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-[var(--pw-link)] hover:underline ml-1 font-medium"
            >
              ล้างทั้งหมด
            </button>
          </div>
        )}
      </div>

      <BottomSheet
        open={showFilterSheet}
        onOpenChange={setShowFilterSheet}
        title="ตัวกรองและจัดเรียงรายการ"
        description="เลือกเงื่อนไขเพื่อกรองและจัดเรียงรายการธุรกรรมตามต้องการ"
      >
        <div className="space-y-4 py-2">
          <FormField label="ประเภทธุรกรรม" htmlFor="sheet-type-filter" className="w-full min-w-0">
            <div id="sheet-type-filter" className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="กรองประเภทธุรกรรม">
              <button
                type="button"
                role="radio"
                aria-checked={!filter.type}
                onClick={() => handleFilterChange({ type: undefined })}
                className={cn(
                  "flex h-10 cursor-pointer items-center justify-center gap-1 rounded-[var(--pw-rounded-sm)] border text-xs sm:text-sm font-medium transition-colors",
                  !filter.type
                    ? "border-[var(--pw-primary)] bg-[var(--pw-primary)] text-white shadow-sm"
                    : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-primary)] hover:text-[var(--pw-primary)]",
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
                    : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-expense)] hover:text-[var(--pw-expense)]",
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
                    ? "border-[var(--pw-green)] bg-[var(--pw-green)] text-[var(--pw-on-green)] font-semibold shadow-sm"
                    : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-green)] hover:text-[var(--pw-green)]",
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
                    ? "border-[var(--pw-link)] bg-[var(--pw-link)] text-[var(--pw-on-link)] font-semibold shadow-sm"
                    : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-link)] hover:text-[var(--pw-link)]",
                )}
              >
                <ArrowRightLeft className="size-3.5" />
                โอน
              </button>
            </div>
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="หมวดหมู่" htmlFor="sheet-category-filter" className="w-full min-w-0">
              <Select
                value={filter.categoryId === undefined ? "all" : String(filter.categoryId)}
                onValueChange={(value) => handleFilterChange({
                  categoryId: value === "all" ? undefined : Number(value),
                })}
              >
                <SelectTrigger id="sheet-category-filter">
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

            <FormField label="แท็ก" htmlFor="sheet-tag-filter" className="w-full min-w-0">
              <Select
                value={filter.tagId === undefined ? "all" : String(filter.tagId)}
                onValueChange={(value) => handleFilterChange({
                  tagId: value === "all" ? undefined : Number(value),
                })}
              >
                <SelectTrigger id="sheet-tag-filter">
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="บัญชีธนาคาร" htmlFor="sheet-account-filter" className="w-full min-w-0">
              <Select
                value={filter.bankAccountId === undefined ? "all" : String(filter.bankAccountId)}
                onValueChange={(value) => handleFilterChange({
                  bankAccountId: value === "all" ? undefined : Number(value),
                })}
              >
                <SelectTrigger id="sheet-account-filter">
                  <SelectValue placeholder="ทุกบัญชี" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกบัญชี</SelectItem>
                  {bankAccounts?.map((account) => (
                    <SelectItem key={account.bankAccountId} value={String(account.bankAccountId)}>{account.accountName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="บัตรเครดิต" htmlFor="sheet-credit-card-filter" className="w-full min-w-0">
              <Select
                value={filter.creditCardId === undefined ? "all" : String(filter.creditCardId)}
                onValueChange={(value) => handleFilterChange({
                  creditCardId: value === "all" ? undefined : Number(value),
                })}
              >
                <SelectTrigger id="sheet-credit-card-filter">
                  <SelectValue placeholder="ทุกบัตรเครดิต" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกบัตรเครดิต</SelectItem>
                  {creditCards?.map((card) => (
                    <SelectItem key={card.creditCardId} value={String(card.creditCardId)}>{card.cardName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="ตั้งแต่วันที่ (ค.ศ.)" htmlFor="sheet-from-date" className="w-full min-w-0">
              <DateInput
                id="sheet-from-date"
                className="px-3 py-2 text-base md:text-sm"
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
            <FormField label="ถึงวันที่ (ค.ศ.)" htmlFor="sheet-to-date" className="w-full min-w-0">
              <DateInput
                id="sheet-to-date"
                className="px-3 py-2 text-base md:text-sm"
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="เรียงตาม" htmlFor="sheet-sort-by" className="w-full min-w-0">
              <Select
                value={sortBy}
                onValueChange={(value) => {
                  setSortBy(value === "amount" ? "amount" : "transactionDate");
                  setPage(1);
                }}
              >
                <SelectTrigger id="sheet-sort-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transactionDate">วันที่</SelectItem>
                  <SelectItem value="amount">จำนวนเงิน</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="ลำดับ" htmlFor="sheet-sort-order" className="w-full min-w-0">
              <Select
                value={sortDesc ? "desc" : "asc"}
                onValueChange={(value) => {
                  setSortDesc(value === "desc");
                  setPage(1);
                }}
              >
                <SelectTrigger id="sheet-sort-order">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">มากไปน้อย / ใหม่ไปเก่า</SelectItem>
                  <SelectItem value="asc">น้อยไปมาก / เก่าไปใหม่</SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--pw-hairline)]">
            <Button
              type="button"
              variant="ghost"
              onClick={resetFilters}
              disabled={activeFilterCount === 0}
            >
              ล้างค่าทั้งหมด
            </Button>
            <Button
              type="button"
              onClick={() => setShowFilterSheet(false)}
            >
              ดูรายการ ({data?.totalItems ?? 0})
            </Button>
          </div>
        </div>
      </BottomSheet>

      {isLoading ? (
        <TransactionCardsSkeleton count={6} />
      ) : !data || data.items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center text-[var(--pw-ink)]/65">
          <ReceiptText className="mb-3 size-12 opacity-35 text-[var(--pw-primary)]" />
          <p className="text-base font-semibold text-[var(--pw-ink)]">ยังไม่มีรายการธุรกรรม</p>
          <p className="mt-1 text-xs text-[var(--pw-ink)]/60">กดปุ่ม &quot;เพิ่มรายการ&quot; ด้านบนเพื่อเริ่มต้นบันทึก</p>
        </Card>
      ) : (
        <div className="space-y-4">
          <AnimatedList key={`page-${page}-${sortBy}-${sortDesc}`} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((t) => (
              <AnimatedListItem
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
                    {Boolean(t.bankAccountId && (t.bankAccountName ?? bankAccounts?.find((b) => b.bankAccountId === t.bankAccountId)?.accountName)) && (
                      <span className="inline-flex items-center rounded bg-[var(--pw-surface-indigo)] px-2 py-0.5 border border-[var(--pw-hairline)] text-[var(--pw-ink)]/70">
                        <Landmark className="mr-1 size-3 text-[var(--pw-link)]" />
                        {t.bankAccountName ?? bankAccounts?.find((b) => b.bankAccountId === t.bankAccountId)?.accountName}
                      </span>
                    )}
                    {Boolean(t.creditCardId && (t.creditCardName ?? creditCards?.find((c) => c.creditCardId === t.creditCardId)?.cardName)) && (
                      <span className="inline-flex items-center rounded bg-[var(--pw-surface-indigo)] px-2 py-0.5 border border-[var(--pw-hairline)] text-[var(--pw-ink)]/70">
                        <CreditCard className="mr-1 size-3 text-[var(--pw-accent)]" />
                        {t.creditCardName ?? creditCards?.find((c) => c.creditCardId === t.creditCardId)?.cardName}
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
              </AnimatedListItem>
            ))}
          </AnimatedList>

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
