"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { transferSchema, type TransferFormValues } from "@/schemas/transfer.schema";
import { zodResolver } from "@/lib/zod-resolver";
import { useCreateTransfer, useTransfers } from "@/features/transfers/hooks/useTransfers";
import { useBankAccounts } from "@/features/accounts/hooks/useBankAccounts";
import { ApiError } from "@/lib/api-client";
import { formatCurrency, formatDateTime, toLocalDateTimeInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { Card } from "@/components/ui/card";

export function TransfersView() {
  const { data: transfers, isLoading } = useTransfers();
  const { data: accounts } = useBankAccounts();
  const create = useCreateTransfer();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
  });

  useEffect(() => {
    setValue("transferDate", toLocalDateTimeInputValue(new Date().toISOString()));
  }, [setValue]);

  const onSubmit = (values: TransferFormValues) => {
    create.mutate(
      {
        ...values,
        reference: values.reference ?? null,
        transferDate: new Date(values.transferDate).toISOString(),
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
      <h1 className="mb-6 text-2xl font-bold">โอนเงินระหว่างบัญชี</h1>

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-bold">โอนเงิน</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>จากบัญชี</Label>
              <Select {...register("fromBankAccountId", { setValueAs: Number })}>
                <option value="">— เลือก —</option>
                {accounts?.map((a) => (
                  <option key={a.bankAccountId} value={a.bankAccountId}>{a.accountName}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>ไปยังบัญชี</Label>
              <Select {...register("toBankAccountId", { setValueAs: Number })}>
                <option value="">— เลือก —</option>
                {accounts?.map((a) => (
                  <option key={a.bankAccountId} value={a.bankAccountId}>{a.accountName}</option>
                ))}
              </Select>
              <FieldError message={errors.toBankAccountId?.message} />
            </div>
            <div>
              <Label>จำนวนเงิน</Label>
              <Input type="number" step="0.01" {...register("amount")} />
              <FieldError message={errors.amount?.message} />
            </div>
            <div>
              <Label>วันที่</Label>
              <Input type="datetime-local" {...register("transferDate")} />
            </div>
            <div>
              <Label>อ้างอิง</Label>
              <Input {...register("reference")} />
            </div>
          </div>

          {create.isError && (
            <p className="text-sm text-[var(--pw-magenta)]">
              {(create.error as ApiError).message}
            </p>
          )}

          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "กำลังโอน..." : "โอนเงิน"}
          </Button>
        </form>
      </Card>

      {isLoading ? (
        <p className="text-[var(--pw-ink)]/70">กำลังโหลด...</p>
      ) : (
        <Card className="p-0">
          <ul>
            {transfers?.map((t) => (
              <li key={t.transferGroupId} className="flex items-center justify-between border-b border-[var(--pw-hairline)] px-4 py-3 last:border-b-0">
                <span>{formatDateTime(t.transferDate)}</span>
                <span className="text-[var(--pw-ink)]/70">{t.reference ?? "-"}</span>
                <span>{formatCurrency(t.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
