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
import { TiltCard } from "@/components/ui/tilt-card";
import { CardGridSkeleton } from "@/components/shared/Skeletons";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Calendar, CreditCard, LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";

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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreditCardFormValues>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: emptyValues,
  });

  const clearForm = () => {
    setEditing(null);
    reset(emptyValues);
  };

  const closeForm = () => {
    clearForm();
    setIsFormOpen(false);
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
          onSuccess: () => {
            closeForm();
            toast.success("บันทึกบัตรแล้ว");
          },
          onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          closeForm();
          toast.success("เพิ่มบัตรแล้ว");
        },
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
    setIsFormOpen(true);
  };

  const isSaving = create.isPending || update.isPending;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <CreditCard className="size-6 text-[var(--pw-primary)]" />
            บัตรเครดิต
          </h1>
          <p className="mt-1 text-sm text-[var(--pw-ink)]/65">
            ลงทะเบียนบัตรเพื่อผูกกับรายการรายจ่ายและดูสรุปตามบัตร
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
          เพิ่มบัตรเครดิต
        </Button>
      </div>

      {/* Form in BottomSheet */}
      <BottomSheet
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
          else setIsFormOpen(true);
        }}
        title={editing ? "แก้ไขบัตรเครดิต" : "เพิ่มบัตรเครดิตใหม่"}
        description="ลงทะเบียนบัตรเครดิตเพื่อใช้ติดตามยอดใช้จ่ายและรอบบิล"
      >
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="ชื่อบัตร" htmlFor="credit-card-name" error={errors.cardName?.message}>
                <Input id="credit-card-name" placeholder="เช่น KBank Passion, SCB Ultra Platinum" {...register("cardName")} />
              </FormField>
              <FormField label="ธนาคาร" htmlFor="credit-card-bank" error={errors.bankName?.message}>
                <Input id="credit-card-bank" placeholder="เช่น กสิกรไทย, ไทยพาณิชย์" {...register("bankName")} />
              </FormField>
              <FormField label="เลขบัตรที่ปกปิดแล้ว" htmlFor="credit-card-number" error={errors.cardNumberMasked?.message}>
                <Input id="credit-card-number" placeholder="**** **** **** 1234 หรือ 1234" {...register("cardNumberMasked")} />
              </FormField>
              <FormField label="วงเงิน (ไม่บังคับ)" htmlFor="credit-card-limit" error={errors.creditLimit?.message}>
                <NumberInput id="credit-card-limit" min={0} step={0.01} placeholder="0" {...register("creditLimit")} />
              </FormField>
              <FormField label="วันสรุปยอด (1–31)" htmlFor="credit-card-billing" error={errors.billingDay?.message}>
                <NumberInput id="credit-card-billing" min={1} max={31} step={1} placeholder="เช่น 25" {...register("billingDay")} />
              </FormField>
              <FormField label="วันครบกำหนดชำระ (1–31)" htmlFor="credit-card-due" error={errors.paymentDueDay?.message}>
                <NumberInput id="credit-card-due" min={1} max={31} step={1} placeholder="เช่น 15" {...register("paymentDueDay")} />
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
                {editing ? "บันทึกการแก้ไข" : "เพิ่มบัตรเครดิต"}
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm} className="w-full sm:w-auto">
                <X className="size-4 mr-1.5" />
                ยกเลิก
              </Button>
            </div>
          </form>
        </div>
      </BottomSheet>

      {/* Cards List */}
      {isLoading ? (
        <CardGridSkeleton count={4} columns="grid-cols-1 sm:grid-cols-2" type="creditCard" />
      ) : isError ? (
        <p role="alert" className="text-[var(--pw-expense)]">{error instanceof ApiError ? error.message : "โหลดบัตรไม่สำเร็จ"}</p>
      ) : !data?.length ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <CreditCard className="mb-2 size-10 opacity-35 text-[var(--pw-primary)]" />
          <p className="font-medium text-[var(--pw-ink)]">ยังไม่มีบัตรเครดิต</p>
          <p className="mt-1 text-xs text-[var(--pw-ink)]/60">
            กดปุ่ม &quot;เพิ่มบัตรเครดิต&quot; ด้านบนเพื่อเริ่มติดตามยอดใช้จ่าย
          </p>
        </Card>
      ) : (
        <AnimatedList className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.map((card) => (
            <AnimatedListItem key={card.creditCardId}>
              <div className="flex flex-col gap-3 h-full">
                <TiltCard className="relative overflow-hidden rounded-2xl p-5 text-white shadow-xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 border border-white/15 min-h-[170px] flex flex-col justify-between transition-transform">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-400/20 via-transparent to-purple-500/20 pointer-events-none" />
                  
                  <div className="relative z-10 flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-white/70 font-medium">{card.bankName}</p>
                      <h3 className="text-lg font-bold tracking-tight text-white mt-0.5">{card.cardName}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-6 rounded bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 shadow-inner border border-amber-300/40 relative overflow-hidden flex items-center justify-center">
                        <div className="w-full h-px bg-amber-900/40 absolute top-2" />
                        <div className="w-full h-px bg-amber-900/40 absolute bottom-2" />
                        <div className="h-full w-px bg-amber-900/40" />
                      </div>
                      <CreditCard className="size-5 text-white/75" />
                    </div>
                  </div>

                  <div className="relative z-10 my-3">
                    <p className="font-mono text-base tracking-widest text-white/90 drop-shadow-sm">
                      {card.cardNumberMasked || "•••• •••• •••• ••••"}
                    </p>
                  </div>

                  <div className="relative z-10 flex items-end justify-between pt-2 text-xs text-white/80 border-t border-white/10">
                    <div>
                      <span className="text-[10px] text-white/50 block">วงเงินบัตร</span>
                      <span className="font-semibold text-white">
                        {card.creditLimit != null ? (
                          <AnimatedNumber value={card.creditLimit} />
                        ) : (
                          "ไม่จำกัดวงเงิน"
                        )}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-white/50 block">รอบบิล / กำหนดชำระ</span>
                      <span>วันที่ {card.billingDay ?? "-"} / {card.paymentDueDay ?? "-"}</span>
                    </div>
                  </div>
                </TiltCard>

                <div className="flex gap-2 justify-end px-1">
                  <Button size="sm" variant="secondary" className="flex-1 sm:flex-none text-xs" onClick={() => startEdit(card)}><Pencil className="size-3.5" />แก้ไข</Button>
                  <ConfirmDialog
                    title="ลบบัตรนี้?"
                    description="บัตรจะถูกทำเครื่องหมายว่าไม่ใช้งาน รายการธุรกรรมเดิมยังคงอยู่"
                    confirmLabel="ลบ"
                    pending={remove.isPending}
                    onConfirm={() => remove.mutate(card.creditCardId, {
                      onSuccess: () => toast.success("ลบบัตรแล้ว"),
                      onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "ลบไม่สำเร็จ"),
                    })}
                    trigger={<Button size="sm" variant="destructive" className="flex-1 sm:flex-none text-xs"><Trash2 className="size-3.5" />ลบ</Button>}
                  />
                </div>
              </div>
          </AnimatedListItem>
          ))}
        </AnimatedList>
      )}
    </div>
  );
}
