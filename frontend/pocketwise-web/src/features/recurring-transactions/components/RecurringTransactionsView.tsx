"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useTags } from "@/features/tags/hooks/useTags";
import {
  useCreateRecurringTransaction,
  useDeleteRecurringTransaction,
  useRecurringTransactions,
  useUpdateRecurringTransaction,
} from "@/features/recurring-transactions/hooks/useRecurringTransactions";
import {
  recurringTransactionSchema,
  type RecurringTransactionFormValues,
} from "@/schemas/recurring-transaction.schema";
import type { RecurringTransactionResponse } from "@/types/recurring-transaction.types";
import { zodResolver } from "@/lib/zod-resolver";
import { ApiError } from "@/lib/api-client";
import {
  cn,
  formatDate,
  getReadableTextColor,
  toThailandDateInputValue,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardGridSkeleton } from "@/components/shared/Skeletons";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { DateInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  Check,
  Clock,
  Coins,
  LoaderCircle,
  Pencil,
  Plus,
  Repeat,
  Save,
  Tag as TagIcon,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";

const DAYS_OF_WEEK = [
  { day: 0, label: "อา.", full: "อาทิตย์" },
  { day: 1, label: "จ.", full: "จันทร์" },
  { day: 2, label: "อ.", full: "อังคาร" },
  { day: 3, label: "พ.", full: "พุธ" },
  { day: 4, label: "พฤ.", full: "พฤหัสบดี" },
  { day: 5, label: "ศ.", full: "ศุกร์" },
  { day: 6, label: "ส.", full: "เสาร์" },
];

const initialValues = (startDate = ""): RecurringTransactionFormValues => ({
  transactionType: "expense",
  amount: "" as unknown as number,
  description: "",
  categoryId: null,
  frequency: "monthly",
  intervalValue: 1,
  daysOfWeek: [],
  tagIds: [],
  startDate,
  endDate: null,
});

const frequencyLabels = {
  daily: "วัน",
  weekly: "สัปดาห์",
  monthly: "เดือน",
  quarterly: "ไตรมาส",
  yearly: "ปี",
  custom: "กำหนดเอง",
};

export function RecurringTransactionsView() {
  const { data, isLoading, isError, error } = useRecurringTransactions();
  const { data: categories } = useCategories();
  const { data: tags = [] } = useTags();
  const create = useCreateRecurringTransaction();
  const update = useUpdateRecurringTransaction();
  const remove = useDeleteRecurringTransaction();
  const [editing, setEditing] = useState<RecurringTransactionResponse | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RecurringTransactionFormValues>({
    resolver: zodResolver(recurringTransactionSchema),
    defaultValues: initialValues(),
  });

  const selectedFrequency = watch("frequency");
  const selectedDays = watch("daysOfWeek") ?? [];
  const selectedTagIds = watch("tagIds") ?? [];

  const stats = useMemo(() => {
    if (!data?.length) {
      return {
        monthlyExpenses: 0,
        monthlyIncomes: 0,
        netMonthly: 0,
        activeCount: 0,
        totalCount: 0,
        upcomingBills: [],
        upcomingTotal: 0,
      };
    }

    const todayStr = toThailandDateInputValue(new Date());
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = toThailandDateInputValue(next7Days);

    let monthlyExpenses = 0;
    let monthlyIncomes = 0;
    let activeCount = 0;
    const upcomingBills: (RecurringTransactionResponse & { daysLeft: number })[] = [];

    for (const item of data) {
      const isLive = item.isActive && (!item.endDate || item.endDate >= todayStr);
      if (!isLive) continue;

      activeCount++;

      let monthlyAmount = item.amount;
      const interval = Math.max(1, item.intervalValue || 1);
      switch (item.frequency) {
        case "daily":
          monthlyAmount = (item.amount * 30) / interval;
          break;
        case "weekly":
          monthlyAmount = (item.amount * 4.3333) / interval;
          break;
        case "monthly":
          monthlyAmount = item.amount / interval;
          break;
        case "quarterly":
          monthlyAmount = item.amount / (3 * interval);
          break;
        case "yearly":
          monthlyAmount = item.amount / (12 * interval);
          break;
        case "custom":
          if (item.daysOfWeek && item.daysOfWeek.length > 0) {
            monthlyAmount = item.amount * item.daysOfWeek.length * 4.3333;
          }
          break;
      }

      if (item.transactionType === "expense") {
        monthlyExpenses += monthlyAmount;
        if (item.nextRunAt) {
          const nextDate = new Date(item.nextRunAt);
          const nextDateStr = toThailandDateInputValue(nextDate);
          if (nextDateStr >= todayStr && nextDateStr <= next7DaysStr) {
            const nextMidnight = new Date(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()).getTime();
            const daysLeft = Math.max(0, Math.round((nextMidnight - todayMidnight) / (1000 * 60 * 60 * 24)));
            upcomingBills.push({ ...item, daysLeft });
          }
        }
      } else {
        monthlyIncomes += monthlyAmount;
      }
    }

    upcomingBills.sort((a, b) => new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime());
    const upcomingTotal = upcomingBills.reduce((sum, b) => sum + b.amount, 0);

    return {
      monthlyExpenses,
      monthlyIncomes,
      netMonthly: monthlyIncomes - monthlyExpenses,
      activeCount,
      totalCount: data.length,
      upcomingBills,
      upcomingTotal,
    };
  }, [data]);

  useEffect(() => {
    reset(initialValues(toThailandDateInputValue(new Date())));
  }, [reset]);

  const clearForm = () => {
    setEditing(null);
    reset(initialValues(toThailandDateInputValue(new Date())));
  };

  const closeForm = () => {
    clearForm();
    setIsFormOpen(false);
  };

  const toggleDayOfWeek = (day: number) => {
    const current = selectedDays;
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b);
    setValue("daysOfWeek", next, { shouldValidate: true });
  };

  const toggleTag = (tagId: number) => {
    const current = selectedTagIds;
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId];
    setValue("tagIds", next, { shouldValidate: true });
  };

  const onSubmit = (values: RecurringTransactionFormValues) => {
    const payload = {
      ...values,
      description: values.description || null,
      endDate: values.endDate || null,
      daysOfWeek: values.frequency === "custom" ? values.daysOfWeek : undefined,
      tagIds: values.tagIds ?? [],
    };
    if (editing) {
      update.mutate(
        {
          id: editing.recurringTransactionId,
          body: { ...payload, isActive: editing.isActive },
        },
        {
          onSuccess: () => {
            closeForm();
            toast.success("บันทึกรายการประจำแล้ว");
          },
          onError: (reason) =>
            toast.error(
              reason instanceof ApiError ? reason.message : "บันทึกไม่สำเร็จ"
            ),
        }
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          closeForm();
          toast.success("ตั้งรายการประจำแล้ว");
        },
        onError: (reason) =>
          toast.error(
            reason instanceof ApiError ? reason.message : "ตั้งรายการไม่สำเร็จ"
          ),
      });
    }
  };

  const startEdit = (item: RecurringTransactionResponse) => {
    setEditing(item);
    reset({
      transactionType: item.transactionType,
      amount: item.amount,
      description: item.description ?? "",
      categoryId: item.categoryId,
      frequency: item.frequency,
      intervalValue: item.intervalValue,
      daysOfWeek: item.daysOfWeek ?? [],
      tagIds: item.tags?.map((t) => t.tagId) ?? [],
      startDate: item.startDate,
      endDate: item.endDate,
    });
    setIsFormOpen(true);
  };

  const isSaving = create.isPending || update.isPending;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <Repeat className="size-6 text-[var(--pw-primary)]" />
            รายการประจำ
          </h1>
          <p className="mt-1 text-sm text-[var(--pw-ink)]/65">
            ระบบสร้างรายการรายรับหรือรายจ่ายเมื่อถึงกำหนดตามรอบที่ตั้งไว้
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            clearForm();
            setIsFormOpen(true);
          }}
        >
          <Plus />
          เพิ่มรายการประจำ
        </Button>
      </div>

      {/* Form in BottomSheet */}
      <BottomSheet
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
          else setIsFormOpen(true);
        }}
        title={editing ? "แก้ไขรายการประจำ" : "ตั้งรายการประจำใหม่"}
        description="ตั้งค่ารายการที่เกิดขึ้นเป็นประจำ เช่น ค่าเช่า ค่าบริการรายเดือน หรือเงินเดือน"
      >
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="ประเภท"
                htmlFor="recurring-type"
                error={errors.transactionType?.message}
              >
                <Controller
                  control={control}
                  name="transactionType"
                  render={({ field }) => (
                    <div
                      id="recurring-type"
                      className="grid grid-cols-2 gap-2"
                      role="radiogroup"
                      aria-label="ประเภทรายการประจำ"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={field.value === "expense"}
                        onClick={() => field.onChange("expense")}
                        className={cn(
                          "flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
                          field.value === "expense"
                            ? "border-[var(--pw-expense)] bg-[var(--pw-expense)] text-white shadow-sm"
                            : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-expense)] hover:text-[var(--pw-expense)]"
                        )}
                      >
                        <ArrowDownRight className="size-4" />
                        รายจ่าย
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={field.value === "income"}
                        onClick={() => field.onChange("income")}
                        className={cn(
                          "flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
                          field.value === "income"
                            ? "border-[var(--pw-green)] bg-[var(--pw-green)] text-[var(--pw-on-green)] font-semibold shadow-sm"
                            : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-green)] hover:text-[var(--pw-green)]"
                        )}
                      >
                        <ArrowUpRight className="size-4" />
                        รายรับ
                      </button>
                    </div>
                  )}
                />
              </FormField>
              <FormField
                label="จำนวนเงิน"
                htmlFor="recurring-amount"
                error={errors.amount?.message}
              >
                <NumberInput
                  id="recurring-amount"
                  min={0.01}
                  step={0.01}
                  placeholder="0"
                  {...register("amount")}
                />
              </FormField>
              <FormField
                label="รายละเอียด"
                htmlFor="recurring-description"
                error={errors.description?.message}
              >
                <Input
                  id="recurring-description"
                  placeholder="เช่น ค่าเช่าห้อง, Netflix, ค่าอาหารกลางวัน"
                  {...register("description")}
                />
              </FormField>
              <FormField label="หมวดหมู่" htmlFor="recurring-category">
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value == null ? "none" : String(field.value)}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? null : Number(value))
                      }
                    >
                      <SelectTrigger id="recurring-category">
                        <SelectValue placeholder="— ไม่ระบุ —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem
                            key={category.categoryId}
                            value={String(category.categoryId)}
                          >
                            {category.categoryName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField label="ความถี่" htmlFor="recurring-frequency">
                <Controller
                  control={control}
                  name="frequency"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="recurring-frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">รายวัน</SelectItem>
                        <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                        <SelectItem value="monthly">รายเดือน</SelectItem>
                        <SelectItem value="quarterly">รายไตรมาส</SelectItem>
                        <SelectItem value="yearly">รายปี</SelectItem>
                        <SelectItem value="custom">กำหนดเอง (เลือกวัน อ-ส)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              {selectedFrequency !== "custom" && (
                <FormField
                  label="ทุก ๆ (รอบ)"
                  htmlFor="recurring-interval"
                  error={errors.intervalValue?.message}
                >
                  <NumberInput
                    id="recurring-interval"
                    min={1}
                    step={1}
                    {...register("intervalValue")}
                  />
                </FormField>
              )}
              <FormField
                label="วันเริ่มต้น"
                htmlFor="recurring-start"
                error={errors.startDate?.message}
              >
                <Controller
                  control={control}
                  name="startDate"
                  render={({ field }) => (
                    <DateInput
                      id="recurring-start"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </FormField>
              <FormField
                label="วันสิ้นสุด (ไม่บังคับ)"
                htmlFor="recurring-end"
                error={errors.endDate?.message}
              >
                <Controller
                  control={control}
                  name="endDate"
                  render={({ field }) => (
                    <DateInput
                      id="recurring-end"
                      value={field.value ?? ""}
                      onChange={(value) => field.onChange(value || null)}
                    />
                  )}
                />
              </FormField>
            </div>

            {/* Custom Day of Week Selector */}
            {selectedFrequency === "custom" && (
              <FormField
                label="เลือกวันที่ต้องการบันทึก (อาทิตย์ - เสาร์)"
                htmlFor="recurring-days"
                error={errors.daysOfWeek?.message}
              >
                <div id="recurring-days" className="flex flex-wrap gap-2 pt-1">
                  {DAYS_OF_WEEK.map(({ day, label, full }) => {
                    const isSelected = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDayOfWeek(day)}
                        className={cn(
                          "flex h-9 min-w-10 items-center justify-center rounded-xl border px-3 text-xs font-semibold transition-all cursor-pointer select-none active:scale-95",
                          isSelected
                            ? "bg-[var(--pw-primary)] text-white border-[var(--pw-primary)] shadow-xs"
                            : "bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)]/75 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]"
                        )}
                        aria-pressed={isSelected}
                        title={`เลือกวัน${full}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </FormField>
            )}

            {/* Tag Selection */}
            {tags.length > 0 && (
              <FormField label="แท็ก (ไม่บังคับ)" htmlFor="recurring-tags">
                <div id="recurring-tags" className="flex flex-wrap gap-2 pt-1">
                  {tags.map((t) => {
                    const checked = selectedTagIds.includes(t.tagId);
                    const color = t.color ?? "#6366f1";
                    const textColor = getReadableTextColor(color);
                    return (
                      <button
                        key={t.tagId}
                        type="button"
                        onClick={() => toggleTag(t.tagId)}
                        style={
                          checked
                            ? { backgroundColor: color, color: textColor, borderColor: color }
                            : undefined
                        }
                        className={cn(
                          "inline-flex min-h-7 cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all select-none shadow-2xs active:scale-95",
                          checked
                            ? "ring-2 ring-[var(--pw-primary)]/40 shadow-xs"
                            : "border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)]/75 hover:bg-[var(--pw-surface-onyx)]"
                        )}
                      >
                        {checked && <Check className="size-3 stroke-[2.5]" />}
                        <TagIcon className="size-3 opacity-60" />
                        <span>#{t.tagName}</span>
                      </button>
                    );
                  })}
                </div>
              </FormField>
            )}

            <div className="flex flex-col gap-3 pt-3 border-t border-[var(--pw-hairline)] sm:flex-row-reverse sm:justify-start">
              <Button
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? (
                  <LoaderCircle className="animate-spin size-4 mr-1.5" />
                ) : editing ? (
                  <Save className="size-4 mr-1.5" />
                ) : (
                  <Plus className="size-4 mr-1.5" />
                )}
                {editing ? "บันทึกการแก้ไข" : "ตั้งรายการประจำ"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={closeForm}
                className="w-full sm:w-auto"
              >
                <X className="size-4 mr-1.5" />
                ยกเลิก
              </Button>
            </div>
          </form>
        </div>
      </BottomSheet>

      {/* Monthly Fixed Cost & Commitments Summary */}
      {!isLoading && !isError && Boolean(data?.length) && (
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Monthly Fixed Expenses */}
            <Card className="relative overflow-hidden border-[var(--pw-hairline)] bg-gradient-to-br from-rose-500/10 via-[var(--pw-surface-raised)]/70 to-[var(--pw-surface-raised)]/90 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--pw-ink)]/70">รายจ่ายคงที่ต่อเดือน</span>
                <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-500">
                  <TrendingDown className="size-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-rose-500">
                -<AnimatedNumber value={stats.monthlyExpenses} />
              </div>
              <p className="mt-1 text-[11px] text-[var(--pw-ink)]/50">
                เฉลี่ยคำนวณจากทุกรอบเวลา
              </p>
            </Card>

            {/* Monthly Recurring Income */}
            <Card className="relative overflow-hidden border-[var(--pw-hairline)] bg-gradient-to-br from-emerald-500/10 via-[var(--pw-surface-raised)]/70 to-[var(--pw-surface-raised)]/90 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--pw-ink)]/70">รายรับประจำต่อเดือน</span>
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                  <TrendingUp className="size-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-500">
                +<AnimatedNumber value={stats.monthlyIncomes} />
              </div>
              <p className="mt-1 text-[11px] text-[var(--pw-ink)]/50">
                เงินเดือนและรายรับประจำ
              </p>
            </Card>

            {/* Net Recurring Commitment */}
            <Card className="relative overflow-hidden border-[var(--pw-hairline)] bg-gradient-to-br from-blue-500/10 via-[var(--pw-surface-raised)]/70 to-[var(--pw-surface-raised)]/90 p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--pw-ink)]/70">ยอดภาระสุทธิต่อเดือน</span>
                <div className="flex size-8 items-center justify-center rounded-lg bg-blue-500/15 text-blue-500">
                  <Coins className="size-4" />
                </div>
              </div>
              <div className={cn("mt-2 text-2xl font-bold", stats.netMonthly >= 0 ? "text-emerald-500" : "text-rose-500")}>
                {stats.netMonthly >= 0 ? "+" : ""}<AnimatedNumber value={stats.netMonthly} />
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-[var(--pw-ink)]/60">
                <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>เปิดใช้งาน {stats.activeCount} จาก {stats.totalCount} รายการ</span>
              </div>
            </Card>
          </div>

          {/* Upcoming Bills in Next 7 Days Banner */}
          {stats.upcomingBills.length > 0 && (
            <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 shadow-xs backdrop-blur-md">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30 mt-0.5">
                    <CalendarClock className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-amber-500 dark:text-amber-400">
                        บิลครบกำหนดใน 7 วันนี้ ({stats.upcomingBills.length} รายการ)
                      </h2>
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-500 border border-amber-500/30">
                        รวม <AnimatedNumber value={stats.upcomingTotal} />
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--pw-ink)]/70">
                      เตรียมสำรองเงินสำหรับรายจ่ายประจำที่กำลังจะตัดรอบเร็ว ๆ นี้
                    </p>
                  </div>
                </div>
              </div>

              {/* Upcoming Bills Chips List */}
              <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-amber-500/15">
                {stats.upcomingBills.map((bill) => (
                  <div
                    key={bill.recurringTransactionId}
                    className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-[var(--pw-surface-raised)]/90 px-2.5 py-1.5 shadow-2xs text-xs backdrop-blur-xs"
                  >
                    <span className="font-semibold text-[var(--pw-ink)]">
                      {bill.description || bill.categoryName || "รายจ่ายประจำ"}
                    </span>
                    <span className="font-bold text-rose-500">
                      -<AnimatedNumber value={bill.amount} />
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px] font-medium border",
                        bill.daysLeft === 0
                          ? "bg-rose-500/15 text-rose-500 border-rose-500/30 animate-pulse font-bold"
                          : bill.daysLeft === 1
                          ? "bg-amber-500/15 text-amber-500 border-amber-500/30 font-semibold"
                          : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                      )}
                    >
                      {bill.daysLeft === 0
                        ? "วันนี้!"
                        : bill.daysLeft === 1
                        ? "พรุ่งนี้"
                        : "อีก " + bill.daysLeft + " วัน"}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Recurring Transactions List */}
      {isLoading ? (
        <CardGridSkeleton count={4} />
      ) : isError ? (
        <p role="alert" className="text-[var(--pw-expense)]">
          {error instanceof ApiError ? error.message : "โหลดรายการไม่สำเร็จ"}
        </p>
      ) : !data?.length ? (
        <EmptyState
          icon={Repeat}
          title="ยังไม่มีรายการประจำ"
          description="ตั้งค่ารายการบิล ค่าบริการ หรือรายรับประจำเพื่อบันทึกรายการอัตโนมัติล่วงหน้า"
          actionLabel="เพิ่มรายการประจำแรก"
          actionIcon={Plus}
          onAction={() => {
            reset(initialValues(toThailandDateInputValue(new Date())));
            setEditing(null);
            setIsFormOpen(true);
          }}
        />
      ) : (
        <AnimatedList className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.map((item) => {
            const todayStr = toThailandDateInputValue(new Date());
            const isLive = item.isActive && (!item.endDate || item.endDate >= todayStr);

            return (
              <AnimatedListItem key={item.recurringTransactionId}>
                <Card className="flex flex-col justify-between gap-4 p-4 sm:p-5 h-full transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/60">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                              item.transactionType === "expense"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {item.transactionType === "expense" ? (
                              <ArrowDownRight className="size-3" />
                            ) : (
                              <ArrowUpRight className="size-3" />
                            )}
                            {item.transactionType === "expense"
                              ? "รายจ่ายประจำ"
                              : "รายรับประจำ"}
                          </span>

                          {/* Live vs Offline Status Dot & Badge */}
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold border",
                              isLive
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                            )}
                          >
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                isLive ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                              )}
                            />
                            {isLive ? "Live" : "Offline"}
                          </span>
                        </div>

                        <h2 className="mt-2 break-words text-lg font-bold">
                          <AnimatedNumber value={item.amount} />
                        </h2>
                        <p className="text-sm text-[var(--pw-ink)]/70">
                          {item.description || "— ไม่ระบุรายละเอียด —"}
                        </p>
                        {item.categoryName && (
                          <p className="text-xs text-[var(--pw-ink)]/50 mt-0.5">
                            หมวดหมู่: {item.categoryName}
                          </p>
                        )}

                        {/* Tag Badges */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {item.tags.map((t) => (
                              <span
                                key={t.tagId}
                                style={{
                                  backgroundColor: `${t.color || "#6366f1"}15`,
                                  color: t.color || "#6366f1",
                                  borderColor: `${t.color || "#6366f1"}35`,
                                }}
                                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
                              >
                                <TagIcon className="size-2.5 opacity-60" />
                                #{t.tagName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Frequency Badge */}
                      <span className="rounded-full bg-[var(--pw-surface-indigo)] px-3 py-1 text-xs font-medium text-right shrink-0">
                        {item.frequency === "custom" && item.daysOfWeek?.length
                          ? `ทุกวัน ${item.daysOfWeek
                              .map(
                                (d) =>
                                  DAYS_OF_WEEK.find((x) => x.day === d)?.label ?? ""
                              )
                              .filter(Boolean)
                              .join(", ")}`
                          : `ทุก ${
                              item.intervalValue > 1
                                ? `${item.intervalValue} `
                                : ""
                            }${frequencyLabels[item.frequency]}`}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--pw-ink)]/60">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" />
                        รอบถัดไป: {formatDate(item.nextRunAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        เริ่ม: {formatDate(item.startDate)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        สิ้นสุด: {item.endDate ? formatDate(item.endDate) : "ไม่มีกำหนด"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 sm:flex-none"
                      onClick={() => startEdit(item)}
                    >
                      <Pencil />
                      แก้ไข
                    </Button>
                    <ConfirmDialog
                      title="ลบรายการประจำนี้?"
                      description="รายการธุรกรรมที่เคยถูกสร้างไปแล้วจะไม่ได้รับผลกระทบ"
                      confirmLabel="ลบ"
                      pending={remove.isPending}
                      onConfirm={() =>
                        remove.mutate(item.recurringTransactionId, {
                          onSuccess: () => toast.success("ลบรายการแล้ว"),
                          onError: (reason) =>
                            toast.error(
                              reason instanceof ApiError
                                ? reason.message
                                : "ลบไม่สำเร็จ"
                            ),
                        })
                      }
                      trigger={
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 sm:flex-none"
                        >
                          <Trash2 />
                          ลบ
                        </Button>
                      }
                    />
                  </div>
                </Card>
              </AnimatedListItem>
            );
          })}
        </AnimatedList>
      )}
    </div>
  );
}
