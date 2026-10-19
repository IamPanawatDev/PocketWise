"use client";

import { useForm } from "react-hook-form";
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
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export function BankAccountsView() {
  const { data, isLoading } = useBankAccounts();
  const create = useCreateBankAccount();
  const update = useUpdateBankAccount();
  const remove = useDeleteBankAccount();

  const [editing, setEditing] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BankAccountFormValues>({ resolver: zodResolver(bankAccountSchema) });

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
          onSuccess: () => { setEditing(null); reset(); toast.success("บันทึกบัญชีแล้ว"); },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => { reset(); toast.success("เพิ่มบัญชีแล้ว"); },
        onError: (e) => toast.error(e instanceof ApiError ? e.message : "เพิ่มไม่สำเร็จ"),
      });
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">บัญชี</h1>

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-bold">{editing !== null ? "แก้ไขบัญชี" : "เพิ่มบัญชี"}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>ชื่อบัญชี</Label>
              <Input {...register("accountName")} />
              <FieldError message={errors.accountName?.message} />
            </div>
            <div>
              <Label>ชื่อธนาคาร</Label>
              <Input {...register("bankName")} />
              <FieldError message={errors.bankName?.message} />
            </div>
            <div>
              <Label>รหัสธนาคาร</Label>
              <Input {...register("bankCode")} />
            </div>
            <div>
              <Label>ประเภท</Label>
              <Select {...register("accountType")}>
                <option value="bank">ธนาคาร</option>
                <option value="cash">เงินสด</option>
                <option value="wallet">กระเป๋าเงิน</option>
                <option value="other">อื่น ๆ</option>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editing !== null ? "บันทึก" : "เพิ่ม"}
            </Button>
            {editing !== null && (
              <Button type="button" variant="ghost" onClick={() => { setEditing(null); reset(); }}>
                ยกเลิก
              </Button>
            )}
          </div>
        </form>
      </Card>

      {isLoading ? (
        <p className="text-[var(--pw-ink)]/70">กำลังโหลด...</p>
      ) : (
        <Card className="p-0">
          <ul>
            {data?.map((a) => (
              <li key={a.bankAccountId} className="flex items-center justify-between border-b border-[var(--pw-hairline)] px-4 py-3 last:border-b-0">
                <span>
                  {a.accountName}
                  <span className="ml-2 text-xs text-[var(--pw-ink)]/50">{a.bankName}</span>
                </span>
                <div>
                  <button
                    className="mr-3 text-[var(--pw-link)]"
                    onClick={() => {
                      setEditing(a.bankAccountId);
                      reset({
                        bankName: a.bankName,
                        accountName: a.accountName,
                        bankCode: a.bankCode,
                        accountNumberMasked: a.accountNumberMasked,
                        accountType: a.accountType,
                      });
                    }}
                  >
                    แก้ไข
                  </button>
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
                    trigger={<button className="text-[var(--pw-magenta)]">ลบ</button>}
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
