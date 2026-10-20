"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { DateTimeInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  cn,
  getReadableTextColor,
  thailandDateTimeInputToUtcIso,
  toThailandDateTimeInputValue,
} from "@/lib/utils";
import { LoaderCircle, Plus, Save, Sparkles, X } from "lucide-react";

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
  const create = useCreateTransaction();
  const update = useUpdateTransaction();
  const { data: categories } = useCategories();
  const { data: tags } = useTags();
  const { data: bankAccounts } = useBankAccounts();
  const { data: creditCards } = useCreditCards();
  const { data: settings } = useUserSettings();

  const defaultValues = useMemo<TransactionFormValues>(
    () => ({
      transactionType: (editing?.transactionType as TransactionFormValues["transactionType"]) ?? "expense",
      amount: editing?.amount ?? 0,
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

  useEffect(() => {
    if (!editing) {
      setValue("transactionDate", toThailandDateTimeInputValue(new Date()));
    }
  }, [editing, setValue]);

  useEffect(() => {
    if (
      !editing &&
      bankAccounts?.length === 1 &&
      getValues("bankAccountId") == null
    ) {
      setValue("bankAccountId", bankAccounts[0].bankAccountId);
    }
  }, [bankAccounts, editing, getValues, setValue]);

  const selectedTagIds = useWatch({ control, name: "tagIds" });
  const transactionType = useWatch({ control, name: "transactionType" });
  const selectedCategoryId = useWatch({ control, name: "categoryId" });
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

  const onSubmit = (values: TransactionFormValues) => {
    const payload = {
      ...values,
      categoryId: values.categoryId ?? null,
      bankAccountId: values.bankAccountId ?? null,
      creditCardId: values.creditCardId ?? null,
      transactionDate: thailandDateTimeInputToUtcIso(values.transactionDate),
    };

    if (editing) {
      update.mutate(
        { id: editing.transactionId, body: payload },
        {
          onSuccess: () => { onClose(); toast.success("บันทึกรายการแล้ว"); },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { onClose(); toast.success("เพิ่มรายการแล้ว"); },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "เพิ่มไม่สำเร็จ"),
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="ประเภท" htmlFor="transaction-type" error={errors.transactionType?.message}>
            <Controller
              control={control}
              name="transactionType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                    if (value !== "expense") setValue("creditCardId", null);
                  }}
                >
                  <SelectTrigger id="transaction-type"><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">รายจ่าย</SelectItem>
                    <SelectItem value="income">รายรับ</SelectItem>
                    <SelectItem value="transfer">โอน</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          <FormField label="จำนวนเงิน" htmlFor="transaction-amount" error={errors.amount?.message}>
            <Input id="transaction-amount" type="number" step="0.01" {...register("amount")} />
          </FormField>

          <FormField label="วันที่และเวลา (ค.ศ. / เวลาไทย)" htmlFor="transaction-date" error={errors.transactionDate?.message}>
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
          </FormField>

          <FormField label="หมวดหมู่" htmlFor="transaction-category">
            <div className="space-y-2">
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
                    <SelectTrigger id="transaction-category"><SelectValue placeholder="— ไม่ระบุ —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category.categoryId} value={String(category.categoryId)}>
                          {category.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {categorySuggestion && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setValue("categoryId", categorySuggestion.categoryId)}
                >
                  <Sparkles />
                  ใช้คำแนะนำ: {categorySuggestion.categoryName ?? "หมวดหมู่"}
                </Button>
              )}
            </div>
          </FormField>

          <FormField label="บัญชี" htmlFor="transaction-account">
            <Controller
              control={control}
              name="bankAccountId"
              render={({ field }) => (
                <Select
                  value={field.value == null ? "none" : String(field.value)}
                  onValueChange={(value) => {
                    field.onChange(value === "none" ? null : Number(value));
                    if (value !== "none") setValue("creditCardId", null);
                  }}
                >
                  <SelectTrigger id="transaction-account"><SelectValue placeholder="— ไม่ระบุ —" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                    {bankAccounts?.map((account) => (
                      <SelectItem key={account.bankAccountId} value={String(account.bankAccountId)}>
                        {account.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>

          {transactionType === "expense" && (
            <FormField label="บัตรเครดิต" htmlFor="transaction-credit-card">
              <Controller
                control={control}
                name="creditCardId"
                render={({ field }) => (
                  <Select
                    value={field.value == null ? "none" : String(field.value)}
                    onValueChange={(value) => {
                      field.onChange(value === "none" ? null : Number(value));
                      if (value !== "none") setValue("bankAccountId", null);
                    }}
                  >
                    <SelectTrigger id="transaction-credit-card"><SelectValue placeholder="— ไม่ระบุ —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                      {creditCards?.filter((card) => card.isActive).map((card) => (
                        <SelectItem key={card.creditCardId} value={String(card.creditCardId)}>
                          {card.cardName} · {card.bankName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}

          <FormField label="แท็ก" error={errors.tagIds?.message}>
            <div className="flex flex-wrap gap-2">
              {tags?.map((t) => {
                const checked = selectedTagIds?.includes(t.tagId) ?? false;
                const color = t.color ?? "#ec48bd";
                return (
                  <label
                    key={t.tagId}
                    className={cn(
                      "inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[var(--pw-rounded-pill)] border border-[var(--pw-ink)]/20 px-3 py-1.5 text-sm transition-opacity hover:opacity-90",
                      checked &&
                        "ring-2 ring-[var(--pw-link)] ring-offset-2 ring-offset-[var(--pw-surface-indigo)]",
                    )}
                    style={{
                      backgroundColor: color,
                      color: getReadableTextColor(color),
                    }}
                  >
                    <input
                      type="checkbox"
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
                    <span>#{t.tagName}</span>
                  </label>
                );
              })}
            </div>
          </FormField>
        </div>

        <FormField label="รายละเอียด" htmlFor="transaction-description" error={errors.description?.message}>
          <Input id="transaction-description" {...register("description")} />
        </FormField>

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button type="submit" className="w-full sm:w-auto" disabled={create.isPending || update.isPending}>
            {create.isPending || update.isPending
              ? <LoaderCircle className="animate-spin" />
              : editing ? <Save /> : <Plus />}
            {editing ? "บันทึก" : "เพิ่มรายการ"}
          </Button>
          <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={onClose}>
            <X />
            ยกเลิก
          </Button>
        </div>
      </form>

  );
}
