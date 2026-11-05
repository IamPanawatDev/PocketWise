"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { transactionSchema, type TransactionFormValues } from "@/schemas/transaction.schema";
import { zodResolver } from "@/lib/zod-resolver";
import { useCreateTransaction, useUpdateTransaction } from "@/features/transactions/hooks/useTransactions";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useTags } from "@/features/tags/hooks/useTags";
import { useBankAccounts } from "@/features/accounts/hooks/useBankAccounts";
import { useCreditCards } from "@/features/credit-cards/hooks/useCreditCards";
import { useUserSettings } from "@/features/settings/hooks/useSettings";
import { useCategorySuggestion } from "@/features/categorization/hooks/useCategorization";
import { ApiError } from "@/lib/api-client";
import { formatDisplayDateTime } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { DateTimeInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cn,
  getReadableTextColor,
  thailandDateTimeInputToUtcIso,
  toThailandDateTimeInputValue,
} from "@/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  Plus,
  Save,
  Sparkles,
  Tag as TagIcon,
  X,
} from "lucide-react";

interface QuickPreset {
  id: string;
  label: string;
  icon: string;
  amount: number;
  type: "expense" | "income" | "transfer";
  categoryMatch?: string;
  description: string;
}

const DEFAULT_PRESETS: QuickPreset[] = [
  { id: "coffee", label: "กาแฟ", icon: "☕", amount: 60, type: "expense", categoryMatch: "อาหาร", description: "กาแฟ" },
  { id: "lunch", label: "ข้าวกลางวัน", icon: "🍱", amount: 70, type: "expense", categoryMatch: "อาหาร", description: "ข้าวกลางวัน" },
  { id: "travel", label: "ค่าเดินทาง", icon: "🚇", amount: 45, type: "expense", categoryMatch: "เดินทาง", description: "ค่าเดินทาง" },
  { id: "groceries", label: "ของใช้", icon: "🛒", amount: 120, type: "expense", categoryMatch: "ของใช้", description: "ซื้อของใช้" },
  { id: "boba", label: "ชานม", icon: "🧋", amount: 50, type: "expense", categoryMatch: "อาหาร", description: "ชานม" },
];

function recordCategoryUsage(categoryId: number | null | undefined) {
  if (!categoryId) return;
  try {
    const raw = localStorage.getItem("pocketwise_frequent_categories");
    const map: Record<number, number> = raw ? JSON.parse(raw) : {};
    map[categoryId] = (map[categoryId] || 0) + 1;
    localStorage.setItem("pocketwise_frequent_categories", JSON.stringify(map));
  } catch {}
}

function saveRecentPreset(item: { label?: string; description?: string | null; amount: number; type: "expense" | "income" | "transfer"; categoryId?: number | null }) {
  if (!item.amount || item.amount <= 0) return;
  const label = item.description?.trim() || "รายการด่วน";
  const newPreset: QuickPreset = {
    id: `recent-${Date.now()}`,
    label: label.length > 10 ? `${label.slice(0, 10)}...` : label,
    icon: item.type === "expense" ? "💸" : "💰",
    amount: item.amount,
    type: item.type,
    description: item.description?.trim() || "",
  };

  try {
    const raw = localStorage.getItem("pocketwise_recent_presets");
    const current: QuickPreset[] = raw ? JSON.parse(raw) : [];
    const filtered = current.filter((p) => p.description !== newPreset.description || p.amount !== newPreset.amount);
    const updated = [newPreset, ...filtered].slice(0, 5);
    localStorage.setItem("pocketwise_recent_presets", JSON.stringify(updated));
  } catch {}
}

