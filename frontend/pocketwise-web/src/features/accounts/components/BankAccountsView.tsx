"use client";

import Link from "next/link";
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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CardGridSkeleton } from "@/components/shared/Skeletons";
import {
  Banknote,
  Landmark,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Smartphone,
  ChevronRight,
  ReceiptText,
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

function getBankTheme(bankCode?: string | null, bankName?: string | null, accountType?: string | null) {
  const t = accountType?.toLowerCase();
  if (t === "cash") {
    return {
      gradient: "from-emerald-950 via-slate-900 to-teal-950 border-emerald-500/30",
      accent: "text-emerald-400 bg-emerald-500/15",
      badge: "เงินสด",
    };
  }
  if (t === "wallet") {
    return {
      gradient: "from-purple-950 via-slate-900 to-fuchsia-950 border-purple-500/30",
      accent: "text-purple-400 bg-purple-500/15",
      badge: "กระเป๋าเงินดิจิทัล",
    };
  }
  const code = (bankCode || "").toUpperCase();
  const name = (bankName || "").toLowerCase();
  if (code.includes("KBANK") || name.includes("กสิกร") || code === "004") {
    return {
      gradient: "from-emerald-900 via-teal-950 to-green-950 border-emerald-500/30",
      accent: "text-emerald-400 bg-emerald-500/15",
      badge: "KBANK",
    };
  }
  if (code.includes("SCB") || name.includes("ไทยพาณิชย์") || code === "014") {
    return {
      gradient: "from-purple-900 via-indigo-950 to-violet-950 border-purple-500/30",
      accent: "text-purple-400 bg-purple-500/15",
      badge: "SCB",
    };
  }
  if (code.includes("BBL") || name.includes("กรุงเทพ") || code === "002") {
    return {
      gradient: "from-blue-900 via-indigo-950 to-slate-950 border-blue-500/30",
      accent: "text-blue-400 bg-blue-500/15",
      badge: "BBL",
    };
  }
  if (code.includes("KTB") || name.includes("กรุงไทย") || code === "006") {
    return {
      gradient: "from-cyan-900 via-sky-950 to-blue-950 border-cyan-500/30",
      accent: "text-cyan-400 bg-cyan-500/15",
      badge: "KTB",
    };
  }
  if (code.includes("TTB") || name.includes("ทหารไทย") || name.includes("ธนชาต") || code === "011") {
    return {
      gradient: "from-blue-950 via-slate-900 to-amber-950 border-orange-500/30",
      accent: "text-orange-400 bg-orange-500/15",
      badge: "TTB",
    };
  }
  if (code.includes("BAY") || name.includes("กรุงศรี") || code === "025") {
    return {
      gradient: "from-amber-900 via-stone-900 to-yellow-950 border-amber-500/30",
      accent: "text-amber-400 bg-amber-500/15",
      badge: "BAY",
    };
  }
  if (code.includes("GSB") || name.includes("ออมสิน") || code === "030") {
    return {
      gradient: "from-pink-900 via-rose-950 to-stone-950 border-pink-500/30",
      accent: "text-pink-400 bg-pink-500/15",
      badge: "GSB",
    };
  }
  return {
    gradient: "from-slate-900 via-indigo-950 to-slate-950 border-indigo-500/30",
    accent: "text-indigo-400 bg-indigo-500/15",
    badge: bankCode || bankName || "ธนาคาร",
  };
}

export function BankAccountsView() {
  const { data, isLoading } = useBankAccounts();
  const create = useCreateBankAccount();
  const update = useUpdateBankAccount();
  const remove = useDeleteBankAccount();

  const [editing, setEditing] = useState<number | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

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

  const closeForm = () => {
    clearForm();
    setIsFormOpen(false);
  };

  const onSubmit = (values: BankAccountFormValues) => {
    const payload = {
      ...values,
      bankCode: values.bankCode?.trim().toUpperCase() || null,
      accountNumberMasked: values.accountNumberMasked?.trim() || null,
    };
    if (editing !== null) {
      update.mutate(
        { id: editing, body: { ...payload, isActive: true } },
        {
          onSuccess: () => {
            closeForm();
            toast.success("บันทึกบัญชีแล้ว");
          },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(payload, {
        onSuccess: () => {
          closeForm();
          toast.success("เพิ่มบัญชีแล้ว");
        },
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
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <Landmark className="size-6 text-[var(--pw-primary)]" />
            บัญชี
          </h1>
          <p className="mt-1 text-sm text-[var(--pw-ink)]/65">
            จัดการบัญชีเงินฝาก เงินสด และกระเป๋าเงินของคุณ
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
          เพิ่มบัญชี
        </Button>
      </div>

      {/* Form in BottomSheet */}
      <BottomSheet
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
          else setIsFormOpen(true);
        }}
        title={editing !== null ? "แก้ไขบัญชี" : "เพิ่มบัญชีใหม่"}
        description="ระบุรายละเอียดบัญชีสำหรับการบันทึกธุรกรรม"
      >
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="ชื่อบัญชี" htmlFor="account-name" error={errors.accountName?.message}>
                <Input id="account-name" placeholder="เช่น เงินเดือน, บัญชีหลัก" {...register("accountName")} />
              </FormField>
              <FormField label="ชื่อธนาคาร / ผู้ให้บริการ" htmlFor="bank-name" error={errors.bankName?.message}>
                <Input id="bank-name" placeholder="เช่น กสิกรไทย, ไทยพาณิชย์, TrueMoney" {...register("bankName")} />
              </FormField>
              <FormField label="รหัสธนาคาร (เช่น 004 หรือ KBANK)" htmlFor="bank-code" error={errors.bankCode?.message}>
                <Input id="bank-code" placeholder="เช่น 004 หรือ KBANK" {...register("bankCode")} />
              </FormField>
              <FormField label="ประเภท" htmlFor="account-type" error={errors.accountType?.message}>
                <Controller
                  control={control}
                  name="accountType"
                  render={({ field }) => (
                    <Select value={field.value || "bank"} onValueChange={field.onChange}>
                      <SelectTrigger id="account-type">
                        <SelectValue placeholder="เลือกประเภทบัญชี" />
                      </SelectTrigger>
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

            <div className="flex flex-col gap-3 pt-3 border-t border-[var(--pw-hairline)] sm:flex-row-reverse sm:justify-start">
              <Button type="submit" disabled={create.isPending || update.isPending} className="w-full sm:w-auto">
                {create.isPending || update.isPending ? (
                  <LoaderCircle className="animate-spin size-4 mr-1.5" />
                ) : editing !== null ? (
                  <Save className="size-4 mr-1.5" />
                ) : (
                  <Plus className="size-4 mr-1.5" />
                )}
                {create.isPending || update.isPending ? "กำลังบันทึก..." : editing !== null ? "บันทึกการแก้ไข" : "เพิ่มบัญชี"}
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm} className="w-full sm:w-auto">
                <X className="size-4 mr-1.5" />
                ยกเลิก
              </Button>
            </div>
          </form>
        </div>
      </BottomSheet>

      {/* Accounts List */}
      {isLoading ? (
        <CardGridSkeleton count={4} columns="grid-cols-1 sm:grid-cols-2" type="creditCard" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="ยังไม่มีบัญชีการเงิน"
          description="เพิ่มบัญชีธนาคาร บัญชีเงินสด หรือกระเป๋าเงินดิจิทัลเพื่อเริ่มต้นติดตามยอดเงินคงเหลือ"
          actionLabel="เพิ่มบัญชีแรก"
          actionIcon={Plus}
          onAction={() => {
            setEditing(null);
            reset(initialBankValues);
            setIsFormOpen(true);
          }}
        />
      ) : (
        <AnimatedList className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {data.map((a) => {
            const theme = getBankTheme(a.bankCode, a.bankName, a.accountType);
            return (
              <AnimatedListItem key={a.bankAccountId}>
                <div className="flex flex-col gap-2.5 h-full">
                  <div
                    className={cn(
                      "relative overflow-hidden rounded-2xl p-4 sm:p-5 text-white shadow-lg bg-gradient-to-br border min-h-[160px] flex flex-col justify-between transition-transform hover:-translate-y-0.5",
                      theme.gradient
                    )}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

                    {/* Top Row: Provider / Type & Icon */}
                    <div className="relative z-10 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", theme.accent)}>
                            {theme.badge}
                          </span>
                          {a.bankName && (
                            <span className="text-xs text-white/70 truncate max-w-[150px]">
                              {a.bankName}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold tracking-tight text-white mt-1 truncate">
                          {a.accountName}
                        </h3>
                      </div>
                      <div className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur-xs border border-white/15">
                        {getAccountIcon(a.accountType)}
                      </div>
                    </div>

                    {/* Middle: Masked Account Number */}
                    <div className="relative z-10 my-2">
                      <p className="font-mono text-sm sm:text-base tracking-widest text-white/85 drop-shadow-xs">
                        {a.accountNumberMasked || "•••• •••• ••••"}
                      </p>
                    </div>

                    {/* Bottom: Quick Link to Transactions */}
                    <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                      <Link
                        href={`/transactions?bankAccountId=${a.bankAccountId}`}
                        className="inline-flex items-center gap-1 text-white/80 hover:text-white transition-colors font-medium hover:underline"
                      >
                        <ReceiptText className="size-3.5" />
                        <span>ดูประวัติธุรกรรม</span>
                        <ChevronRight className="size-3" />
                      </Link>
                      <span className="text-[10px] text-white/50">
                        {a.accountType === "cash" ? "เงินสด" : a.accountType === "wallet" ? "e-Wallet" : "บัญชีเงินฝาก"}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="flex gap-2 justify-end px-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="flex-1 sm:flex-none text-xs h-8"
                      onClick={() => {
                        setEditing(a.bankAccountId);
                        reset({
                          bankName: a.bankName,
                          accountName: a.accountName,
                          bankCode: a.bankCode,
                          accountNumberMasked: a.accountNumberMasked,
                          accountType: (a.accountType?.toLowerCase() as BankAccountFormValues["accountType"]) ?? "bank",
                        });
                        setIsFormOpen(true);
                      }}
                    >
                      <Pencil className="size-3.5" />
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
                      trigger={
                        <Button size="sm" variant="destructive" className="flex-1 sm:flex-none text-xs h-8">
                          <Trash2 className="size-3.5" />
                          ลบ
                        </Button>
                      }
                    />
                  </div>
                </div>
              </AnimatedListItem>
            );
          })}
        </AnimatedList>
      )}
    </div>
  );
}
