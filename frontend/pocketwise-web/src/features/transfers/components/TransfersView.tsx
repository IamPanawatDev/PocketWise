"use client";

import { useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRightLeft, LoaderCircle } from "lucide-react";

export function TransfersView() {
  const { data: transfers, isLoading } = useTransfers();
  const { data: accounts } = useBankAccounts();
  const create = useCreateTransfer();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
  });

  useEffect(() => {
    setValue("transferDate", toThailandDateTimeInputValue(new Date()));
  }, [setValue]);

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
          setValue("amount", 0);
          setValue("reference", null);
        },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "โอนไม่สำเร็จ"),
      },
    );
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold sm:mb-6 sm:text-2xl">โอนเงินระหว่างบัญชี</h1>

      <Card className="mb-6 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">โอนเงิน</h2>
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
                    <SelectTrigger id="transfer-from"><SelectValue placeholder="— เลือก —" /></SelectTrigger>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.bankAccountId} value={String(account.bankAccountId)}>
                          {account.accountName}
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
                    <SelectTrigger id="transfer-to"><SelectValue placeholder="— เลือก —" /></SelectTrigger>
                    <SelectContent>
                      {accounts?.map((account) => (
                        <SelectItem key={account.bankAccountId} value={String(account.bankAccountId)}>
                          {account.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="จำนวนเงิน" htmlFor="transfer-amount" error={errors.amount?.message}>
              <NumberInput id="transfer-amount" step="0.01" min="0.01" {...register("amount")} />
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
            <FormField label="อ้างอิง" htmlFor="transfer-reference">
              <Input id="transfer-reference" {...register("reference")} />
            </FormField>
          </div>

          {create.isError && (
            <p className="text-sm text-[var(--pw-magenta)]">
              {(create.error as ApiError).message}
            </p>
          )}

          <Button type="submit" className="w-full sm:w-auto" disabled={create.isPending}>
            {create.isPending ? <LoaderCircle className="animate-spin" /> : <ArrowRightLeft />}
            {create.isPending ? "กำลังโอน..." : "โอนเงิน"}
          </Button>
        </form>
      </Card>

      {isLoading ? (
        <p className="text-[var(--pw-ink)]/70">กำลังโหลด...</p>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-[var(--pw-hairline)]">
            {transfers?.map((t) => (
              <li key={t.transferGroupId} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3">
                <span className="w-full text-xs text-[var(--pw-ink)]/60 sm:w-auto sm:text-sm">{formatDateTime(t.transferDate)} (เวลาไทย)</span>
                <span className="min-w-0 flex-1 break-words text-sm text-[var(--pw-ink)]/70">{t.reference ?? "-"}</span>
                <span className="shrink-0 font-semibold">{formatCurrency(t.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
