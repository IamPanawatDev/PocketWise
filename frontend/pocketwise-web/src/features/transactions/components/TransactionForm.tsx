"use client";

import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { transactionSchema, type TransactionFormValues } from "@/schemas/transaction.schema";
import { zodResolver } from "@/lib/zod-resolver";
import { useCreateTransaction, useUpdateTransaction } from "@/features/transactions/hooks/useTransactions";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useTags } from "@/features/tags/hooks/useTags";
import { useBankAccounts } from "@/features/accounts/hooks/useBankAccounts";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { Card } from "@/components/ui/card";
import { toLocalDateTimeInputValue } from "@/lib/utils";

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

  const defaultValues = useMemo<TransactionFormValues>(
    () => ({
      transactionType: (editing?.transactionType as TransactionFormValues["transactionType"]) ?? "expense",
      amount: editing?.amount ?? 0,
      currencyCode: editing?.currencyCode ?? "THB",
      transactionDate: editing ? toLocalDateTimeInputValue(editing.transactionDate) : "",
      description: editing?.description ?? "",
      categoryId: editing?.categoryId ?? null,
      bankAccountId: editing?.bankAccountId ?? null,
      creditCardId: editing?.creditCardId ?? null,
      tagIds: editing?.tags.map((t) => t.tagId) ?? [],
    }),
    [editing],
  );

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues,
  });

  useEffect(() => {
    if (!editing) {
      setValue("transactionDate", toLocalDateTimeInputValue(new Date().toISOString()));
    }
  }, [editing, setValue]);

  const selectedTagIds = useWatch({ control, name: "tagIds" });

  const onSubmit = (values: TransactionFormValues) => {
    const payload = {
      ...values,
      categoryId: values.categoryId ?? null,
      bankAccountId: values.bankAccountId ?? null,
      creditCardId: values.creditCardId ?? null,
      transactionDate: new Date(values.transactionDate).toISOString(),
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
    <Card className="mb-6">
      <h2 className="mb-4 text-lg font-bold">
        {editing ? "แก้ไขรายการ" : "เพิ่มรายการ"}
      </h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>ประเภท</Label>
            <Select {...register("transactionType")}>
              <option value="expense">รายจ่าย</option>
              <option value="income">รายรับ</option>
              <option value="transfer">โอน</option>
            </Select>
            <FieldError message={errors.transactionType?.message} />
          </div>

          <div>
            <Label>จำนวนเงิน</Label>
            <Input type="number" step="0.01" {...register("amount")} />
            <FieldError message={errors.amount?.message} />
          </div>

          <div>
            <Label>วันที่</Label>
            <Input type="datetime-local" {...register("transactionDate")} />
            <FieldError message={errors.transactionDate?.message} />
          </div>

          <div>
            <Label>หมวดหมู่</Label>
            <Select {...register("categoryId", { setValueAs: (v) => (v ? Number(v) : null) })}>
              <option value="">— ไม่ระบุ —</option>
              {categories?.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>บัญชี</Label>
            <Select {...register("bankAccountId", { setValueAs: (v) => (v ? Number(v) : null) })}>
              <option value="">— ไม่ระบุ —</option>
              {bankAccounts?.map((a) => (
                <option key={a.bankAccountId} value={a.bankAccountId}>
                  {a.accountName}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>แท็ก</Label>
            <div className="flex flex-wrap gap-2">
              {tags?.map((t) => {
                const checked = selectedTagIds?.includes(t.tagId) ?? false;
                return (
                  <label key={t.tagId} className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const current = selectedTagIds ?? [];
                        const next = e.target.checked
                          ? [...current, t.tagId]
                          : current.filter((id) => id !== t.tagId);
                        setValue("tagIds", next);
                      }}
                    />
                    {t.tagName}
                  </label>
                );
              })}
            </div>
            <FieldError message={errors.tagIds?.message} />
          </div>
        </div>

        <div>
          <Label>รายละเอียด</Label>
          <Input {...register("description")} />
          <FieldError message={errors.description?.message} />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={create.isPending || update.isPending}>
            {editing ? "บันทึก" : "เพิ่มรายการ"}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            ยกเลิก
          </Button>
        </div>
      </form>
    </Card>
  );
}
