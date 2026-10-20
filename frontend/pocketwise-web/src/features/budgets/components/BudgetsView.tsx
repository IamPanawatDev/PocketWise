"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useTags } from "@/features/tags/hooks/useTags";
import {
  useBudgetTracking,
  useBudgets,
  useCreateBudget,
  useDeleteBudget,
  useUpdateBudget,
} from "@/features/budgets/hooks/useBudgets";
import { budgetSchema, type BudgetFormValues } from "@/schemas/budget.schema";
import type { BudgetResponse } from "@/types/budget.types";
import { zodResolver } from "@/lib/zod-resolver";
import { ApiError } from "@/lib/api-client";
import { formatCurrency, toThailandDateInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DateInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";

const initialValues = (startDate = ""): BudgetFormValues => ({
  budgetName: "",
  scopeType: "total",
  categoryId: null,
  tagId: null,
  amountLimit: 0,
  periodType: "monthly",
  startDate,
  endDate: null,
  alertThresholdPercent: 80,
});

const scopeLabels = { total: "รวมทั้งหมด", category: "หมวดหมู่", tag: "แท็ก" };
const periodLabels = {
  weekly: "รายสัปดาห์",
  monthly: "รายเดือน",
  quarterly: "รายไตรมาส",
  yearly: "รายปี",
  custom: "กำหนดเอง",
};

export function BudgetsView() {
  const { data: budgets, isLoading, isError, error } = useBudgets();
  const { data: tracking } = useBudgetTracking();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const create = useCreateBudget();
  const update = useUpdateBudget();
  const remove = useDeleteBudget();
  const [editing, setEditing] = useState<BudgetResponse | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: initialValues(),
  });
  const scopeType = useWatch({ control, name: "scopeType" });

  useEffect(() => {
    reset(initialValues(toThailandDateInputValue(new Date())));
  }, [reset]);

  const resetForm = () => {
    setEditing(null);
    reset(initialValues(toThailandDateInputValue(new Date())));
  };

  const handleMutationError = (reason: unknown, fallbackMessage: string) => {
    if (reason instanceof ApiError && reason.code === "VALIDATION_ERROR" && reason.details?.length) {
      const fieldNames: Record<string, keyof BudgetFormValues> = {
        budgetname: "budgetName",
        scopetype: "scopeType",
        categoryid: "categoryId",
        tagid: "tagId",
        amountlimit: "amountLimit",
        periodtype: "periodType",
        startdate: "startDate",
        enddate: "endDate",
        alertthresholdpercent: "alertThresholdPercent",
      };
      let mapped = false;
      for (const detail of reason.details) {
        const fieldName = fieldNames[detail.field.replace(/[^a-z]/gi, "").toLowerCase()];
        if (!fieldName) continue;
        setError(fieldName, { type: "server", message: detail.message });
        mapped = true;
      }
      if (mapped) return;
    }

    toast.error(reason instanceof ApiError ? reason.message : fallbackMessage);
  };

  const onSubmit = (values: BudgetFormValues) => {
    const payload = {
      ...values,
      categoryId: values.scopeType === "category" ? values.categoryId : null,
      tagId: values.scopeType === "tag" ? values.tagId : null,
      endDate: values.endDate || null,
    };
    if (editing) {
      update.mutate(
        { id: editing.budgetId, body: { ...payload, isActive: editing.isActive } },
        {
          onSuccess: () => { resetForm(); toast.success("บันทึกงบแล้ว"); },
          onError: (reason) => handleMutationError(reason, "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { resetForm(); toast.success("เพิ่มงบแล้ว"); },
        onError: (reason) => handleMutationError(reason, "เพิ่มไม่สำเร็จ"),
      });
    }
  };

  const startEdit = (budget: BudgetResponse) => {
    setEditing(budget);
    reset({
      budgetName: budget.budgetName,
      scopeType: budget.scopeType,
      categoryId: budget.categoryId,
      tagId: budget.tagId,
      amountLimit: budget.amountLimit,
      periodType: budget.periodType,
      startDate: budget.startDate,
      endDate: budget.endDate,
      alertThresholdPercent: budget.alertThresholdPercent,
    });
  };

  const loadingMutation = create.isPending || update.isPending;
  const activeTracking = useMemo(() => tracking ?? [], [tracking]);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">งบประมาณ</h1>
      <p className="mb-6 text-sm text-[var(--pw-ink)]/65">ติดตามรายจ่ายในสกุลเงินหลักของคุณ และรับการแจ้งเตือนเมื่อใกล้ถึงวงเงิน</p>

      <Card className="mb-6 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">{editing ? "แก้ไขงบ" : "ตั้งงบใหม่"}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="ชื่องบ" htmlFor="budget-name" error={errors.budgetName?.message}>
              <Input id="budget-name" aria-invalid={!!errors.budgetName} {...register("budgetName")} />
            </FormField>
            <FormField label="ขอบเขต" htmlFor="budget-scope" error={errors.scopeType?.message}>
              <Controller
                control={control}
                name="scopeType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="budget-scope" aria-invalid={!!errors.scopeType}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total">รวมทั้งหมด</SelectItem>
                      <SelectItem value="category">ตามหมวดหมู่</SelectItem>
                      <SelectItem value="tag">ตามแท็ก</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>

            {scopeType === "category" && (
              <FormField label="หมวดหมู่" htmlFor="budget-category" error={errors.categoryId?.message}>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value == null ? "none" : String(field.value)}
                      onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))}
                    >
                      <SelectTrigger id="budget-category" aria-invalid={!!errors.categoryId}><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">เลือกหมวดหมู่</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.categoryId} value={String(category.categoryId)}>{category.categoryName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}
            {scopeType === "tag" && (
              <FormField label="แท็ก" htmlFor="budget-tag" error={errors.tagId?.message}>
                <Controller
                  control={control}
                  name="tagId"
                  render={({ field }) => (
                    <Select
                      value={field.value == null ? "none" : String(field.value)}
                      onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))}
                    >
                      <SelectTrigger id="budget-tag" aria-invalid={!!errors.tagId}><SelectValue placeholder="เลือกแท็ก" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">เลือกแท็ก</SelectItem>
                        {tags?.map((tag) => (
                          <SelectItem key={tag.tagId} value={String(tag.tagId)}>#{tag.tagName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            )}

            <FormField label="วงเงิน (สกุลเงินหลัก)" htmlFor="budget-amount" error={errors.amountLimit?.message}>
              <NumberInput id="budget-amount" min={0.01} step={0.01} aria-invalid={!!errors.amountLimit} {...register("amountLimit")} />
            </FormField>
            <FormField label="รอบงบ" htmlFor="budget-period" error={errors.periodType?.message}>
              <Controller
                control={control}
                name="periodType"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="budget-period" aria-invalid={!!errors.periodType}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                      <SelectItem value="monthly">รายเดือน</SelectItem>
                      <SelectItem value="quarterly">รายไตรมาส</SelectItem>
                      <SelectItem value="yearly">รายปี</SelectItem>
                      <SelectItem value="custom">กำหนดเอง</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="วันเริ่มต้น" htmlFor="budget-start-date" error={errors.startDate?.message}>
              <Controller
                control={control}
                name="startDate"
                render={({ field }) => <DateInput id="budget-start-date" value={field.value} onChange={field.onChange} aria-invalid={!!errors.startDate} />}
              />
            </FormField>
            <FormField label="วันสิ้นสุด (ไม่บังคับ)" htmlFor="budget-end-date" error={errors.endDate?.message}>
              <Controller
                control={control}
                name="endDate"
                render={({ field }) => <DateInput id="budget-end-date" value={field.value ?? ""} onChange={(value) => field.onChange(value || null)} aria-invalid={!!errors.endDate} />}
              />
            </FormField>
            <FormField label="แจ้งเตือนเมื่อใช้ถึง (%)" htmlFor="budget-threshold" error={errors.alertThresholdPercent?.message}>
              <NumberInput id="budget-threshold" min={1} max={100} step={1} aria-invalid={!!errors.alertThresholdPercent} {...register("alertThresholdPercent")} />
            </FormField>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={loadingMutation} className="w-full sm:w-auto">
              {loadingMutation ? <LoaderCircle className="animate-spin" /> : editing ? <Save /> : <Plus />}
              {editing ? "บันทึก" : "ตั้งงบ"}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={resetForm}>
                <X />
                ยกเลิก
              </Button>
            )}
          </div>
        </form>
      </Card>

      {isLoading ? (
        <p role="status" className="text-[var(--pw-ink)]/70">กำลังโหลดงบ...</p>
      ) : isError ? (
        <p role="alert" className="text-[var(--pw-expense)]">{error instanceof ApiError ? error.message : "โหลดงบไม่สำเร็จ"}</p>
      ) : !budgets?.length ? (
        <Card className="p-6 text-center text-[var(--pw-ink)]/65">ยังไม่มีงบประมาณ</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {budgets.map((budget) => {
            const current = activeTracking.find((item) => item.budgetId === budget.budgetId);
            const percent = current?.percentageUsed ?? 0;
            return (
              <Card key={budget.budgetId} className="space-y-4 p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="break-words font-bold">{budget.budgetName}</h2>
                    <p className="mt-1 text-sm text-[var(--pw-ink)]/60">
                      {scopeLabels[budget.scopeType]} · {periodLabels[budget.periodType]}
                      {budget.categoryName ? ` · ${budget.categoryName}` : ""}
                      {budget.tagName ? ` · #${budget.tagName}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => startEdit(budget)}><Pencil />แก้ไข</Button>
                    <ConfirmDialog
                      title="ลบงบนี้?"
                      description="งบจะถูกซ่อนจากรายการที่ใช้งานอยู่"
                      confirmLabel="ลบ"
                      pending={remove.isPending}
                      onConfirm={() => remove.mutate(budget.budgetId, {
                        onSuccess: () => toast.success("ลบงบแล้ว"),
                        onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "ลบไม่สำเร็จ"),
                      })}
                      trigger={<Button size="sm" variant="destructive" aria-label={`ลบงบ ${budget.budgetName}`}><Trash2 />ลบ</Button>}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                  <span>{formatCurrency(current?.spentAmount ?? 0, budget.currencyCode)} ใช้ไป</span>
                  <span>จาก {formatCurrency(budget.amountLimit, budget.currencyCode)}</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`ใช้วงเงินงบ ${budget.budgetName}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.max(0, percent))}
                  className="h-3 overflow-hidden rounded-full bg-[var(--pw-hairline)]"
                >
                  <div
                    className={current?.isOverLimit ? "h-full bg-[var(--pw-expense)]" : "h-full bg-[var(--pw-green)]"}
                    style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                  />
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-sm">
                  <span className={current?.isOverLimit ? "font-semibold text-[var(--pw-expense)]" : "text-[var(--pw-ink)]/70"}>
                    {percent.toFixed(2)}% · {current?.isOverLimit ? "เกินงบ" : "คงเหลือ"}
                  </span>
                  <span>{formatCurrency(current?.remainingAmount ?? budget.amountLimit, budget.currencyCode)}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
