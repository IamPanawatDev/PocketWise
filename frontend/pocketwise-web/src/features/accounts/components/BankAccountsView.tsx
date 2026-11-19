"use client";

import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "sonner";
import { bankAccountSchema, type BankAccountFormValues } from "@/schemas/bank-account.schema";
import { zodResolver } from "@/lib/zod-resolver";
import { THAI_BANKS, inferBankCode, normalizeBankCode } from "@/lib/bank-matcher";
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
import { BottomSheet, BottomSheetFooter } from "@/components/ui/bottom-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CardGridSkeleton } from "@/components/shared/Skeletons";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  Banknote,
  Landmark,
  Loader2,
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

  const code = normalizeBankCode(bankCode) || normalizeBankCode(bankName);
  if (code === "KBANK") {
    return {
      gradient: "from-emerald-900 via-teal-950 to-green-950 border-emerald-500/30",
      accent: "text-emerald-400 bg-emerald-500/15",
      badge: "KBANK",
    };
  }
  if (code === "SCB") {
    return {
      gradient: "from-purple-900 via-indigo-950 to-violet-950 border-purple-500/30",
      accent: "text-purple-400 bg-purple-500/15",
      badge: "SCB",
    };
  }
  if (code === "BBL") {
    return {
      gradient: "from-blue-900 via-indigo-950 to-slate-950 border-blue-500/30",
      accent: "text-blue-400 bg-blue-500/15",
      badge: "BBL",
    };
  }
  if (code === "KTB") {
    return {
      gradient: "from-cyan-900 via-sky-950 to-blue-950 border-cyan-500/30",
      accent: "text-cyan-400 bg-cyan-500/15",
      badge: "KTB",
    };
  }
  if (code === "TTB") {
    return {
      gradient: "from-blue-950 via-slate-900 to-amber-950 border-orange-500/30",
      accent: "text-orange-400 bg-orange-500/15",
      badge: "TTB",
    };
  }
  if (code === "BAY") {
    return {
      gradient: "from-amber-900 via-stone-900 to-yellow-950 border-amber-500/30",
      accent: "text-amber-400 bg-amber-500/15",
      badge: "BAY",
    };
  }
  if (code === "GSB") {
    return {
      gradient: "from-pink-900 via-rose-950 to-stone-950 border-pink-500/30",
      accent: "text-pink-400 bg-pink-500/15",
      badge: "GSB",
    };
  }
  if (code === "UOB") {
    return {
      gradient: "from-blue-900 via-slate-900 to-indigo-950 border-blue-500/30",
      accent: "text-blue-400 bg-blue-500/15",
      badge: "UOB",
    };
  }
  if (code === "CIMB") {
    return {
      gradient: "from-red-950 via-slate-900 to-rose-950 border-red-500/30",
      accent: "text-red-400 bg-red-500/15",
      badge: "CIMB",
    };
  }
  if (code === "BAAC") {
    return {
      gradient: "from-emerald-950 via-slate-900 to-teal-950 border-emerald-500/30",
      accent: "text-emerald-400 bg-emerald-500/15",
      badge: "ธ.ก.ส.",
    };
  }
  return {
    gradient: "from-slate-900 via-indigo-950 to-slate-950 border-indigo-500/30",
    accent: "text-indigo-400 bg-indigo-500/15",
    badge: code || bankCode || bankName || "ธนาคาร",
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
    setValue,
    watch,
    formState: { errors },
  } = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: initialBankValues,
  });

  const currentAccountType = watch("accountType");
  const currentBankCode = watch("bankCode");
  const currentBankName = watch("bankName");

  const matchedPreset = THAI_BANKS.find(
    (b) => b.code === currentBankCode || (currentBankName ? inferBankCode(currentBankName) === b.code : false),
  );
  const selectedPresetCode = matchedPreset ? matchedPreset.code : "custom";

  const clearForm = () => {
    setEditing(null);
    reset(initialBankValues);
  };

  const closeForm = () => {
    clearForm();
    setIsFormOpen(false);
  };

  const onSubmit = (values: BankAccountFormValues) => {
    const inferredCode = inferBankCode(values.bankCode) || inferBankCode(values.bankName);
    const resolvedBankCode = values.bankCode?.trim().toUpperCase() || inferredCode || null;

    const payload = {
      ...values,
      bankCode: resolvedBankCode,
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
      <PageHeader
        title="บัญชี"
        icon={Landmark}
        action={
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
        }
        className="mb-4 sm:mb-6"
      />

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="ประเภทบัญชี" htmlFor="account-type" error={errors.accountType?.message}>
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
                        <SelectItem value="wallet">กระเป๋าเงินดิจิทัล</SelectItem>
                        <SelectItem value="other">อื่น ๆ</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <FormField label="ชื่อบัญชี" htmlFor="account-name" error={errors.accountName?.message}>
                <Input id="account-name" placeholder="เช่น เงินเดือน, บัญชีหลัก" {...register("accountName")} />
              </FormField>

              {currentAccountType === "bank" && (
                <FormField label="เลือกธนาคาร" htmlFor="preset-bank">
                  <Select
                    value={selectedPresetCode}
                    onValueChange={(val) => {
                      if (val === "custom") {
                        // Keep current input
                      } else {
                        const bank = THAI_BANKS.find((b) => b.code === val);
                        if (bank) {
                          setValue("bankName", bank.name, { shouldValidate: true });
                          setValue("bankCode", bank.code, { shouldValidate: true });
                        }
                      }
                    }}
                  >
                    <SelectTrigger id="preset-bank">
                      <SelectValue placeholder="เลือกธนาคารหลัก" />
                    </SelectTrigger>
                    <SelectContent>
                      {THAI_BANKS.map((b) => (
                        <SelectItem key={b.code} value={b.code}>
                          {b.name} ({b.code})
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">ระบุเอง / ธนาคารอื่น ๆ</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              )}

              <FormField label="ชื่อธนาคาร / ผู้ให้บริการ" htmlFor="bank-name" error={errors.bankName?.message}>
                <Input
                  id="bank-name"
                  placeholder="เช่น กสิกรไทย, ไทยพาณิชย์, TrueMoney"
                  {...register("bankName", {
                    onChange: (e) => {
                      const val = e.target.value;
                      const inferred = inferBankCode(val);
                      if (inferred) {
                        setValue("bankCode", inferred, { shouldValidate: true });
                      }
                    },
                  })}
                />
              </FormField>

              <FormField label="รหัสธนาคาร (ตรวจจับอัตโนมัติ)" htmlFor="bank-code" error={errors.bankCode?.message}>
                <Input id="bank-code" placeholder="เช่น KBANK หรือ 004" {...register("bankCode")} />
              </FormField>

              <FormField label="เลขที่บัญชี (ไม่บังคับ)" htmlFor="account-number" error={errors.accountNumberMasked?.message}>
                <Input id="account-number" placeholder="เช่น 123-x-xxxx-4 หรือ 4 ตัวท้าย" {...register("accountNumberMasked")} />
              </FormField>
            </div>

            <BottomSheetFooter>
              <Button
                type="submit"
                disabled={create.isPending || update.isPending}
                className={cn(
                  "min-h-[44px] gap-2 font-bold active:scale-[0.98] transition-all cursor-pointer text-white shadow-md order-1",
                  create.isPending || update.isPending
                    ? "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-85 disabled:bg-emerald-600 disabled:text-white"
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
              >
                {create.isPending || update.isPending ? (
                  <>
                    <Loader2 className="animate-spin size-4 text-white" />
                    <span>กำลังบันทึก...</span>
                  </>
                ) : editing !== null ? (
                  <>
                    <Save className="size-4" />
                    <span>บันทึกการแก้ไข</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-4 stroke-[2.5]" />
                    <span>เพิ่มบัญชี</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={closeForm}
                className="w-full sm:w-auto min-h-[44px] gap-1.5 font-medium border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/70 hover:bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)]/85 hover:text-[var(--pw-ink)] cursor-pointer order-2 active:scale-[0.98] transition-all shadow-2xs"
              >
                <X className="size-4" />
                <span>ยกเลิก</span>
              </Button>
            </BottomSheetFooter>
          </form>
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
                          {a.bankName && a.bankName.trim().toUpperCase() !== theme.badge.trim().toUpperCase() && (
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

                    {/* Middle: Current Balance & Masked Account Number */}
                    <div className="relative z-10 my-3">
                      <span className="text-[11px] text-white/65 font-medium block">ยอดเงินคงเหลือ</span>
                      <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-sm mt-0.5">
                        <AnimatedNumber value={a.currentBalance ?? 0} currency="THB" />
                      </div>
                      <p className="font-mono text-xs sm:text-sm tracking-widest text-white/70 drop-shadow-xs mt-2">
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
                      className="flex-1 sm:flex-none text-xs h-9 min-h-[36px]"
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
                        <Button size="sm" variant="destructive" className="flex-1 sm:flex-none text-xs h-9 min-h-[36px]">
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
