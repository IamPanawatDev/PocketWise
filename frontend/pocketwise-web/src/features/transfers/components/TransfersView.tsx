"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { transferSchema, type TransferFormValues } from "@/schemas/transfer.schema";
import { zodResolver } from "@/lib/zod-resolver";
import { useCreateTransfer, useTransfers } from "@/features/transfers/hooks/useTransfers";
import { useBankAccounts } from "@/features/accounts/hooks/useBankAccounts";
import { ApiError } from "@/lib/api-client";
import {
  formatCurrency,
  formatDateTime,
  thailandDateTimeInputToUtcIso,
  toThailandDateTimeInputValue,
} from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DateTimeInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { NumberInput } from "@/components/ui/number-input";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRightLeft, LoaderCircle, Plus, Send, X } from "lucide-react";

export function TransfersView() {
  const { data: transfers, isLoading } = useTransfers();
  const { data: accounts } = useBankAccounts();
  const create = useCreateTransfer();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
  });

  useEffect(() => {
    setValue("transferDate", toThailandDateTimeInputValue(new Date()));
  }, [setValue]);

  const closeForm = () => {
    setValue("amount", 0);
    setValue("reference", null);
    setIsFormOpen(false);
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

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <ArrowRightLeft className="size-6 text-[var(--pw-primary)]" />
            โอนเงินระหว่างบัญชี
          </h1>
          <p className="mt-1 text-sm text-[var(--pw-ink)]/65">
            บันทึกการโยกย้ายเงินระหว่างบัญชีของคุณ เช่น ถอนเงินสด หรือโอนเข้ากระเป๋าเงิน
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            setValue("transferDate", toThailandDateTimeInputValue(new Date()));
            setIsFormOpen(true);
          }}
        >
          <Plus />
          บันทึกการโอนเงิน
        </Button>
      </div>

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
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="จากบัญชี" htmlFor="transfer-from" error={errors.fromBankAccountId?.message}>
                <Controller
                  control={control}
                  name="fromBankAccountId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger id="transfer-from"><SelectValue placeholder="— เลือกบัญชีต้นทาง —" /></SelectTrigger>
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
              <FormField label="ไปยังบัญชี" htmlFor="transfer-to" error={errors.toBankAccountId?.message}>
                <Controller
                  control={control}
                  name="toBankAccountId"
                  render={({ field }) => (
                    <Select
                      value={field.value ? String(field.value) : undefined}
                      onValueChange={(value) => field.onChange(Number(value))}
                    >
                      <SelectTrigger id="transfer-to"><SelectValue placeholder="— เลือกบัญชีปลายทาง —" /></SelectTrigger>
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
              <FormField label="จำนวนเงิน" htmlFor="transfer-amount" error={errors.amount?.message}>
                <NumberInput id="transfer-amount" step="0.01" min="0.01" placeholder="0.00" {...register("amount")} />
              </FormField>
              <FormField label="วันที่และเวลา (ค.ศ. / เวลาไทย)" htmlFor="transfer-date" error={errors.transferDate?.message}>
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
                <Input id="transfer-reference" placeholder="เช่น ถอนเงินสดไว้ใช้, โอนเข้า e-wallet" {...register("reference")} />
              </FormField>
            </div>

            <div className="flex flex-col gap-3 pt-3 border-t border-[var(--pw-hairline)] sm:flex-row-reverse sm:justify-start">
              <Button type="submit" disabled={create.isPending} className="w-full sm:w-auto">
                {create.isPending ? (
                  <LoaderCircle className="animate-spin size-4 mr-1.5" />
                ) : (
                  <Send className="size-4 mr-1.5" />
                )}
                บันทึกการโอนเงิน
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm} className="w-full sm:w-auto">
                <X className="size-4 mr-1.5" />
                ยกเลิก
              </Button>
            </div>
          </form>
        </div>
      </BottomSheet>

      {/* Transfers History */}
      {isLoading ? (
        <p className="text-[var(--pw-ink)]/70">กำลังโหลด...</p>
      ) : !transfers || transfers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <ArrowRightLeft className="mb-2 size-10 opacity-35 text-[var(--pw-primary)]" />
          <p className="font-medium text-[var(--pw-ink)]">ยังไม่มีประวัติการโอนเงิน</p>
          <p className="mt-1 text-xs text-[var(--pw-ink)]/60">
            กดปุ่ม &quot;บันทึกการโอนเงิน&quot; ด้านบนเพื่อบันทึกรายการโอนเงินระหว่างบัญชี
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {transfers.map((group) => {
            const fromAcc = accounts?.find((a) => a.bankAccountId === group.fromBankAccountId);
            const toAcc = accounts?.find((a) => a.bankAccountId === group.toBankAccountId);
            return (
              <Card key={group.transferGroupId} className="p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-base font-semibold sm:text-lg">
                      {fromAcc ? `${fromAcc.accountName} (${fromAcc.bankName})` : "บัญชีต้นทาง"} →{" "}
                      {toAcc ? `${toAcc.accountName} (${toAcc.bankName})` : "บัญชีปลายทาง"}
                    </p>
                    <p className="text-xs text-[var(--pw-ink)]/50">
                      {formatDateTime(group.transferDate || group.createdAt)}
                    </p>
                    {group.reference && (
                      <p className="mt-1 text-xs text-[var(--pw-ink)]/70">
                        อ้างอิง: {group.reference}
                      </p>
                    )}
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-base font-bold text-[var(--pw-ink)] sm:text-lg">
                      {formatCurrency(group.amount)}
                    </p>
                    <span className="inline-block mt-1 rounded-full bg-[var(--pw-surface-indigo)] px-2.5 py-0.5 text-[10px] text-[var(--pw-ink)]/70">
                      {group.status === "confirmed" ? "สำเร็จ" : group.status}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