export function TransactionForm({
  onClose,
  editing,
}: {
  onClose: () => void;
  editing?: {
    transactionId: number;
    transactionType: string;
    amount: number;
    currencyCode: string;
    transactionDate: string;
    description: string | null;
    categoryId: number | null;
    bankAccountId: number | null;
    creditCardId: number | null;
    tags: { tagId: number }[];
  };
}) {
  const router = useRouter();

  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const { data: bankAccounts } = useBankAccounts();
  const { data: creditCards } = useCreditCards();
  const { data: settings } = useUserSettings();

  // UX State
  const [isCustomDateTime, setIsCustomDateTime] = useState(Boolean(editing));
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [showTagsSection, setShowTagsSection] = useState(Boolean(editing?.tags && editing.tags.length > 0));
  const [presets] = useState<QuickPreset[]>(() => {
    if (typeof window === "undefined") return DEFAULT_PRESETS;
    try {
      const saved = localStorage.getItem("pocketwise_recent_presets");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_PRESETS;
  });

  const defaultValues = useMemo<TransactionFormValues>(
    () => ({
      transactionType: (editing?.transactionType as TransactionFormValues["transactionType"]) ?? "expense",
      amount: (editing ? editing.amount : "") as unknown as number,
      currencyCode: editing?.currencyCode ?? settings?.currencyCode ?? "THB",
      transactionDate: editing ? toThailandDateTimeInputValue(editing.transactionDate) : "",
      description: editing?.description ?? "",
      categoryId: editing?.categoryId ?? null,
      bankAccountId: editing?.bankAccountId ?? null,
      creditCardId: editing?.creditCardId ?? null,
      tagIds: editing?.tags.map((t) => t.tagId) ?? [],
    }),
    [editing, settings?.currencyCode],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!isDirty) {
      reset(defaultValues);
    }
  }, [defaultValues, isDirty, reset]);

  const transactionType = useWatch({ control, name: "transactionType" });
  const selectedTagIds = useWatch({ control, name: "tagIds" });
  const currentBankAccountId = useWatch({ control, name: "bankAccountId" });
  const currentCreditCardId = useWatch({ control, name: "creditCardId" });

  useEffect(() => {
    if (!editing) {
      setValue("transactionDate", toThailandDateTimeInputValue(new Date()));
    }
  }, [editing, setValue]);

  // Auto-select payment method: works with saved preferences
  useEffect(() => {
    if (
      !editing &&
      (bankAccounts || creditCards) &&
      getValues("bankAccountId") == null &&
      getValues("creditCardId") == null
    ) {
      const lastMethod = typeof window !== "undefined" ? localStorage.getItem("pocketwise_last_payment_method") : null;
      if (lastMethod) {
        if (lastMethod === "none") {
          return;
        }
        if (lastMethod.startsWith("account-") && bankAccounts && bankAccounts.length > 0) {
          const id = Number(lastMethod.replace("account-", ""));
          if (bankAccounts.some((a) => a.bankAccountId === id)) {
            setValue("bankAccountId", id, { shouldDirty: false });
            return;
          }
        }
        if (lastMethod.startsWith("card-") && transactionType === "expense" && creditCards && creditCards.length > 0) {
          const id = Number(lastMethod.replace("card-", ""));
          if (creditCards.some((c) => c.creditCardId === id && c.isActive)) {
            setValue("creditCardId", id, { shouldDirty: false });
            return;
          }
        }
      }

      const lastUsed = typeof window !== "undefined" ? localStorage.getItem("pocketwise_last_bank_account_id") : null;
      if (bankAccounts && bankAccounts.length > 0) {
        const matched = lastUsed ? bankAccounts.find((a) => String(a.bankAccountId) === lastUsed) : null;
        const defaultAccount = matched ?? bankAccounts[0];
        setValue("bankAccountId", defaultAccount.bankAccountId, { shouldDirty: false });
      }
    }
  }, [bankAccounts, creditCards, editing, getValues, setValue, transactionType]);

  const paymentMethodValue = useMemo(() => {
    if (transactionType === "expense" && currentCreditCardId) {
      return `card-${currentCreditCardId}`;
    }
    if (currentBankAccountId) {
      return `account-${currentBankAccountId}`;
    }
    return "none";
  }, [currentBankAccountId, currentCreditCardId, transactionType]);

  const handlePaymentMethodChange = (value: string) => {
    if (value === "none") {
      setValue("bankAccountId", null, { shouldDirty: true });
      setValue("creditCardId", null, { shouldDirty: true });
      try {
        localStorage.setItem("pocketwise_last_payment_method", "none");
      } catch {}
    } else if (value.startsWith("account-")) {
      const id = Number(value.replace("account-", ""));
      setValue("bankAccountId", id, { shouldDirty: true });
      setValue("creditCardId", null, { shouldDirty: true });
      try {
        localStorage.setItem("pocketwise_last_payment_method", value);
        localStorage.setItem("pocketwise_last_bank_account_id", String(id));
      } catch {}
    } else if (value.startsWith("card-")) {
      const id = Number(value.replace("card-", ""));
      setValue("creditCardId", id, { shouldDirty: true });
      setValue("bankAccountId", null, { shouldDirty: true });
      try {
        localStorage.setItem("pocketwise_last_payment_method", value);
      } catch {}
    }
  };
  const selectedCategoryId = useWatch({ control, name: "categoryId" });
  const transactionDate = useWatch({ control, name: "transactionDate" });
  const description = useWatch({ control, name: "description" });
  const [debouncedDescription, setDebouncedDescription] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedDescription(description ?? ""), 300);
    return () => window.clearTimeout(timeout);
  }, [description]);

  const { data: categorySuggestion } = useCategorySuggestion(
    debouncedDescription,
    !editing && selectedCategoryId == null,
  );

  // Available categories filtered by active status and transaction type
  const availableCategories = useMemo(() => {
    if (!categories) return [];
    return categories.filter(
      (c) => c.isActive && (c.categoryType === "both" || c.categoryType === transactionType)
    );
  }, [categories, transactionType]);

  // Top categories for quick chips: Prioritizes user's most frequently used categories (including custom ones!)
  const quickCategories = useMemo(() => {
    if (!availableCategories || availableCategories.length === 0) return [];

    let frequencyMap: Record<number, number> = {};
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("pocketwise_frequent_categories") : null;
      if (raw) frequencyMap = JSON.parse(raw);
    } catch {}

    const sorted = [...availableCategories].sort((a, b) => {
      const countA = frequencyMap[a.categoryId] || 0;
      const countB = frequencyMap[b.categoryId] || 0;
      if (countA !== countB) {
        return countB - countA; // Higher frequency first
      }
      return a.sortOrder - b.sortOrder;
    });

    return sorted.slice(0, 6);
  }, [availableCategories]);

  // Selected category object (if outside top 6 quick categories)
  const outsideSelectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    if (quickCategories.some((c) => c.categoryId === selectedCategoryId)) return null;
    return availableCategories.find((c) => c.categoryId === selectedCategoryId) ?? null;
  }, [availableCategories, quickCategories, selectedCategoryId]);

  // Format date summary for progressive disclosure
  const displayDateSummary = useMemo(() => {
    if (!transactionDate) return "เวลาปัจจุบัน";
    try {
      return formatDisplayDateTime(transactionDate);
    } catch {
      return "เวลาปัจจุบัน";
    }
  }, [transactionDate]);

  // Apply Quick Preset
  const handleApplyPreset = (preset: QuickPreset) => {
    setValue("transactionType", preset.type, { shouldDirty: true });
    setValue("amount", preset.amount, { shouldDirty: true, shouldValidate: true });
    setValue("description", preset.description, { shouldDirty: true });

    if (availableCategories.length > 0) {
      const matched = availableCategories.find((c) =>
        c.categoryName.toLowerCase().includes(preset.categoryMatch?.toLowerCase() || "")
      );
      if (matched) {
        setValue("categoryId", matched.categoryId, { shouldDirty: true });
        recordCategoryUsage(matched.categoryId);
      }
    }

    toast.info(`เติมข้อมูล "${preset.label}" ${preset.amount} บาท`);
  };

  const handleSelectCategory = (catId: number | null) => {
    setValue("categoryId", catId, { shouldDirty: true });
    if (catId) {
      recordCategoryUsage(catId);
    }
  };

  const onSubmit = (values: TransactionFormValues) => {
    const payload = {
      ...values,
      categoryId: values.categoryId ?? null,
      bankAccountId: values.bankAccountId ?? null,
      creditCardId: values.creditCardId ?? null,
      transactionDate: thailandDateTimeInputToUtcIso(values.transactionDate),
    };

    if (values.categoryId) {
      recordCategoryUsage(values.categoryId);
    }

    if (values.creditCardId) {
      try {
        localStorage.setItem("pocketwise_last_payment_method", `card-${values.creditCardId}`);
      } catch {}
    } else if (values.bankAccountId) {
      try {
        localStorage.setItem("pocketwise_last_payment_method", `account-${values.bankAccountId}`);
        localStorage.setItem("pocketwise_last_bank_account_id", String(values.bankAccountId));
      } catch {}
    } else {
      try {
        localStorage.setItem("pocketwise_last_payment_method", "none");
      } catch {}
    }

    if (editing) {
      update.mutate(
        { id: editing.transactionId, body: payload },
        {
          onSuccess: () => {
            onClose();
            toast.success("บันทึกรายการแล้ว");
          },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: (res) => {
          saveRecentPreset({
            label: values.description || "รายการ",
            amount: Number(values.amount),
            type: values.transactionType,
            categoryId: values.categoryId,
            description: values.description || "",
          });
          onClose();
          if ((res as unknown as { isOfflineQueued?: boolean })?.isOfflineQueued) {
            toast.info("บันทึกรายการในโหมดออฟไลน์แล้ว — ข้อมูลจะซิงค์กับเซิร์ฟเวอร์อัตโนมัติเมื่อต่อเน็ต", {
              icon: "📡",
            });
          } else {
            toast.success("บันทึกรายการสำเร็จ", {
              action: {
                label: "ดูรายงาน →",
                onClick: () => {
                  router.push("/reports");
                },
              },
            });
          }
        },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "เพิ่มไม่สำเร็จ"),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* 1. Prominent AI Slip Scanner Card (ปุ่มสแกนสลิปเด่นชัด มองเห็นเป็นปุ่มกด 100%) */}
      {!editing && (
        <Link
          href="/imports"
          onClick={onClose}
          className="group relative flex items-center justify-between overflow-hidden rounded-xl border border-[var(--pw-primary)]/40 bg-gradient-to-r from-[var(--pw-primary)]/20 via-blue-500/15 to-indigo-500/15 p-3 text-xs font-medium transition-all hover:border-[var(--pw-primary)] hover:shadow-md hover:shadow-[var(--pw-primary)]/15 active:scale-[0.98] cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--pw-primary)] text-white shadow-sm transition-transform group-hover:scale-105">
              <Sparkles className="size-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-sm text-[var(--pw-ink)]">
                <span>สแกนสลิปโอนเงิน (AI)</span>
                <span className="rounded-full bg-[var(--pw-primary)] px-2 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                  แตะเพื่อสแกน
                </span>
              </div>
              <p className="text-[11px] text-[var(--pw-ink)]/70 mt-0.5">
                มีสลิปโอนเงิน? แตะที่นี่เพื่อให้อ่านยอดและลงรายการให้อัตโนมัติ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[var(--pw-primary)] font-semibold shrink-0">
            <span className="hidden sm:inline">ไปหน้าสแกน</span>
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
          </div>
        </Link>
      )}

      {/* Top Controls: Transaction Type Toggle (รายจ่าย / รายรับ) */}
      <div className="flex items-center justify-between gap-2">
        <Controller
          control={control}
          name="transactionType"
          render={({ field }) => (
            <div className="inline-flex rounded-lg bg-[var(--pw-surface-indigo)] p-1 border border-[var(--pw-hairline)] w-full sm:w-auto" role="radiogroup" aria-label="ประเภทธุรกรรม">
              <button
                type="button"
                role="radio"
                aria-checked={field.value === "expense"}
                onClick={() => field.onChange("expense")}
                className={cn(
                  "flex-1 sm:flex-initial flex h-8.5 items-center justify-center gap-1.5 rounded-md px-4 text-xs font-semibold transition-all cursor-pointer",
                  field.value === "expense"
                    ? "bg-[var(--pw-expense)] text-white shadow-xs"
                    : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]"
                )}
              >
                <ArrowDownRight className="size-3.5" />
                รายจ่าย
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={field.value === "income"}
                onClick={() => {
                  field.onChange("income");
                  setValue("creditCardId", null);
                }}
                className={cn(
                  "flex-1 sm:flex-initial flex h-8.5 items-center justify-center gap-1.5 rounded-md px-4 text-xs font-semibold transition-all cursor-pointer",
                  field.value === "income"
                    ? "bg-[var(--pw-green)] text-[var(--pw-on-green)] shadow-xs"
                    : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]"
                )}
              >
                <ArrowUpRight className="size-3.5" />
                รายรับ
              </button>
            </div>
          )}
        />
      </div>

      {/* Quick Presets Bar (รายการด่วนที่ใช้บ่อย) */}
      {!editing && presets.length > 0 && (
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-[var(--pw-ink)]/50">รายการด่วนที่ใช้บ่อย:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/70 px-2.5 py-1 text-xs text-[var(--pw-ink)]/85 transition-all hover:border-[var(--pw-primary)]/60 hover:bg-[var(--pw-surface-indigo)] active:scale-95 cursor-pointer shadow-2xs"
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
                <span className="font-semibold text-[var(--pw-ink)]">{preset.amount}฿</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hero Amount Input */}
      <FormField label="จำนวนเงิน (บาท) — รองรับสูตร เช่น 50+35" htmlFor="transaction-amount" error={errors.amount?.message}>
        <NumberInput
          id="transaction-amount"
          enableQuickMath={true}
          step="0.01"
          min="0.01"
          placeholder="0.00 (พิมพ์สูตร เช่น 50+35 ได้)"
          inputMode="decimal"
          prefixNode={<span className="text-xl font-bold text-[var(--pw-ink)]/50">฿</span>}
          className="h-14 text-2xl sm:text-3xl font-extrabold tracking-tight bg-[var(--pw-surface-black)]/35 border-[var(--pw-input-border)] focus:border-[var(--pw-primary)] rounded-[var(--pw-rounded-sm)]"
          {...register("amount")}
        />
      </FormField>

      {/* Quick Category Chips & Smart Learning (ดึงหมวดหมู่ที่ใช้บ่อยจริง/สร้างเองมาแสดง) */}
      <FormField label="หมวดหมู่" htmlFor="transaction-category" error={errors.categoryId?.message}>
        <div className="space-y-2">
          {/* Quick Chips Grid */}
          <div className="flex flex-wrap items-center gap-1.5">
            {quickCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.categoryId;
              return (
                <button
                  key={cat.categoryId}
                  type="button"
                  onClick={() => handleSelectCategory(isSelected ? null : cat.categoryId)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all active:scale-95 cursor-pointer border",
                    isSelected
                      ? "bg-[var(--pw-primary)] text-[var(--pw-on-primary)] border-[var(--pw-primary)] shadow-sm font-semibold scale-102"
                      : "bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/85 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:border-[var(--pw-primary)]/50"
                  )}
                >
                  {isSelected && <Check className="size-3 stroke-[3]" />}
                  <span>{cat.categoryName}</span>
                </button>
              );
            })}

            {/* If selected category is outside the top 6, display it prominently as an active chip */}
            {outsideSelectedCategory && (
              <button
                type="button"
                onClick={() => handleSelectCategory(null)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-[var(--pw-primary)] text-[var(--pw-on-primary)] border border-[var(--pw-primary)] shadow-sm scale-102 cursor-pointer"
              >
                <Check className="size-3 stroke-[3]" />
                <span>{outsideSelectedCategory.categoryName}</span>
              </button>
            )}

            {/* Toggle All Categories Dropdown */}
            <button
              type="button"
              onClick={() => setShowAllCategories((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium border border-dashed transition-all cursor-pointer",
                showAllCategories
                  ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/10 text-[var(--pw-primary)] font-semibold"
                  : "border-[var(--pw-hairline)] text-[var(--pw-ink)]/60 hover:text-[var(--pw-ink)] hover:border-[var(--pw-ink)]/40"
              )}
            >
              <Plus className="size-3" />
              <span>{showAllCategories ? "ซ่อนรายการทั้งหมด" : "หมวดหมู่อื่นๆ"}</span>
            </button>
          </div>

          {/* Full Category Select Dropdown */}
          {showAllCategories && (
            <div className="pt-1">
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select
                    value={field.value == null ? "none" : String(field.value)}
                    onValueChange={(value) => {
                      const id = value === "none" ? null : Number(value);
                      handleSelectCategory(id);
                    }}
                  >
                    <SelectTrigger id="transaction-category">
                      <SelectValue placeholder="— เลือกจากหมวดหมู่ทั้งหมด —" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                      {availableCategories.map((category) => (
                        <SelectItem key={category.categoryId} value={String(category.categoryId)}>
                          {category.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* AI Category Suggestion */}
          {categorySuggestion && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-[var(--pw-primary)] font-medium gap-1 px-2"
              onClick={() => handleSelectCategory(categorySuggestion.categoryId)}
            >
              <Sparkles className="size-3.5" />
              <span>ใช้คำแนะนำ: {categorySuggestion.categoryName ?? "หมวดหมู่"}</span>
            </Button>
          )}
        </div>
      </FormField>

      {/* Description / Payee Input */}
      <FormField label="รายละเอียด / หมายเหตุ" htmlFor="transaction-description" error={errors.description?.message}>
        <Input
          id="transaction-description"
          placeholder="เช่น ข้าวกลางวัน, 7-Eleven, BTS หมอชิต..."
          {...register("description")}
        />
      </FormField>

      {/* Date & Time: Progressive Disclosure */}
      <div className="space-y-1.5">
        {!isCustomDateTime ? (
          <div className="flex items-center justify-between rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 px-3 py-2 text-xs">
            <div className="flex items-center gap-2 text-[var(--pw-ink)]/75">
              <Calendar className="size-3.5 text-[var(--pw-primary)]" />
              <span>เวลา: <strong className="text-[var(--pw-ink)] font-semibold">{displayDateSummary}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomDateTime(true)}
              className="text-[var(--pw-link)] hover:underline font-medium cursor-pointer"
            >
              เปลี่ยนวันที่/เวลา
            </button>
          </div>
        ) : (
          <FormField label="วันที่และเวลา (ค.ศ. / เวลาไทย)" htmlFor="transaction-date" error={errors.transactionDate?.message}>
            <div className="space-y-1.5">
              <Controller
                control={control}
                name="transactionDate"
                render={({ field }) => (
                  <DateTimeInput
                    id="transaction-date"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setValue("transactionDate", toThailandDateTimeInputValue(new Date()), { shouldDirty: true });
                    setIsCustomDateTime(false);
                  }}
                  className="text-[11px] text-[var(--pw-ink)]/60 hover:text-[var(--pw-link)] cursor-pointer"
                >
                  รีเซ็ตเป็นปัจจุบัน & ซ่อน
                </button>
              </div>
            </div>
          </FormField>
        )}
      </div>

      {/* Consolidated Payment Method */}
      <FormField label="ช่องทางชำระเงิน" htmlFor="transaction-payment-method">
        <Select
          value={paymentMethodValue}
          onValueChange={handlePaymentMethodChange}
        >
          <SelectTrigger id="transaction-payment-method">
            <SelectValue placeholder="— เลือกช่องทางชำระเงิน —" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">💵 เงินสด / ไม่ระบุ</SelectItem>
            {bankAccounts && bankAccounts.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-xs font-semibold text-[var(--pw-ink)]/60 px-2 py-1.5">
                  🏦 บัญชีธนาคาร
                </SelectLabel>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.bankAccountId} value={`account-${account.bankAccountId}`}>
                    {account.accountName}{account.bankName ? ` (${account.bankName})` : ""}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {transactionType === "expense" && creditCards && creditCards.filter((card) => card.isActive).length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-xs font-semibold text-[var(--pw-ink)]/60 px-2 py-1.5">
                  💳 บัตรเครดิต
                </SelectLabel>
                {creditCards.filter((card) => card.isActive).map((card) => (
                  <SelectItem key={card.creditCardId} value={`card-${card.creditCardId}`}>
                    {card.cardName} · {card.bankName}
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </FormField>

      {/* Tags Section (Collapsible) */}
      {tags && tags.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={() => setShowTagsSection((prev) => !prev)}
            className="flex items-center gap-1.5 text-xs text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] cursor-pointer"
          >
            <TagIcon className="size-3.5" />
            <span className="font-medium">แท็ก</span>
            {selectedTagIds && selectedTagIds.length > 0 && (
              <span className="rounded-full bg-[var(--pw-primary)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--pw-primary)]">
                {selectedTagIds.length}
              </span>
            )}
            <ChevronDown className={cn("size-3 transition-transform", showTagsSection && "rotate-180")} />
          </button>

          {showTagsSection && (
            <div className="flex flex-wrap gap-2 pt-1">
              {tags.map((t) => {
                const checked = selectedTagIds?.includes(t.tagId) ?? false;
                const color = t.color ?? "#ec48bd";
                const textColor = getReadableTextColor(color);
                const isDarkText = textColor === "#000000";

                return (
                  <label
                    key={t.tagId}
                    className={cn(
                      "group inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all select-none shadow-2xs",
                      checked
                        ? "opacity-100 ring-2 ring-[var(--pw-link)] ring-offset-2 ring-offset-[var(--pw-canvas)] border-transparent"
                        : "opacity-65 hover:opacity-90 border-transparent",
                    )}
                    style={{
                      backgroundColor: color,
                      color: textColor,
                    }}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      aria-label={`เลือกแท็ก ${t.tagName}`}
                      onChange={(e) => {
                        const current = selectedTagIds ?? [];
                        const next = e.target.checked
                          ? [...current, t.tagId]
                          : current.filter((id) => id !== t.tagId);
                        setValue("tagIds", next);
                      }}
                    />
                    <span
                      className={cn(
                        "flex size-3.5 shrink-0 items-center justify-center rounded-[3px] border transition-all",
                        checked
                          ? isDarkText
                            ? "bg-black text-white border-black"
                            : "bg-white text-black border-white"
                          : isDarkText
                            ? "border-black/50 bg-black/10 group-hover:border-black/80"
                            : "border-white/60 bg-white/15 group-hover:border-white",
                      )}
                    >
                      {checked && <Check className="size-2.5 stroke-[3]" />}
                    </span>
                    <span>#{t.tagName}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons: Confirm on Top, Cancel Below (Mobile BottomSheet Standard) */}
      <div className="flex flex-col gap-2.5 pt-2 sm:flex-row-reverse sm:justify-start">
        <Button
          type="submit"
          className="w-full sm:w-auto font-semibold active:scale-[0.98] transition-transform"
          disabled={create.isPending || update.isPending}
        >
          {create.isPending || update.isPending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : editing ? (
            <Save className="size-4" />
          ) : (
            <Plus className="size-4" />
          )}
          {(create.isPending || update.isPending) ? "กำลังบันทึก..." : editing ? "บันทึกการแก้ไข" : "บันทึกรายการ"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full sm:w-auto active:scale-[0.98] transition-transform"
          onClick={onClose}
        >
          <X className="size-4" />
          ยกเลิก
        </Button>
      </div>
    </form>
  );
}
