"use client";

import Link from "next/link";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useTransactions, useDeleteTransaction } from "@/features/transactions/hooks/useTransactions";
import type { TransactionFilter, TransactionResponse } from "@/types/transaction.types";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  cn,
  formatCurrency,

  getReadableTextColor,
  isGregorianDateInput,
  thailandDateBoundaryToUtcIso,
  toThailandDateInputValue,
  getTodayRange,
  getThisWeekRange,
  getThisMonthRange,
  getThisYearRange,
} from "@/lib/utils";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useTags } from "@/features/tags/hooks/useTags";
import { useBankAccounts } from "@/features/accounts/hooks/useBankAccounts";
import { useCreditCards } from "@/features/credit-cards/hooks/useCreditCards";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/EmptyState";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { AnimatedNumber } from "@/components/ui/animated-number";
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
import { formatDisplayDate, formatDisplayDateTime, getRecentMonthOptions } from "@/lib/date-utils";
import {
  ArrowDownRight,
  Calendar,
  Check,
  CheckSquare,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  LoaderCircle,
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

  const searchParams = useSearchParams();
  const [showForm, setShowForm] = useState(() => searchParams.get("action") === "new");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionResponse | null>(null);
  const monthOptions = useMemo(() => getRecentMonthOptions(24, 1), []);
  const [isCustomDateMode, setIsCustomDateMode] = useState(false);

  const currentMonthValue = useMemo(() => {
    if (!filter.fromDate) return "all";
    return toThailandDateInputValue(filter.fromDate).slice(0, 7);
  }, [filter.fromDate]);

  const handleMonthSelect = (value: string) => {
    if (value === "all") {
      handleFilterChange({ fromDate: undefined, toDate: undefined });
      return;
    }
    const selected = monthOptions.find((m) => m.value === value);
    if (selected) {
      handleFilterChange({
        fromDate: thailandDateBoundaryToUtcIso(selected.from),
        toDate: thailandDateBoundaryToUtcIso(selected.to, true),
      });
    }
  };
  const [editing, setEditing] = useState<TransactionResponse | null>(null);


  useEffect(() => {
    if (searchParams.get("action") === "new") {
      const id = requestAnimationFrame(() => {
        setEditing(null);
        setShowForm(true);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [searchParams]);

  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const { data: bankAccounts } = useBankAccounts();
  const { data: creditCards } = useCreditCards();
  const { data, isLoading } = useTransactions(filter, page, sortBy, sortDesc);
  const remove = useDeleteTransaction();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Multi-select & Bulk Delete state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const toggleSelectionMode = () => {
    setIsSelectionMode((prev) => {
      if (prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  };

  const toggleSelectItem = (id: number, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllCurrentPage = () => {
    if (!data?.items) return;
    const pageIds = data.items.map((i) => i.transactionId);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkDeleting(true);
    const count = selectedIds.size;
    const toastId = toast.loading(`กำลังลบ ${count} รายการ...`);
    try {
      const ids = Array.from(selectedIds);
      try {
        await apiClient.post("/api/v1/transactions/bulk-delete", { transactionIds: ids });
      } catch {
        await Promise.all(ids.map((id) => apiClient.delete(`/api/v1/transactions/${id}`)));
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
        queryClient.invalidateQueries({ queryKey: ["budgets"] }),
        queryClient.invalidateQueries({ queryKey: ["reports"] }),
      ]);
      toast.success(`ลบ ${count} รายการแล้ว`, { id: toastId });
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "ลบรายการไม่สำเร็จ", { id: toastId });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleFilterChange = (patch: Partial<TransactionFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const activeQuickPeriod = useMemo(() => {
    if (!filter.fromDate && !filter.toDate) return "all";
    if (!filter.fromDate || !filter.toDate) return "custom";

    const fromDateStr = toThailandDateInputValue(filter.fromDate);
    const toDateStr = toThailandDateInputValue(filter.toDate);

    const today = getTodayRange();
    if (fromDateStr === today.from && toDateStr === today.to) return "today";

    const week = getThisWeekRange();
    if (fromDateStr === week.from && toDateStr === week.to) return "week";

    const month = getThisMonthRange();
    if (fromDateStr === month.from && toDateStr === month.to) return "month";

    const year = getThisYearRange();
    if (fromDateStr === year.from && toDateStr === year.to) return "year";

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");
    const currentToday = toThailandDateInputValue(now);
    if (
      fromDateStr === `${currentYear}-${currentMonth}-01` &&
      (toDateStr === currentToday || toDateStr === month.to)
    ) {
      return "month";
    }

    return "custom";
  }, [filter.fromDate, filter.toDate]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter.type) count++;
    if (filter.categoryId !== undefined) count++;
    if (filter.tagId !== undefined) count++;
    if (filter.bankAccountId !== undefined) count++;
    if (filter.creditCardId !== undefined) count++;
    if (activeQuickPeriod === "custom") count++;
    if (sortBy !== "transactionDate" || !sortDesc) count++;
    return count;
  }, [filter, sortBy, sortDesc, activeQuickPeriod]);

   const { totalIncome, totalExpense, netBalance } = useMemo(() => {
    if (!data) return { totalIncome: 0, totalExpense: 0, netBalance: 0 };
    if (typeof data.totalIncome === "number" && typeof data.totalExpense === "number") {
      return {
        totalIncome: data.totalIncome,
        totalExpense: data.totalExpense,
        netBalance: data.netBalance ?? (data.totalIncome - data.totalExpense),
      };
    }
    let income = 0;
    let expense = 0;
    for (const item of data.items || []) {
      if (item.transactionType === "income") income += item.amount;
      else if (item.transactionType === "expense") expense += item.amount;
    }
    return { totalIncome: income, totalExpense: expense, netBalance: income - expense };
  }, [data]);

  const resetFilters = () => {
    setFilter({});
    setIsCustomDateMode(false);
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
        <div className="hidden sm:block">
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus />
            เพิ่มรายการ
          </Button>
        </div>
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
            : "บันทึกรายการรายรับ หรือรายจ่ายใหม่"
        }
      >
        <TransactionForm
          key={editing?.transactionId ?? "new"}
          onClose={() => { setShowForm(false); setEditing(null); }}
          editing={editing ?? undefined}
        />
      </BottomSheet>

            {/* Mobile: Compact Financial Pulse Bar (Single Row, ~60px, 3 Columns) */}
      <div className="mb-3.5 block sm:hidden">
        <div className="relative overflow-hidden rounded-xl border border-[var(--pw-hairline)]/70 bg-[var(--pw-surface)]/70 p-2.5 shadow-xs backdrop-blur-md">
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[var(--pw-hairline)]/60 text-[11px] text-[var(--pw-ink)]/60">
            <span className="font-medium">สรุปตามเงื่อนไข ({data?.totalItems ?? 0} รายการ)</span>
            <Link
              href="/reports"
              className="inline-flex items-center gap-0.5 text-[var(--pw-primary)] font-semibold hover:underline"
            >
              <span>ดูรายงานภาพรวม</span>
              <ChevronRight className="size-3" />
            </Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-[var(--pw-hairline)]/60 text-center">
            <div className="px-1">
              <p className="text-[10px] text-[var(--pw-ink)]/60">รายรับ</p>
              <p className="text-xs font-bold text-[var(--pw-green)] truncate">
                <AnimatedNumber value={totalIncome} prefix="+" />
              </p>
            </div>
            <div className="px-1">
              <p className="text-[10px] text-[var(--pw-ink)]/60">รายจ่าย</p>
              <p className="text-xs font-bold text-[var(--pw-expense)] truncate">
                <AnimatedNumber value={totalExpense} prefix="-" />
              </p>
            </div>
            <div className="px-1">
              <p className="text-[10px] text-[var(--pw-ink)]/60">คงเหลือ</p>
              <p className={cn("text-xs font-bold truncate", netBalance >= 0 ? "text-[var(--pw-ink)]" : "text-[var(--pw-expense)]")}>
                <AnimatedNumber value={netBalance} />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: 3 Distinct Cards (sm+) */}
      <div className="mb-4 hidden sm:grid sm:grid-cols-3 sm:gap-4">
        <div className="relative overflow-hidden rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/60 p-3 sm:p-4 shadow-xs backdrop-blur-xs transition hover:border-[var(--pw-green)]/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--pw-ink)]/70">รายรับรวมทั้งหมด</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--pw-green)]/15 text-[var(--pw-green)]">
              <ArrowUpRight className="size-4" />
            </div>
          </div>
          <p className="mt-1.5 text-lg font-bold sm:text-xl text-[var(--pw-green)]">
            <AnimatedNumber value={totalIncome} prefix="+" />
          </p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/60 p-3 sm:p-4 shadow-xs backdrop-blur-xs transition hover:border-[var(--pw-expense)]/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--pw-ink)]/70">รายจ่ายรวมทั้งหมด</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--pw-expense)]/15 text-[var(--pw-expense)]">
              <ArrowDownRight className="size-4" />
            </div>
          </div>
          <p className="mt-1.5 text-lg font-bold sm:text-xl text-[var(--pw-expense)]">
            <AnimatedNumber value={totalExpense} prefix="-" />
          </p>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/60 p-3 sm:p-4 shadow-xs backdrop-blur-xs transition hover:border-[var(--pw-primary)]/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--pw-ink)]/70">ยอดคงเหลือสุทธิ</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-[var(--pw-primary)]/15 text-[var(--pw-primary)]">
              <ReceiptText className="size-4" />
            </div>
          </div>
          <p className={cn("mt-1.5 text-lg font-bold sm:text-xl", netBalance >= 0 ? "text-[var(--pw-ink)]" : "text-[var(--pw-expense)]")}>
            <AnimatedNumber value={netBalance} />
          </p>
        </div>
      </div>

      {/* 1-Tap Quick Period Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar mb-3">
        <button
          type="button"
          onClick={() => handleFilterChange({ fromDate: undefined, toDate: undefined })}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer border active:scale-95",
            activeQuickPeriod === "all"
              ? "bg-[var(--pw-primary)] text-white border-[var(--pw-primary)] shadow-xs"
              : "bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)]/75 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]"
          )}
        >
          ทั้งหมด
        </button>
        <button
          type="button"
          onClick={() => {
            const today = getTodayRange();
            handleFilterChange({
              fromDate: thailandDateBoundaryToUtcIso(today.from),
              toDate: thailandDateBoundaryToUtcIso(today.to, true),
            });
          }}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer border active:scale-95",
            activeQuickPeriod === "today"
              ? "bg-[var(--pw-primary)] text-white border-[var(--pw-primary)] shadow-xs"
              : "bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)]/75 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]"
          )}
        >
          วันนี้
        </button>
        <button
          type="button"
          onClick={() => {
            const week = getThisWeekRange();
            handleFilterChange({
              fromDate: thailandDateBoundaryToUtcIso(week.from),
              toDate: thailandDateBoundaryToUtcIso(week.to, true),
            });
          }}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer border active:scale-95",
            activeQuickPeriod === "week"
              ? "bg-[var(--pw-primary)] text-white border-[var(--pw-primary)] shadow-xs"
              : "bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)]/75 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]"
          )}
        >
          สัปดาห์นี้
        </button>
        <button
          type="button"
          onClick={() => {
            const month = getThisMonthRange();
            handleFilterChange({
              fromDate: thailandDateBoundaryToUtcIso(month.from),
              toDate: thailandDateBoundaryToUtcIso(month.to, true),
            });
          }}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer border active:scale-95",
            activeQuickPeriod === "month"
              ? "bg-[var(--pw-primary)] text-white border-[var(--pw-primary)] shadow-xs"
              : "bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)]/75 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]"
          )}
        >
          เดือนนี้
        </button>
        <button
          type="button"
          onClick={() => {
            const year = getThisYearRange();
            handleFilterChange({
              fromDate: thailandDateBoundaryToUtcIso(year.from),
              toDate: thailandDateBoundaryToUtcIso(year.to, true),
            });
          }}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer border active:scale-95",
            activeQuickPeriod === "year"
              ? "bg-[var(--pw-primary)] text-white border-[var(--pw-primary)] shadow-xs"
              : "bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)]/75 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]"
          )}
        >
          ปีนี้
        </button>
      </div>

      {/* 1-Tap Quick Transaction Type Switcher */}
      <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--pw-surface-indigo)]/50 border border-[var(--pw-hairline)] mb-3">
        <button
          type="button"
          onClick={() => handleFilterChange({ type: undefined })}
          className={cn(
            "py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center",
            !filter.type
              ? "bg-[var(--pw-surface-raised)] text-[var(--pw-ink)] shadow-xs"
              : "text-[var(--pw-ink)]/65 hover:text-[var(--pw-ink)]"
          )}
        >
          ทั้งหมด
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange({ type: "expense" })}
          className={cn(
            "py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1",
            filter.type === "expense"
              ? "bg-[var(--pw-expense)] text-white shadow-xs font-bold"
              : "text-[var(--pw-ink)]/65 hover:text-[var(--pw-expense)]"
          )}
        >
          <ArrowDownRight className="size-3.5" />
          รายจ่าย
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange({ type: "income" })}
          className={cn(
            "py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center flex items-center justify-center gap-1",
            filter.type === "income"
              ? "bg-[var(--pw-green)] text-[var(--pw-on-green)] shadow-xs font-bold"
              : "text-[var(--pw-ink)]/65 hover:text-[var(--pw-green)]"
          )}
        >
          <ArrowUpRight className="size-3.5" />
          รายรับ
        </button>
      </div>

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
            variant="outline"
            className={cn(
              "shrink-0 relative gap-2 font-medium transition-all shadow-xs",
              activeFilterCount > 0
                ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] hover:bg-[var(--pw-primary)]/25 font-semibold"
                : "border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)] hover:bg-[var(--pw-surface-onyx)]",
            )}

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

          <Button
            type="button"
            variant={isSelectionMode ? "default" : "outline"}
            className={cn(
              "shrink-0 gap-1.5 font-medium transition-all shadow-xs",
              isSelectionMode
                ? "bg-[var(--pw-primary)] text-[var(--pw-on-primary)] hover:bg-[var(--pw-primary)]/90"
                : "border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)] hover:bg-[var(--pw-surface-onyx)]"
            )}
            onClick={toggleSelectionMode}
            aria-label={isSelectionMode ? "ยกเลิกโหมดเลือกหลายรายการ" : "เปิดโหมดเลือกหลายรายการ"}
          >
            <CheckSquare className="size-4" />
            <span className="hidden sm:inline">{isSelectionMode ? "เสร็จสิ้น" : "เลือกหลายรายการ"}</span>
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
            {(filter.fromDate || filter.toDate) && activeQuickPeriod === "custom" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2.5 py-1 text-[var(--pw-ink)]">
                <span>
                  ช่วงวันที่
                  {filter.fromDate && filter.toDate
                    ? `: ${toThailandDateInputValue(filter.fromDate)} ถึง ${toThailandDateInputValue(filter.toDate)}`
                    : filter.fromDate
                    ? `: ตั้งแต่ ${toThailandDateInputValue(filter.fromDate)}`
                    : `: ถึง ${toThailandDateInputValue(filter.toDate!)}`}
                </span>
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
        <div className="flex flex-col max-h-[75vh]">
          <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          <FormField label="ประเภทธุรกรรม" htmlFor="sheet-type-filter" className="w-full min-w-0">
            <div id="sheet-type-filter" className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label="กรองประเภทธุรกรรม">
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

          {/* Month Picker as Primary with Progressive Disclosure for Custom Dates */}
          {!isCustomDateMode ? (
            <div className="space-y-1.5">
              <FormField label="เลือกช่วงเดือน" htmlFor="sheet-month-filter" className="w-full min-w-0">
                <Select
                  value={
                    activeQuickPeriod === "all"
                      ? "all"
                      : monthOptions.some((m) => m.value === currentMonthValue)
                      ? currentMonthValue
                      : "custom"
                  }
                  onValueChange={(val) => {
                    if (val === "custom") {
                      setIsCustomDateMode(true);
                    } else {
                      handleMonthSelect(val);
                    }
                  }}
                >
                  <SelectTrigger id="sheet-month-filter" className="w-full">
                    <SelectValue placeholder="เลือกเดือน" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">ทุกช่วงเวลา (ทั้งหมด)</SelectItem>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                    {activeQuickPeriod === "custom" && (
                      <SelectItem value="custom">กำหนดช่วงวันที่เอง (กำลังใช้งาน)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormField>
              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsCustomDateMode(true)}
                  className="text-xs text-[var(--pw-primary)] hover:underline flex items-center gap-1 cursor-pointer font-medium py-0.5"
                >
                  <Calendar className="size-3.5" />
                  กำหนดช่วงวันที่เอง (ขั้นสูง)
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/30 p-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-semibold text-[var(--pw-ink)] flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-[var(--pw-primary)]" />
                  กำหนดช่วงวันที่เอง (วัน/เดือน/ปี)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomDateMode(false);
                    const thisMonth = getThisMonthRange();
                    handleFilterChange({
                      fromDate: thailandDateBoundaryToUtcIso(thisMonth.from),
                      toDate: thailandDateBoundaryToUtcIso(thisMonth.to, true),
                    });
                  }}
                  className="text-xs text-[var(--pw-primary)] hover:underline cursor-pointer font-medium"
                >
                  กลับไปเลือกรายเดือน
                </button>
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
            </div>
          )}

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

          </div>

          {/* Sticky Mobile-First Footer (Confirm Top, Reset Bottom) */}
          <div className="sticky bottom-0 bg-[var(--pw-surface)]/95 backdrop-blur-md pt-3 pb-1 border-t border-[var(--pw-hairline)]/50 mt-3 flex flex-col gap-2 z-10">
            <Button
              type="button"
              className="w-full h-11 text-sm font-semibold shadow-sm cursor-pointer"
              onClick={() => setShowFilterSheet(false)}
            >
              ดูรายการ ({data?.totalItems ?? 0})
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full h-9 text-xs text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] hover:bg-[var(--pw-surface-onyx)] cursor-pointer"
              onClick={resetFilters}
              disabled={activeFilterCount === 0}
            >
              ล้างค่าตัวกรองทั้งหมด
            </Button>
          </div>
        </div>
      </BottomSheet>

      {isLoading ? (
        <TransactionCardsSkeleton count={6} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="ยังไม่มีรายการธุรกรรม"
          description="บันทึกรายรับหรือรายจ่ายของคุณเพื่อเริ่มติดตามการเงินได้อย่างแม่นยำ"
          actionLabel="เพิ่มรายการแรก"
          actionIcon={Plus}
          onAction={() => {
            setEditing(null);
            setShowForm(true);
          }}
        />
      ) : (
        <div className="space-y-4">
          <AnimatedList key={`page-${page}-${sortBy}-${sortDesc}`} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((t) => (
              <AnimatedListItem key={t.transactionId}>
                {/* 1. Mobile Compact List Row (< sm) */}
                <div
                  onClick={() => {
                    if (deletingId === t.transactionId) return;
                    if (isSelectionMode) {
                      toggleSelectItem(t.transactionId);
                    } else {
                      setSelectedTransaction(t);
                    }
                  }}
                  className={cn(
                    "sm:hidden relative flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer backdrop-blur-xs gap-3 overflow-hidden",
                    deletingId === t.transactionId && "pointer-events-none opacity-60",
                    isSelectionMode && selectedIds.has(t.transactionId)
                      ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/10 ring-1 ring-[var(--pw-primary)]"
                      : "border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/60 hover:bg-[var(--pw-surface-raised)] active:scale-[0.98]"
                  )}
                >
                  {deletingId === t.transactionId && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-[var(--pw-surface)]/85 backdrop-blur-xs gap-2 text-xs font-semibold text-[var(--pw-expense)]">
                      <LoaderCircle className="size-4 animate-spin" />
                      <span>กำลังลบรายการ...</span>
                    </div>
                  )}

                  {isSelectionMode && (
                    <div
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                        selectedIds.has(t.transactionId)
                          ? "bg-[var(--pw-primary)] border-[var(--pw-primary)] text-white shadow-xs"
                          : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)]/50"
                      )}
                    >
                      {selectedIds.has(t.transactionId) && <Check className="size-3.5 stroke-[3]" />}
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      t.transactionType === "expense"
                        ? "bg-[var(--pw-expense)]/15 text-[var(--pw-expense)]"
                        : t.transactionType === "income"
                          ? "bg-[var(--pw-green)]/15 text-[var(--pw-green)]"
                          : "bg-[var(--pw-link)]/15 text-[var(--pw-link)]"
                    )}
                  >
                    {t.transactionType === "expense" ? (
                      <ArrowDownRight className="size-5" />
                    ) : t.transactionType === "income" ? (
                      <ArrowUpRight className="size-5" />
                    ) : (
                      <ReceiptText className="size-5" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sm text-[var(--pw-ink)]">
                      {t.description || "(ไม่ระบุรายละเอียด)"}
                    </p>
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--pw-ink)]/60 mt-0.5 truncate">
                      <span>{formatDisplayDate(t.transactionDate)}</span>
                      <span>•</span>
                      <span className="truncate">{t.categoryName ?? "ไม่มีหมวดหมู่"}</span>
                      {Boolean(t.bankAccountId || t.creditCardId) && (
                        <>
                          <span>•</span>
                          <span className="truncate">
                            {t.bankAccountName ??
                              t.creditCardName ??
                              bankAccounts?.find((b) => b.bankAccountId === t.bankAccountId)?.accountName ??
                              creditCards?.find((c) => c.creditCardId === t.creditCardId)?.cardName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={cn(
                        "text-sm font-bold block",
                        t.transactionType === "expense"
                          ? "text-[var(--pw-expense)]"
                          : t.transactionType === "income"
                            ? "text-[var(--pw-green)]"
                            : "text-[var(--pw-link)]"
                      )}
                    >
                      {t.transactionType === "expense" ? "-" : t.transactionType === "income" ? "+" : ""}
                      {formatCurrency(t.amount, t.currencyCode)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded inline-block mt-0.5",
                        t.transactionType === "expense"
                          ? "bg-[var(--pw-expense)]/10 text-[var(--pw-expense)]"
                          : t.transactionType === "income"
                            ? "bg-[var(--pw-green)]/10 text-[var(--pw-green)]"
                            : "bg-[var(--pw-link)]/10 text-[var(--pw-link)]"
                      )}
                    >
                      {t.transactionType === "expense" ? "รายจ่าย" : t.transactionType === "income" ? "รายรับ" : "โอน"}
                    </span>
                  </div>
                </div>

                {/* 2. Desktop Card Grid (>= sm) */}
                <div
                  onClick={() => {
                    if (isSelectionMode && deletingId !== t.transactionId) {
                      toggleSelectItem(t.transactionId);
                    }
                  }}
                  className={cn(
                    "hidden sm:flex relative flex-col justify-between rounded-lg border bg-[var(--pw-surface-raised)]/50 p-4 transition-all duration-200 backdrop-blur-xs h-full overflow-hidden",
                    isSelectionMode && "cursor-pointer hover:border-[var(--pw-primary)]/70",
                    !isSelectionMode && "hover:-translate-y-0.5 hover:shadow-md hover:bg-[var(--pw-surface-raised)]/80",
                    deletingId === t.transactionId && "pointer-events-none opacity-60",
                    isSelectionMode && selectedIds.has(t.transactionId)
                      ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/10 ring-2 ring-[var(--pw-primary)]/40"
                      : "border-[var(--pw-hairline)]",
                    t.transactionType === "expense"
                      ? "border-l-4 border-l-[var(--pw-expense)]"
                      : t.transactionType === "income"
                        ? "border-l-4 border-l-[var(--pw-green)]"
                        : "border-l-4 border-l-[var(--pw-link)]",
                  )}
                >
                  {deletingId === t.transactionId && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[var(--pw-surface)]/85 backdrop-blur-xs gap-1.5 text-xs font-semibold text-[var(--pw-expense)]">
                      <LoaderCircle className="size-5 animate-spin" />
                      <span>กำลังลบรายการ...</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        {isSelectionMode && (
                          <div
                            onClick={(e) => toggleSelectItem(t.transactionId, e)}
                            className={cn(
                              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border transition-colors cursor-pointer",
                              selectedIds.has(t.transactionId)
                                ? "bg-[var(--pw-primary)] border-[var(--pw-primary)] text-white shadow-xs"
                                : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)]/50 hover:border-[var(--pw-primary)]"
                            )}
                          >
                            {selectedIds.has(t.transactionId) && <Check className="size-3.5 stroke-[3]" />}
                          </div>
                        )}
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
                            {formatDisplayDateTime(t.transactionDate)}
                          </p>
                        </div>
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

                  {!isSelectionMode && (
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
                        pending={deletingId === t.transactionId}
                        onConfirm={() => {
                          setDeletingId(t.transactionId);
                          const toastId = toast.loading("กำลังลบรายการ...");
                          remove.mutate(t.transactionId, {
                            onSuccess: () => {
                              setDeletingId(null);
                              toast.success("ลบรายการแล้ว", { id: toastId });
                            },
                            onError: (e) => {
                              setDeletingId(null);
                              toast.error(e instanceof ApiError ? e.message : "ลบไม่สำเร็จ", { id: toastId });
                            },
                          });
                        }}
                        trigger={
                          <Button size="sm" variant="destructive" className="h-8 text-xs px-3" disabled={deletingId === t.transactionId}>
                            {deletingId === t.transactionId ? (
                              <LoaderCircle className="size-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="size-3.5" />
                            )}
                            {deletingId === t.transactionId ? "กำลังลบ..." : "ลบ"}
                          </Button>
                        }
                      />
                    </div>
                  )}
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
      {/* Mobile Transaction Details BottomSheet */}
      <BottomSheet
        open={selectedTransaction !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedTransaction(null);
        }}
        title="รายละเอียดรายการ"
        description="ข้อมูลและจัดการรายการธุรกรรม"
      >
        {selectedTransaction && (
          <div className="flex flex-col max-h-[75vh]">
            <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
              {/* Amount Banner */}
              <div
                className={cn(
                  "p-4 rounded-2xl border text-center flex flex-col items-center justify-center gap-1",
                  selectedTransaction.transactionType === "expense"
                    ? "bg-[var(--pw-expense)]/10 border-[var(--pw-expense)]/30 text-[var(--pw-expense)]"
                    : selectedTransaction.transactionType === "income"
                      ? "bg-[var(--pw-green)]/10 border-[var(--pw-green)]/30 text-[var(--pw-green)]"
                      : "bg-[var(--pw-link)]/10 border-[var(--pw-link)]/30 text-[var(--pw-link)]"
                )}
              >
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {selectedTransaction.transactionType === "expense"
                    ? "รายจ่าย"
                    : selectedTransaction.transactionType === "income"
                      ? "รายรับ"
                      : "โอน"}
                </span>
                <p className="text-3xl font-extrabold tracking-tight">
                  {selectedTransaction.transactionType === "expense" ? "-" : selectedTransaction.transactionType === "income" ? "+" : ""}
                  {formatCurrency(selectedTransaction.amount, selectedTransaction.currencyCode)}
                </p>
                <p className="text-xs text-[var(--pw-ink)]/70 mt-1">
                  {formatDisplayDateTime(selectedTransaction.transactionDate)}
                </p>
              </div>

              {/* Details List */}
              <div className="space-y-2.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/30 p-3.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[var(--pw-hairline)]">
                  <span className="text-[var(--pw-ink)]/60">รายละเอียด / ร้านค้า</span>
                  <span className="font-semibold text-[var(--pw-ink)] text-right">{selectedTransaction.description || "-"}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[var(--pw-hairline)]">
                  <span className="text-[var(--pw-ink)]/60">หมวดหมู่</span>
                  <span className="font-medium text-[var(--pw-ink)]">{selectedTransaction.categoryName ?? "ไม่มีหมวดหมู่"}</span>
                </div>
                {(selectedTransaction.bankAccountId || selectedTransaction.creditCardId) && (
                  <div className="flex justify-between items-center py-1 border-b border-[var(--pw-hairline)]">
                    <span className="text-[var(--pw-ink)]/60">ช่องทางชำระเงิน</span>
                    <span className="font-medium text-[var(--pw-ink)]">
                      {selectedTransaction.bankAccountName ??
                        selectedTransaction.creditCardName ??
                        bankAccounts?.find((b) => b.bankAccountId === selectedTransaction.bankAccountId)?.accountName ??
                        creditCards?.find((c) => c.creditCardId === selectedTransaction.creditCardId)?.cardName ??
                        "-"}
                    </span>
                  </div>
                )}
                {selectedTransaction.tags.length > 0 && (
                  <div className="flex justify-between items-center py-1 border-b border-[var(--pw-hairline)]">
                    <span className="text-[var(--pw-ink)]/60">แท็ก</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {selectedTransaction.tags.map((tag) => (
                        <span
                          key={tag.tagId}
                          className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] font-medium"
                        >
                          #{tag.tagName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center py-1">
                  <span className="text-[var(--pw-ink)]/60">ที่มาของข้อมูล</span>
                  <span className="font-medium text-[var(--pw-ink)]/80">
                    {selectedTransaction.sourceType === "slip"
                      ? "สลิปโอนเงิน"
                      : selectedTransaction.sourceType === "cardStatement"
                        ? "ใบแจ้งยอดบัตรเครดิต"
                        : "บันทึกเอง"}
                  </span>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer (Rule 5: Action on Top, Cancel/Destructive on Bottom) */}
            <div className="sticky bottom-0 bg-[var(--pw-surface)]/95 backdrop-blur-md pt-3 pb-1 border-t border-[var(--pw-hairline)]/50 mt-3 flex flex-col gap-2 z-10">
              <Button
                type="button"
                className="w-full h-11 text-sm font-semibold shadow-sm cursor-pointer"
                onClick={() => {
                  const itemToEdit = selectedTransaction;
                  setSelectedTransaction(null);
                  setTimeout(() => {
                    setEditing(itemToEdit);
                    setShowForm(true);
                  }, 150);
                }}
              >
                <Pencil className="size-4 mr-1.5" />
                แก้ไขรายการ
              </Button>

              <ConfirmDialog
                title="ลบรายการนี้?"
                description="การลบจะไม่สามารถย้อนกลับได้"
                confirmLabel="ลบ"
                pending={deletingId === selectedTransaction.transactionId}
                onConfirm={() => {
                  const id = selectedTransaction.transactionId;
                  setDeletingId(id);
                  const toastId = toast.loading("กำลังลบรายการ...");
                  remove.mutate(id, {
                    onSuccess: () => {
                      setDeletingId(null);
                      setSelectedTransaction(null);
                      toast.success("ลบรายการแล้ว", { id: toastId });
                    },
                    onError: (e) => {
                      setDeletingId(null);
                      toast.error(e instanceof ApiError ? e.message : "ลบไม่สำเร็จ", { id: toastId });
                    },
                  });
                }}
                trigger={
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deletingId === selectedTransaction.transactionId}
                    className="w-full h-11 text-sm font-semibold shadow-sm cursor-pointer"
                  >
                    {deletingId === selectedTransaction.transactionId ? (
                      <LoaderCircle className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-4 mr-1.5" />
                    )}
                    {deletingId === selectedTransaction.transactionId ? "กำลังลบ..." : "ลบรายการ"}
                  </Button>
                }
              />
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Floating Action Bar for Multi-Select Bulk Actions */}
      {isSelectionMode && (
        <div className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/95 p-3 sm:p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="flex size-6 sm:size-7 items-center justify-center rounded-full bg-[var(--pw-primary)] text-xs font-bold text-white shadow-xs">
                {selectedIds.size}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-[var(--pw-ink)]">
                เลือกแล้ว {selectedIds.size} รายการ
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 sm:h-9 text-xs"
                onClick={handleSelectAllCurrentPage}
              >
                {data?.items && data.items.length > 0 && data.items.every((i) => selectedIds.has(i.transactionId))
                  ? "ยกเลิกเลือกทั้งหมด"
                  : "เลือกทั้งหมดในหน้านี้"}
              </Button>

              <ConfirmDialog
                title={`ลบรายการที่เลือก ${selectedIds.size} รายการ?`}
                description="การลบจะไม่สามารถย้อนกลับได้ ข้อมูลธุรกรรมทั้งหมดที่เลือกจะถูกลบออกจากระบบอย่างถาวร"
                confirmLabel={isBulkDeleting ? "กำลังลบ..." : `ลบ ${selectedIds.size} รายการ`}
                pending={isBulkDeleting}
                onConfirm={handleBulkDelete}
                trigger={
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="h-8 sm:h-9 text-xs font-semibold gap-1.5 shadow-xs"
                    disabled={selectedIds.size === 0 || isBulkDeleting}
                  >
                    {isBulkDeleting ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    <span>ลบ {selectedIds.size > 0 ? `${selectedIds.size} รายการ` : ""}</span>
                  </Button>
                }
              />

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 sm:h-9 text-xs"
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedIds(new Set());
                }}
              >
                ยกเลิก
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
