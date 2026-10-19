"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  useCreateCreditCard,
  useCreditCards,
  useDeleteCreditCard,
  useUpdateCreditCard,
} from "@/features/credit-cards/hooks/useCreditCards";
import { creditCardSchema, type CreditCardFormValues } from "@/schemas/credit-card.schema";
import type { CreditCardResponse } from "@/types/credit-card.types";
import { zodResolver } from "@/lib/zod-resolver";
import { ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";

const emptyValues: CreditCardFormValues = {
  bankName: "",
  cardName: "",
  cardNumberMasked: null,
  billingDay: null,
  paymentDueDay: null,
  creditLimit: null,
};

export function CreditCardsView() {
  const { data, isLoading, isError, error } = useCreditCards();
  const create = useCreateCreditCard();
  const update = useUpdateCreditCard();
  const remove = useDeleteCreditCard();
  const [editing, setEditing] = useState<CreditCardResponse | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreditCardFormValues>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: emptyValues,
  });

  const clearForm = () => {
    setEditing(null);
    reset(emptyValues);
  };

  const onSubmit = (values: CreditCardFormValues) => {
    const payload = {
      ...values,
      cardNumberMasked: values.cardNumberMasked?.trim() || null,
    };
    if (editing) {
      update.mutate(
        { id: editing.creditCardId, body: { ...payload, isActive: editing.isActive } },
        {
          onSuccess: () => { clearForm(); toast.success("บันทึกบัตรแล้ว"); },
          onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { clearForm(); toast.success("เพิ่มบัตรแล้ว"); },
        onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "เพิ่มไม่สำเร็จ"),
      });
    }
  };

  const startEdit = (card: CreditCardResponse) => {
    setEditing(card);
    reset({
      bankName: card.bankName,
      cardName: card.cardName,
      cardNumberMasked: card.cardNumberMasked,
      billingDay: card.billingDay,
      paymentDueDay: card.paymentDueDay,
      creditLimit: card.creditLimit,
    });
  };

  const isSaving = create.isPending || update.isPending;

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">บัตรเครดิต</h1>
      <p className="mb-6 text-sm text-[var(--pw-ink)]/65">ลงทะเบียนบัตรเพื่อผูกกับรายการรายจ่ายและดูสรุปตามบัตร</p>

      <Card className="mb-6 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">{editing ? "แก้ไขบัตร" : "เพิ่มบัตรเครดิต"}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="ชื่อบัตร" htmlFor="credit-card-name" error={errors.cardName?.message}>
              <Input id="credit-card-name" {...register("cardName")} />
            </FormField>
            <FormField label="ธนาคาร" htmlFor="credit-card-bank" error={errors.bankName?.message}>
              <Input id="credit-card-bank" {...register("bankName")} />
            </FormField>
            <FormField label="เลขบัตรที่ปกปิดแล้ว" htmlFor="credit-card-number" error={errors.cardNumberMasked?.message}>
              <Input id="credit-card-number" placeholder="**** **** **** 1234" {...register("cardNumberMasked")} />
            </FormField>
            <FormField label="วงเงิน (ไม่บังคับ)" htmlFor="credit-card-limit" error={errors.creditLimit?.message}>
              <Input id="credit-card-limit" type="number" min="0" step="0.01" {...register("creditLimit")} />
            </FormField>
            <FormField label="วันสรุปยอด (1–31)" htmlFor="credit-card-billing" error={errors.billingDay?.message}>
              <Input id="credit-card-billing" type="number" min="1" max="31" {...register("billingDay")} />
            </FormField>
            <FormField label="วันครบกำหนดชำระ (1–31)" htmlFor="credit-card-due" error={errors.paymentDueDay?.message}>
              <Input id="credit-card-due" type="number" min="1" max="31" {...register("paymentDueDay")} />
            </FormField>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
              {isSaving ? <LoaderCircle className="animate-spin" /> : editing ? <Save /> : <Plus />}
              {editing ? "บันทึก" : "เพิ่มบัตร"}
            </Button>
            {editing && <Button type="button" variant="ghost" onClick={clearForm}><X />ยกเลิก</Button>}
          </div>
        </form>
      </Card>

      {isLoading ? (
        <p role="status" className="text-[var(--pw-ink)]/70">กำลังโหลดบัตร...</p>
      ) : isError ? (
        <p role="alert" className="text-[var(--pw-expense)]">{error instanceof ApiError ? error.message : "โหลดบัตรไม่สำเร็จ"}</p>
      ) : !data?.length ? (
        <Card className="p-6 text-center text-[var(--pw-ink)]/65">ยังไม่มีบัตรเครดิต</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {data.map((card) => (
            <Card key={card.creditCardId} className="space-y-4 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="break-words font-bold">{card.cardName}</h2>
                  <p className="text-sm text-[var(--pw-ink)]/65">{card.bankName}</p>
                  {card.cardNumberMasked && <p className="mt-1 text-sm tracking-wider">{card.cardNumberMasked}</p>}
                </div>
                <span className="rounded-full bg-[var(--pw-surface-indigo)] px-3 py-1 text-xs">
                  {card.isActive ? "ใช้งาน" : "ปิดใช้งาน"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <p>วงเงิน: {card.creditLimit == null ? "—" : formatCurrency(card.creditLimit)}</p>
                <p>วันสรุปยอด: {card.billingDay ?? "—"}</p>
                <p>วันครบกำหนด: {card.paymentDueDay ?? "—"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => startEdit(card)}><Pencil />แก้ไข</Button>
                <ConfirmDialog
                  title="ลบบัตรนี้?"
                  description="บัตรจะถูกซ่อน แต่รายการเดิมจะยังคงอยู่"
                  confirmLabel="ลบ"
                  pending={remove.isPending}
                  onConfirm={() => remove.mutate(card.creditCardId, {
                    onSuccess: () => toast.success("ลบบัตรแล้ว"),
                    onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "ลบไม่สำเร็จ"),
                  })}
                  trigger={<Button size="sm" variant="destructive" aria-label={`ลบบัตร ${card.cardName}`}><Trash2 />ลบ</Button>}
                />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
