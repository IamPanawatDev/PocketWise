"use client";

import { useEffect, useState, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { transferSchema, type TransferFormValues } from "@/schemas/transfer.schema";
import { zodResolver } from "@/lib/zod-resolver";
import { useCreateTransfer, useTransfers } from "@/features/transfers/hooks/useTransfers";
import { useBankAccounts } from "@/features/accounts/hooks/useBankAccounts";
import { ApiError } from "@/lib/api-client";
import {
  thailandDateTimeInputToUtcIso,
  toThailandDateTimeInputValue,
} from "@/lib/utils";
import { formatDisplayDateTime } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { DateTimeInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { NumberInput } from "@/components/ui/number-input";
import { BottomSheet, BottomSheetFooter } from "@/components/ui/bottom-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { CardGridSkeleton } from "@/components/shared/Skeletons";
import {
  ArrowRight,
  ArrowRightLeft,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Clock,
  LoaderCircle,
  Plus,
  Repeat,
  Send,
  Wallet,
  X,
} from "lucide-react";
import type { TransferResponse } from "@/types/transfer.types";

export function TransfersView() {
  const { data: transfers, isLoading } = useTransfers();
  const { data: accounts } = useBankAccounts();
  const create = useCreateTransfer();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [swapAnimationCount, setSwapAnimationCount] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
  });

  useEffect(() => {
    setValue("transferDate", toThailandDateTimeInputValue(new Date()));
  }, [setValue]);

  const handleSwapAccounts = () => {
    const fromId = getValues("fromBankAccountId");
    const toId = getValues("toBankAccountId");
    if (!fromId && !toId) return;

    setSwapAnimationCount((prev) => prev + 1);
    setValue("fromBankAccountId", toId, { shouldValidate: Boolean(toId), shouldDirty: true });
    setValue("toBankAccountId", fromId, { shouldValidate: Boolean(fromId), shouldDirty: true });
  };

  const closeForm = () => {
    reset({
      fromBankAccountId: undefined as unknown as number,
      toBankAccountId: undefined as unknown as number,
      amount: "" as unknown as number,
      transferDate: toThailandDateTimeInputValue(new Date()),
      reference: null,
    });
    setIsFormOpen(false);
  };

  const handleOpenNewTransfer = () => {
    setValue("transferDate", toThailandDateTimeInputValue(new Date()));
    setIsFormOpen(true);
  };

  const handleRepeatTransfer = (group: TransferResponse) => {
    setValue("fromBankAccountId", group.fromBankAccountId);
    setValue("toBankAccountId", group.toBankAccountId);
    setValue("amount", group.amount);
    setValue("reference", group.reference ? `โอนซ้ำ: ${group.reference}` : "โอนซ้ำ");
    setValue("transferDate", toThailandDateTimeInputValue(new Date()));
    setIsFormOpen(true);
  };

  const onSubmit = (values: TransferFormValues) => {
    create.mutate(
      {
        ...values,
        reference: values.reference ?? null,
        transferDate: thailandDateTimeInputToUtcIso(values.transferDate),
      },
      {
        onSuccess: () => {
          toast.success("โอนเงินสำเร็จ");
          closeForm();
        },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "โอนไม่สำเร็จ"),
      },
    );
  };

  // Quick summary calculation
  const totalAmount = useMemo(() => {
    if (!transfers) return 0;
    return transfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transfers]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl text-[var(--pw-ink)]">
            <ArrowRightLeft className="size-6 text-[var(--pw-primary)]" />
            โอนเงินระหว่างบัญชี
          </h1>
          <p className="mt-1 text-xs text-[var(--pw-ink)]/65 sm:text-sm">
            บันทึกการโยกย้ายเงินระหว่างบัญชีของคุณ เช่น ถอนเงินสด หรือโอนเข้ากระเป๋าเงิน
          </p>
        </div>
        <Button
          className="w-full sm:w-auto h-11 sm:h-10 text-sm font-semibold shadow-sm"
          onClick={handleOpenNewTransfer}
        >
          <Plus className="size-4 mr-1.5" />
          บันทึกการโอนเงิน
        </Button>
      </div>

      {/* Summary Card for Mobile & Desktop */}
      {transfers && transfers.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-4">
          <Card className="p-3.5 sm:p-4 bg-[var(--pw-surface-indigo)]/20 border-[var(--pw-hairline)]">
            <span className="text-xs text-[var(--pw-ink)]/60 block">รายการโอนทั้งหมด</span>
            <span className="mt-1 text-lg sm:text-xl font-bold text-[var(--pw-ink)] block">
              <AnimatedNumber value={transfers.length} /> <span className="text-xs font-normal text-[var(--pw-ink)]/60">รายการ</span>
            </span>
          </Card>
          <Card className="p-3.5 sm:p-4 bg-[var(--pw-surface-indigo)]/20 border-[var(--pw-hairline)]">
            <span className="text-xs text-[var(--pw-ink)]/60 block">ยอดรวมการโอน</span>
            <span className="mt-1 text-lg sm:text-xl font-bold text-[var(--pw-primary)] block truncate">
              <AnimatedNumber value={totalAmount} /> <span className="text-xs font-normal text-[var(--pw-ink)]/60">฿</span>
            </span>
          </Card>
        </div>
      )}

      {/* Form in BottomSheet */}
      <BottomSheet
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
          else setIsFormOpen(true);
        }}
        title="บันทึกการโอนเงินระหว่างบัญชี"
        description="ระบุบัญชีต้นทาง ปลายทาง และจำนวนเงินที่ต้องการโอน"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Account Selection with 1-tap Swap */}
          <div className="rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/10 p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
              <FormField label="จากบัญชีต้นทาง" htmlFor="transfer-from" error={errors.fromBankAccountId?.message}>
                <Controller
                  control={control}
                  name="fromBankAccountId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger id="transfer-from" className="w-full">
                        <SelectValue placeholder="— เลือกบัญชีต้นทาง —" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts?.map((account) => (
                          <SelectItem key={account.bankAccountId} value={String(account.bankAccountId)}>
                            {account.accountName} ({account.bankName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              {/* 1-tap Swap Button between From & To accounts */}
              <div className="flex flex-col items-center justify-center sm:pt-6">
                <button
                  type="button"
                  onClick={handleSwapAccounts}
                  className="group relative inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/80 px-3.5 py-2 text-xs font-medium text-[var(--pw-ink)]/75 shadow-xs transition-all duration-200 hover:border-[var(--pw-primary)]/40 hover:bg-[var(--pw-surface-indigo)]/50 hover:text-[var(--pw-primary)] active:scale-95 sm:size-10 sm:min-h-[40px] sm:p-0"
                  title="สลับบัญชีต้นทางและปลายทาง (1-tap swap)"
                  aria-label="สลับบัญชีต้นทางและปลายทาง"
                >
                  <ArrowUpDown
                    className="size-4 text-[var(--pw-primary)] transition-transform duration-300 ease-in-out sm:hidden"
                    style={{ transform: `rotate(${swapAnimationCount * 180}deg)` }}
                  />
                  <ArrowRightLeft
                    className="hidden size-4 text-[var(--pw-primary)] transition-transform duration-300 ease-in-out sm:block"
                    style={{ transform: `rotate(${swapAnimationCount * 180}deg)` }}
                  />
                  <span className="sm:hidden font-medium">สลับบัญชีต้นทาง ⇄ ปลายทาง</span>
                </button>
                <span className="hidden sm:block text-[10px] text-[var(--pw-ink)]/50 mt-1 select-none">
                  สลับบัญชี
                </span>
              </div>

              <FormField label="ไปยังบัญชีปลายทาง" htmlFor="transfer-to" error={errors.toBankAccountId?.message}>
                <Controller
                  control={control}
                  name="toBankAccountId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger id="transfer-to" className="w-full">
                        <SelectValue placeholder="— เลือกบัญชีปลายทาง —" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts?.map((account) => (
                          <SelectItem key={account.bankAccountId} value={String(account.bankAccountId)}>
                            {account.accountName} ({account.bankName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            <FormField label="จำนวนเงิน (บาท)" htmlFor="transfer-amount" error={errors.amount?.message}>
              <NumberInput
                id="transfer-amount"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                enableQuickMath
                {...register("amount")}
              />
            </FormField>

            <FormField label="วันที่และเวลา (เวลาไทย)" htmlFor="transfer-date" error={errors.transferDate?.message}>
              <Controller
                control={control}
                name="transferDate"
                render={({ field }) => (
                  <DateTimeInput
                    id="transfer-date"
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </FormField>

            <FormField label="คำอธิบาย / อ้างอิง (ไม่บังคับ)" htmlFor="transfer-reference" className="sm:col-span-2">
              <Input
                id="transfer-reference"
                placeholder="เช่น ถอนเงินสดไว้ใช้, โอนเข้า e-wallet"
                {...register("reference")}
              />
            </FormField>
          </div>

          {/* Standard BottomSheetFooter: Confirm TOP, Cancel BOTTOM on mobile */}
          <BottomSheetFooter>
            <Button
              type="submit"
              disabled={create.isPending}
              className="h-11 sm:h-10 font-semibold"
            >
              {create.isPending ? (
                <LoaderCircle className="animate-spin size-4 mr-1.5" />
              ) : (
                <Send className="size-4 mr-1.5" />
              )}
              บันทึกการโอนเงิน
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={closeForm}
              className="h-11 sm:h-10"
            >
              <X className="size-4 mr-1.5" />
              ยกเลิก
            </Button>
          </BottomSheetFooter>
        </form>
      </BottomSheet>

      {/* Transfers History */}
      {isLoading ? (
        <CardGridSkeleton count={4} columns="grid-cols-1" />
      ) : !transfers || transfers.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="ยังไม่มีประวัติการโอนเงิน"
          description="บันทึกรายการโยกย้ายเงินระหว่างบัญชีของคุณ เช่น ถอนเงินสด หรือโอนเงินเข้ากระเป๋าเงินดิจิทัล"
          actionLabel="เริ่มโอนเงินรายการแรก"
          actionIcon={Plus}
          onAction={handleOpenNewTransfer}
        />
      ) : (
        <AnimatedList className="space-y-3 sm:space-y-4">
          {transfers.map((group) => {
            const fromAcc = accounts?.find((a) => a.bankAccountId === group.fromBankAccountId);
            const toAcc = accounts?.find((a) => a.bankAccountId === group.toBankAccountId);
            const isConfirmed = group.status === "confirmed";

            return (
              <AnimatedListItem key={group.transferGroupId}>
                <Card className="p-3.5 sm:p-5 border-[var(--pw-hairline)] bg-[var(--pw-surface)]/80 hover:border-[var(--pw-primary)]/40 transition-colors">
                  <div className="flex flex-col gap-3">
                    {/* Visual Route Header (From -> To) */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-1 items-center gap-2 min-w-0">
                        {/* Source Account Box */}
                        <div className="flex items-center gap-1.5 min-w-0 rounded-lg bg-[var(--pw-surface-indigo)]/30 px-2.5 py-1.5 border border-[var(--pw-hairline)]">
                          <Building2 className="size-3.5 shrink-0 text-[var(--pw-primary)]" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--pw-ink)] truncate max-w-[100px] sm:max-w-[160px]">
                              {fromAcc ? fromAcc.accountName : "บัญชีต้นทาง"}
                            </p>
                            {fromAcc?.bankName && (
                              <p className="text-[10px] text-[var(--pw-ink)]/50 truncate">
                                {fromAcc.bankName}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Arrow Route Indicator */}
                        <div className="shrink-0 flex items-center justify-center size-6 rounded-full bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]">
                          <ArrowRight className="size-3.5" />
                        </div>

                        {/* Destination Account Box */}
                        <div className="flex items-center gap-1.5 min-w-0 rounded-lg bg-[var(--pw-surface-indigo)]/30 px-2.5 py-1.5 border border-[var(--pw-hairline)]">
                          <Wallet className="size-3.5 shrink-0 text-[var(--pw-green)]" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[var(--pw-ink)] truncate max-w-[100px] sm:max-w-[160px]">
                              {toAcc ? toAcc.accountName : "บัญชีปลายทาง"}
                            </p>
                            {toAcc?.bankName && (
                              <p className="text-[10px] text-[var(--pw-ink)]/50 truncate">
                                {toAcc.bankName}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Pill */}
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          isConfirmed
                            ? "bg-[var(--pw-green)]/15 text-[var(--pw-green)] border border-[var(--pw-green)]/20"
                            : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {isConfirmed ? (
                          <>
                            <CheckCircle2 className="size-3" />
                            สำเร็จ
                          </>
                        ) : (
                          <>
                            <Clock className="size-3" />
                            {group.status}
                          </>
                        )}
                      </span>
                    </div>

                    {/* Amount & Time Details */}
                    <div className="flex items-end justify-between border-t border-[var(--pw-hairline)]/50 pt-2.5 mt-0.5">
                      <div className="space-y-0.5">
                        <p className="text-[11px] text-[var(--pw-ink)]/50">
                          {formatDisplayDateTime(group.transferDate || group.createdAt)}
                        </p>
                        {group.reference && (
                          <p className="text-xs text-[var(--pw-ink)]/75 line-clamp-1">
                            <span className="text-[var(--pw-ink)]/45">บันทึก:</span> {group.reference}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2.5">
                        <p className="text-base sm:text-lg font-bold text-[var(--pw-ink)]">
                          <AnimatedNumber value={group.amount} /> <span className="text-xs font-normal text-[var(--pw-ink)]/60">฿</span>
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRepeatTransfer(group)}
                          className="h-8 px-2 text-xs text-[var(--pw-link)] hover:text-[var(--pw-ink)] hover:bg-[var(--pw-link)]/10"
                          title="โอนซ้ำรายการนี้"
                          aria-label={`โอนซ้ำรายการจำนวน ${group.amount} บาท`}
                        >
                          <Repeat className="size-3.5 mr-1" />
                          <span className="hidden sm:inline">โอนอีกครั้ง</span>
                        </Button>
                      </div>
                    </div>
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
