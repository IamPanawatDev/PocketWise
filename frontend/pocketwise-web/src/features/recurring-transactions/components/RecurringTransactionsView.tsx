"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCategories } from "@/features/categories/hooks/useCategories";
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
import { cn, formatCurrency, formatDate, formatDateTime, toThailandDateInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  LoaderCircle,
  Pencil,
  Plus,
  Repeat,
  Save,
  Trash2,
  X,
} from "lucide-react";

const initialValues = (startDate = ""): RecurringTransactionFormValues => ({
  transactionType: "expense",
  amount: 0,
  description: "",
  categoryId: null,
  frequency: "monthly",
  intervalValue: 1,
  startDate,
  endDate: null,
});

const frequencyLabels = {
  daily: "วัน",
  weekly: "สัปดาห์",
  monthly: "เดือน",
  quarterly: "ไตรมาส",
  yearly: "ปี",
};

export function RecurringTransactionsView() {
  const { data, isLoading, isError, error } = useRecurringTransactions();
  const { data: categories } = useCategories();
  const create = useCreateRecurringTransaction();
  const update = useUpdateRecurringTransaction();
  const remove = useDeleteRecurringTransaction();
  const [editing, setEditing] = useState<RecurringTransactionResponse | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { register, control, handleSubmit, reset, formState: { errors } } =
    useForm<RecurringTransactionFormValues>({
      resolver: zodResolver(recurringTransactionSchema),
      defaultValues: initialValues(),
    });

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

  const onSubmit = (values: RecurringTransactionFormValues) => {
    const payload = { ...values, description: values.description || null, endDate: values.endDate || null };
    if (editing) {
      update.mutate(
        { id: editing.recurringTransactionId, body: { ...payload, isActive: editing.isActive } },
        {
          onSuccess: () => {
            closeForm();
            toast.success("บันทึกรายการประจำแล้ว");
          },
          onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          closeForm();
          toast.success("ตั้งรายการประจำแล้ว");
        },
        onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "ตั้งรายการไม่สำเร็จ"),
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
              <FormField label="ประเภท" htmlFor="recurring-type" error={errors.transactionType?.message}>
                <Controller
                  control={control}
                  name="transactionType"
                  render={({ field }) => (
                    <div id="recurring-type" className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="ประเภทรายการประจำ">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={field.value === "expense"}
                        onClick={() => field.onChange("expense")}
                        className={cn(
                          "flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
                          field.value === "expense"
                            ? "border-[var(--pw-expense)] bg-[var(--pw-expense)] text-white shadow-sm"
                            : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-expense)] hover:text-[var(--pw-expense)]",
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
                            ? "border-[var(--pw-green)] bg-[var(--pw-green)] text-black font-semibold shadow-sm"
                            : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-green)] hover:text-[var(--pw-green)]",
                        )}
                      >
                        <ArrowUpRight className="size-4" />
                        รายรับ
                      </button>
                    </div>
                  )}
                />
              </FormField>
              <FormField label="จำนวนเงิน" htmlFor="recurring-amount" error={errors.amount?.message}>
                <NumberInput id="recurring-amount" min={0.01} step={0.01} placeholder="0.00" {...register("amount")} />
              </FormField>
              <FormField label="รายละเอียด" htmlFor="recurring-description" error={errors.description?.message}>
                <Input id="recurring-description" placeholder="เช่น ค่าเช่าห้อง, Netflix, ค่าสมาชิกรายเดือน" {...register("description")} />
              </FormField>
              <FormField label="หมวดหมู่" htmlFor="recurring-category">
                <Controller control={control} name="categoryId" render={({ field }) => (
                  <Select
                    value={field.value == null ? "none" : String(field.value)}
                    onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))}
                  >
                    <SelectTrigger id="recurring-category"><SelectValue placeholder="— ไม่ระบุ —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category.categoryId} value={String(category.categoryId)}>{category.categoryName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="ความถี่" htmlFor="recurring-frequency">
                <Controller control={control} name="frequency" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="recurring-frequency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">รายวัน</SelectItem>
                      <SelectItem value="weekly">รายสัปดาห์</SelectItem>
                      <SelectItem value="monthly">รายเดือน</SelectItem>
                      <SelectItem value="quarterly">รายไตรมาส</SelectItem>
                      <SelectItem value="yearly">รายปี</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="ทุก ๆ (รอบ)" htmlFor="recurring-interval" error={errors.intervalValue?.message}>
                <NumberInput id="recurring-interval" min={1} step={1} {...register("intervalValue")} />
              </FormField>
              <FormField label="วันเริ่มต้น" htmlFor="recurring-start" error={errors.startDate?.message}>
                <Controller control={control} name="startDate" render={({ field }) => (
                  <DateInput id="recurring-start" value={field.value} onChange={field.onChange} />
                )} />
              </FormField>
              <FormField label="วันสิ้นสุด (ไม่บังคับ)" htmlFor="recurring-end" error={errors.endDate?.message}>
                <Controller control={control} name="endDate" render={({ field }) => (
                  <DateInput id="recurring-end" value={field.value ?? ""} onChange={(value) => field.onChange(value || null)} />
                )} />
              </FormField>
            </div>
            <div className="flex flex-col gap-3 pt-3 border-t border-[var(--pw-hairline)] sm:flex-row-reverse sm:justify-start">
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                {isSaving ? (
                  <LoaderCircle className="animate-spin size-4 mr-1.5" />
                ) : editing ? (
                  <Save className="size-4 mr-1.5" />
                ) : (
                  <Plus className="size-4 mr-1.5" />
                )}
                {editing ? "บันทึกการแก้ไข" : "ตั้งรายการประจำ"}
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm} className="w-full sm:w-auto">
                <X className="size-4 mr-1.5" />
                ยกเลิก
              </Button>
            </div>
          </form>
        </div>
      </BottomSheet>

      {/* Recurring Transactions List */}
      {isLoading ? (
        <p role="status" className="text-[var(--pw-ink)]/70">กำลังโหลดรายการ...</p>
      ) : isError ? (
        <p role="alert" className="text-[var(--pw-expense)]">{error instanceof ApiError ? error.message : "โหลดรายการไม่สำเร็จ"}</p>
      ) : !data?.length ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Repeat className="mb-2 size-10 opacity-35 text-[var(--pw-primary)]" />
          <p className="font-medium text-[var(--pw-ink)]">ยังไม่มีรายการประจำ</p>
          <p className="mt-1 text-xs text-[var(--pw-ink)]/60">
            กดปุ่ม &quot;เพิ่มรายการประจำ&quot; ด้านบนเพื่อตั้งค่ารายการอัตโนมัติตามรอบเวลา
          </p>
        </Card>
      ) : (
        <AnimatedList className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.map((item) => (
            <AnimatedListItem key={item.recurringTransactionId}>
              <Card className="flex flex-col justify-between gap-4 p-4 sm:p-5 h-full">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      item.transactionType === "expense"
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    }`}>
                      {item.transactionType === "expense" ? <ArrowDownRight className="size-3" /> : <ArrowUpRight className="size-3" />}
                      {item.transactionType === "expense" ? "รายจ่ายประจำ" : "รายรับประจำ"}
                    </span>
                    <h2 className="mt-2 break-words text-lg font-bold">
                      <AnimatedNumber value={item.amount} />
                    </h2>
                    <p className="text-sm text-[var(--pw-ink)]/70">{item.description || "— ไม่ระบุรายละเอียด —"}</p>
                    {item.categoryName && <p className="text-xs text-[var(--pw-ink)]/50">หมวดหมู่: {item.categoryName}</p>}
                  </div>
                  <span className="rounded-full bg-[var(--pw-surface-indigo)] px-3 py-1 text-xs font-medium">
                    ทุก {item.intervalValue > 1 ? `${item.intervalValue} ` : ""}{frequencyLabels[item.frequency]}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--pw-ink)]/60">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3.5" />
                    รอบถัดไป: {formatDate(item.nextRunAt)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1 sm:flex-none" onClick={() => startEdit(item)}><Pencil />แก้ไข</Button>
                <ConfirmDialog
                  title="ลบรายการประจำนี้?"
                  description="รายการธุรกรรมที่เคยถูกสร้างไปแล้วจะไม่ได้รับผลกระทบ"
                  confirmLabel="ลบ"
                  pending={remove.isPending}
                  onConfirm={() => remove.mutate(item.recurringTransactionId, {
                    onSuccess: () => toast.success("ลบรายการแล้ว"),
                    onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "ลบไม่สำเร็จ"),
                  })}
                  trigger={<Button size="sm" variant="destructive" className="flex-1 sm:flex-none"><Trash2 />ลบ</Button>}
                />
              </div>
            </Card>
          </AnimatedListItem>
          ))}
        </AnimatedList>
      )}
    </div>
  );
}
