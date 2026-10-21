"use client";

import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "sonner";
import { bankAccountSchema, type BankAccountFormValues } from "@/schemas/bank-account.schema";
import { zodResolver } from "@/lib/zod-resolver";
import {
  useBankAccounts,
  useCreateBankAccount,
  useDeleteBankAccount,
  useUpdateBankAccount,
} from "@/features/accounts/hooks/useBankAccounts";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Banknote,
  Landmark,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";

const initialBankValues: BankAccountFormValues = {
  accountName: "",
  bankName: "",
  bankCode: null,
  accountNumberMasked: null,
  accountType: "bank",
};

export function BankAccountsView() {
  const { data, isLoading } = useBankAccounts();
  const create = useCreateBankAccount();
  const update = useUpdateBankAccount();
  const remove = useDeleteBankAccount();

  const [editing, setEditing] = useState<number | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: initialBankValues,
  });

  const clearForm = () => {
    setEditing(null);
    reset(initialBankValues);
  };

  const onSubmit = (values: BankAccountFormValues) => {
    const payload = {
      ...values,
      bankCode: values.bankCode ?? null,
      accountNumberMasked: values.accountNumberMasked ?? null,
    };
    if (editing !== null) {
      update.mutate(
        { id: editing, body: { ...payload, isActive: true } },
        {
          onSuccess: () => { clearForm(); toast.success("บันทึกบัญชีแล้ว"); },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { clearForm(); toast.success("เพิ่มบัญชีแล้ว"); },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "เพิ่มไม่สำเร็จ"),
      });
    }
  };

  const getAccountIcon = (type?: string | null) => {
    const t = type?.toLowerCase();
    if (t === "cash") return <Banknote className="size-4 text-emerald-500" />;
    if (t === "wallet") return <Smartphone className="size-4 text-purple-500" />;
    return <Landmark className="size-4 text-[var(--pw-primary)]" />;
  };

  return (
    <div>
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-bold">
        <Landmark className="size-6 text-[var(--pw-primary)]" />
        บัญชี
      </h1>

      <Card className="mb-6 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">{editing !== null ? "แก้ไขบัญชี" : "เพิ่มบัญชี"}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="ชื่อบัญชี" htmlFor="account-name" error={errors.accountName?.message}>
              <Input id="account-name" {...register("accountName")} />
            </FormField>
            <FormField label="ชื่อธนาคาร" htmlFor="bank-name" error={errors.bankName?.message}>
              <Input id="bank-name" {...register("bankName")} />
            </FormField>
            <FormField label="รหัสธนาคาร" htmlFor="bank-code">
              <Input id="bank-code" {...register("bankCode")} />
            </FormField>
            <FormField label="ประเภท" htmlFor="account-type" error={errors.accountType?.message}>
              <Controller
                control={control}
                name="accountType"
                render={({ field }) => (
                  <Select value={field.value || "bank"} onValueChange={field.onChange}>
                    <SelectTrigger id="account-type"><SelectValue placeholder="เลือกประเภทบัญชี" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">ธนาคาร</SelectItem>
                      <SelectItem value="cash">เงินสด</SelectItem>
                      <SelectItem value="wallet">กระเป๋าเงิน</SelectItem>
                      <SelectItem value="other">อื่น ๆ</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" className="w-full sm:w-auto" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending
                ? <LoaderCircle className="animate-spin" />
                : editing !== null ? <Save /> : <Plus />}
              {editing !== null ? "บันทึก" : "เพิ่ม"}
            </Button>
            {editing !== null && (
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={clearForm}>
                <X />
                ยกเลิก
              </Button>
            )}
          </div>
        </form>
      </Card>

      {isLoading ? (
        <p className="text-[var(--pw-ink)]/70">กำลังโหลด...</p>
      ) : !data || data.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <Landmark className="mb-2 size-10 opacity-35 text-[var(--pw-primary)]" />
          <p className="font-medium text-[var(--pw-ink)]">ยังไม่มีบัญชี</p>
          <p className="mt-1 text-xs text-[var(--pw-ink)]/60">เพิ่มบัญชีธนาคาร เงินสด หรือกระเป๋าเงินจากฟอร์มด้านบน</p>
        </Card>
      ) : (
        <Card className="p-0">
          <ul>
            {data.map((a) => (
              <li key={a.bankAccountId} className="flex flex-col gap-3 border-b border-[var(--pw-hairline)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--pw-surface-sunken)]">
                    {getAccountIcon(a.accountType)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--pw-ink)] truncate">{a.accountName}</p>
                    <p className="text-xs text-[var(--pw-ink)]/50">
                      {a.bankName}
                      {a.accountNumberMasked && ` • ${a.accountNumberMasked}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-h-10 flex-1 sm:flex-none"
                    onClick={() => {
                      setEditing(a.bankAccountId);
                      reset({
                        bankName: a.bankName,
                        accountName: a.accountName,
                        bankCode: a.bankCode,
                        accountNumberMasked: a.accountNumberMasked,
                        accountType: (a.accountType?.toLowerCase() as BankAccountFormValues["accountType"]) ?? "bank",
                      });
                    }}
                  >
                    <Pencil />
                    แก้ไข
                  </Button>
                  <ConfirmDialog
                    title="ลบบัญชีนี้?"
                    description="ไม่สามารถลบบัญชีที่มีรายการใช้งานอยู่ได้"
                    confirmLabel="ลบ"
                    pending={remove.isPending}
                    onConfirm={() => {
                      remove.mutate(a.bankAccountId, {
                        onSuccess: () => toast.success("ลบบัญชีแล้ว"),
                        onError: (e) => toast.error(e instanceof ApiError ? e.message : "ลบไม่สำเร็จ"),
                      });
                    }}
                    trigger={<Button size="sm" variant="destructive" className="min-h-10 flex-1 sm:flex-none"><Trash2 />ลบ</Button>}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
