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

  const onSubmit = (values: RecurringTransactionFormValues) => {
    const payload = { ...values, description: values.description || null, endDate: values.endDate || null };
    if (editing) {
      update.mutate(
        { id: editing.recurringTransactionId, body: { ...payload, isActive: editing.isActive } },
        {
          onSuccess: () => { clearForm(); toast.success("บันทึกรายการประจำแล้ว"); },
          onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { clearForm(); toast.success("ตั้งรายการประจำแล้ว"); },
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
  };

  const isSaving = create.isPending || update.isPending;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">รายการประจำ</h1>
      <p className="mb-6 text-sm text-[var(--pw-ink)]/65">ระบบสร้างรายการรายรับหรือรายจ่ายเมื่อถึงกำหนดตามรอบที่ตั้งไว้</p>

      <Card className="mb-6 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">{editing ? "แก้ไขรายการประจำ" : "ตั้งรายการประจำ"}</h2>
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
                        "flex h-10 cursor-pointer items-center justify-center rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
                        field.value === "expense"
                          ? "border-[var(--pw-expense)] bg-[var(--pw-expense)] text-white shadow-sm"
                          : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-expense)] hover:text-[var(--pw-expense)]",
                      )}
                    >
                      รายจ่าย
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={field.value === "income"}
                      onClick={() => field.onChange("income")}
                      className={cn(
                        "flex h-10 cursor-pointer items-center justify-center rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
                        field.value === "income"
                          ? "border-[var(--pw-green)] bg-[var(--pw-green)] text-black font-semibold shadow-sm"
                          : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-green)] hover:text-[var(--pw-green)]",
                      )}
                    >
                      รายรับ
                    </button>
                  </div>
                )}
              />
            </FormField>
            <FormField label="จำนวนเงิน" htmlFor="recurring-amount" error={errors.amount?.message}>
              <NumberInput id="recurring-amount" min={0.01} step={0.01} {...register("amount")} />
            </FormField>
            <FormField label="รายละเอียด" htmlFor="recurring-description" error={errors.description?.message}>
              <Input id="recurring-description" {...register("description")} />
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
            <FormField label="ความถี่" htmlFor="recurring-frequency" error={errors.frequency?.message}>
              <Controller control={control} name="frequency" render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="recurring-frequency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">วัน</SelectItem>
                    <SelectItem value="weekly">สัปดาห์</SelectItem>
                    <SelectItem value="monthly">เดือน</SelectItem>
                    <SelectItem value="quarterly">ไตรมาส</SelectItem>
                    <SelectItem value="yearly">ปี</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </FormField>
            <FormField label="ทุกกี่หน่วย" htmlFor="recurring-interval" error={errors.intervalValue?.message}>
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
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? <LoaderCircle className="animate-spin" /> : editing ? <Save /> : <Plus />}
              {editing ? "บันทึก" : "ตั้งรายการ"}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={clearForm}>
                <X />
                ยกเลิก
              </Button>
            )}
          </div>
        </form>
      </Card>

      {isLoading ? (
        <p role="status" className="text-[var(--pw-ink)]/70">กำลังโหลดรายการประจำ...</p>
      ) : isError ? (
        <p role="alert" className="text-[var(--pw-expense)]">{error instanceof ApiError ? error.message : "โหลดรายการไม่สำเร็จ"}</p>
      ) : !data?.length ? (
        <Card className="p-6 text-center text-[var(--pw-ink)]/65">ยังไม่มีรายการประจำ</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.map((item) => (
            <Card key={item.recurringTransactionId} className="space-y-3 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words font-bold">{item.description || item.categoryName || "รายการประจำ"}</h2>
                  <p className="mt-1 text-sm text-[var(--pw-ink)]/60">
                    {item.transactionType === "expense" ? "รายจ่าย" : "รายรับ"} · ทุก {item.intervalValue} {frequencyLabels[item.frequency]}
                  </p>
                </div>
                <span className="rounded-full bg-[var(--pw-surface-indigo)] px-3 py-1 text-xs">
                  {item.isActive ? "เปิดใช้งาน" : "หยุดชั่วคราว"}
                </span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(item.amount)}</p>
              <p className="text-sm text-[var(--pw-ink)]/65">
                เริ่ม {formatDate(item.startDate)} · ครั้งถัดไป {formatDateTime(item.nextRunAt)}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => startEdit(item)}><Pencil />แก้ไข</Button>
                <ConfirmDialog
                  title="ลบรายการประจำนี้?"
                  description="ระบบจะไม่สร้างรายการตามกำหนดนี้อีก"
                  confirmLabel="ลบ"
                  pending={remove.isPending}
                  onConfirm={() => remove.mutate(item.recurringTransactionId, {
                    onSuccess: () => toast.success("ลบรายการประจำแล้ว"),
                    onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "ลบไม่สำเร็จ"),
                  })}
                  trigger={<Button size="sm" variant="destructive" aria-label={`ลบ ${item.description ?? "รายการประจำ"}`}><Trash2 />ลบ</Button>}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
