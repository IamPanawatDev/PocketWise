"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCategories } from "@/features/categories/hooks/useCategories";
import {
  useCategoryRules,
  useCreateCategoryRule,
  useCreateMerchant,
  useDeleteCategoryRule,
  useDeleteMerchant,
  useMerchants,
  useUpdateCategoryRule,
  useUpdateMerchant,
} from "@/features/categorization/hooks/useCategorization";
import {
  categoryRuleSchema,
  merchantSchema,
  type CategoryRuleFormValues,
  type MerchantFormValues,
} from "@/schemas/categorization.schema";
import type { CategoryRuleResponse, MerchantResponse } from "@/types/categorization.types";
import { zodResolver } from "@/lib/zod-resolver";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoaderCircle, Pencil, Plus, Save, Sparkles, Store, Trash2, X } from "lucide-react";

const initialMerchant: MerchantFormValues = {
  merchantName: "",
  defaultCategoryId: null,
  bankOrProvider: null,
};

const initialRule: CategoryRuleFormValues = {
  ruleName: "",
  matchType: "description",
  matchPattern: "",
  categoryId: 0,
  priority: 100,
};

const matchTypeLabels = {
  merchantName: "ชื่อร้านค้า",
  description: "รายละเอียดรายการ",
  bankReference: "เลขอ้างอิงธนาคาร (Phase 7)",
};

export function CategorizationView() {
  const { data: merchants, isLoading: merchantsLoading, isError: merchantsError } = useMerchants();
  const { data: rules, isLoading: rulesLoading, isError: rulesError } = useCategoryRules();
  const { data: categories } = useCategories();
  const createMerchant = useCreateMerchant();
  const updateMerchant = useUpdateMerchant();
  const deleteMerchant = useDeleteMerchant();
  const createRule = useCreateCategoryRule();
  const updateRule = useUpdateCategoryRule();
  const deleteRule = useDeleteCategoryRule();
  const [editingMerchant, setEditingMerchant] = useState<MerchantResponse | null>(null);
  const [editingRule, setEditingRule] = useState<CategoryRuleResponse | null>(null);

  const merchantForm = useForm<MerchantFormValues>({
    resolver: zodResolver(merchantSchema),
    defaultValues: initialMerchant,
  });
  const ruleForm = useForm<CategoryRuleFormValues>({
    resolver: zodResolver(categoryRuleSchema),
    defaultValues: initialRule,
  });

  const clearMerchantForm = () => {
    setEditingMerchant(null);
    merchantForm.reset(initialMerchant);
  };
  const clearRuleForm = () => {
    setEditingRule(null);
    ruleForm.reset(initialRule);
  };

  const onMerchantSubmit = (values: MerchantFormValues) => {
    const payload = {
      ...values,
      defaultCategoryId: values.defaultCategoryId ?? null,
      bankOrProvider: values.bankOrProvider || null,
    };
    if (editingMerchant) {
      updateMerchant.mutate(
        {
          id: editingMerchant.merchantId,
          body: { ...payload, isVerified: editingMerchant.isVerified },
        },
        {
          onSuccess: () => { clearMerchantForm(); toast.success("บันทึกร้านค้าแล้ว"); },
          onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      createMerchant.mutate(payload, {
        onSuccess: () => { clearMerchantForm(); toast.success("เพิ่มร้านค้าแล้ว"); },
        onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "เพิ่มไม่สำเร็จ"),
      });
    }
  };

  const onRuleSubmit = (values: CategoryRuleFormValues) => {
    if (editingRule) {
      updateRule.mutate(
        {
          id: editingRule.categoryRuleId,
          body: { ...values, isActive: editingRule.isActive },
        },
        {
          onSuccess: () => { clearRuleForm(); toast.success("บันทึกกฎแล้ว"); },
          onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      createRule.mutate(values, {
        onSuccess: () => { clearRuleForm(); toast.success("เพิ่มกฎแล้ว"); },
        onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "เพิ่มกฎไม่สำเร็จ"),
      });
    }
  };

  const isSavingMerchant = createMerchant.isPending || updateMerchant.isPending;
  const isSavingRule = createRule.isPending || updateRule.isPending;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="size-6 text-[var(--pw-primary)]" />
          จัดหมวดหมู่อัตโนมัติ
        </h1>
        <p className="text-sm text-[var(--pw-ink)]/65">
          ระบบแนะนำหมวดจากกฎของคุณก่อน แล้วจึงตรวจชื่อร้านค้า; เมื่อเลือกรายการและหมวดเอง ระบบจะเรียนรู้กฎรายละเอียดให้
        </p>
      </header>

      <section>
        <Card className="mb-4 p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
            <Store className="size-5 text-[var(--pw-primary)]" />
            {editingMerchant ? "แก้ไขร้านค้า" : "เพิ่มร้านค้า"}
          </h2>
          <form onSubmit={merchantForm.handleSubmit(onMerchantSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="ชื่อร้านค้า" htmlFor="merchant-name" error={merchantForm.formState.errors.merchantName?.message}>
                <Input id="merchant-name" {...merchantForm.register("merchantName")} />
              </FormField>
              <FormField label="ผู้ให้บริการ/ธนาคาร" htmlFor="merchant-provider" error={merchantForm.formState.errors.bankOrProvider?.message}>
                <Input id="merchant-provider" {...merchantForm.register("bankOrProvider")} />
              </FormField>
              <FormField label="หมวดหมู่เริ่มต้น (system category)" htmlFor="merchant-category" error={merchantForm.formState.errors.defaultCategoryId?.message}>
                <Controller control={merchantForm.control} name="defaultCategoryId" render={({ field }) => (
                  <Select
                    value={field.value == null ? "none" : String(field.value)}
                    onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))}
                  >
                    <SelectTrigger id="merchant-category"><SelectValue placeholder="— ไม่ระบุ —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                      {categories?.filter((category) => category.isSystem).map((category) => (
                        <SelectItem key={category.categoryId} value={String(category.categoryId)}>{category.categoryName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={isSavingMerchant} className="w-full sm:w-auto">
                {isSavingMerchant ? <LoaderCircle className="animate-spin" /> : editingMerchant ? <Save /> : <Plus />}
                {editingMerchant ? "บันทึกร้านค้า" : "เพิ่มร้านค้า"}
              </Button>
              {editingMerchant && (
                <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={clearMerchantForm}>
                  <X />
                  ยกเลิก
                </Button>
              )}
            </div>
          </form>
        </Card>
        {merchantsLoading ? (
          <p role="status" className="text-[var(--pw-ink)]/70">กำลังโหลดร้านค้า...</p>
        ) : merchantsError ? (
          <p role="alert" className="text-[var(--pw-expense)]">โหลดร้านค้าไม่สำเร็จ</p>
        ) : !merchants?.length ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center">
            <Store className="mb-2 size-10 opacity-35 text-[var(--pw-primary)]" />
            <p className="font-medium text-[var(--pw-ink)]">ยังไม่มีร้านค้าเพิ่มเอง</p>
            <p className="mt-1 text-xs text-[var(--pw-ink)]/60">เพิ่มร้านค้าจากฟอร์มด้านบนเพื่อกำหนดหมวดหมู่เริ่มต้น</p>
          </Card>
        ) : (
          <Card className="p-0">
            <ul>
              {merchants.map((merchant) => (
                <li key={merchant.merchantId} className="flex flex-col gap-3 border-b border-[var(--pw-hairline)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{merchant.merchantName}</p>
                    <p className="text-sm text-[var(--pw-ink)]/60">
                      {merchant.bankOrProvider ?? "ไม่ระบุผู้ให้บริการ"}
                      {merchant.defaultCategoryName ? ` · ${merchant.defaultCategoryName}` : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => {
                      setEditingMerchant(merchant);
                      merchantForm.reset({
                        merchantName: merchant.merchantName,
                        defaultCategoryId: merchant.defaultCategoryId,
                        bankOrProvider: merchant.bankOrProvider,
                      });
                    }}><Pencil />แก้ไข</Button>
                    <ConfirmDialog
                      title="ลบร้านค้านี้?"
                      description="ระบบจะไม่นำร้านค้านี้มาแนะนำหมวดหมู่อีก"
                      confirmLabel="ลบ"
                      pending={deleteMerchant.isPending}
                      onConfirm={() => deleteMerchant.mutate(merchant.merchantId, {
                        onSuccess: () => toast.success("ลบร้านค้าแล้ว"),
                        onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "ลบไม่สำเร็จ"),
                      })}
                      trigger={<Button size="sm" variant="destructive" aria-label={`ลบร้านค้า ${merchant.merchantName}`}><Trash2 />ลบ</Button>}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <Card className="mb-4 p-4 sm:p-6">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
            <Sparkles className="size-5 text-[var(--pw-primary)]" />
            {editingRule ? "แก้ไขกฎ" : "เพิ่มกฎจัดหมวดหมู่"}
          </h2>
          <p className="mb-4 text-xs text-[var(--pw-ink)]/60">
            กฎเลขอ้างอิงธนาคารเก็บไว้สำหรับข้อมูลนำเข้าใน Phase 7; transaction ที่บันทึกด้วยตนเองจับคู่จากรายละเอียดหรือชื่อร้านค้า
          </p>
          <form onSubmit={ruleForm.handleSubmit(onRuleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="ชื่อกฎ" htmlFor="rule-name" error={ruleForm.formState.errors.ruleName?.message}>
                <Input id="rule-name" {...ruleForm.register("ruleName")} />
              </FormField>
              <FormField label="จับคู่จาก" htmlFor="rule-match-type" error={ruleForm.formState.errors.matchType?.message}>
                <Controller control={ruleForm.control} name="matchType" render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="rule-match-type"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="description">รายละเอียดรายการ</SelectItem>
                      <SelectItem value="merchantName">ชื่อร้านค้า</SelectItem>
                      <SelectItem value="bankReference">เลขอ้างอิงธนาคาร (Phase 7)</SelectItem>
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="ข้อความที่ใช้จับคู่" htmlFor="rule-pattern" error={ruleForm.formState.errors.matchPattern?.message}>
                <Input id="rule-pattern" {...ruleForm.register("matchPattern")} />
              </FormField>
              <FormField label="หมวดหมู่" htmlFor="rule-category" error={ruleForm.formState.errors.categoryId?.message}>
                <Controller control={ruleForm.control} name="categoryId" render={({ field }) => (
                  <Select value={field.value > 0 ? String(field.value) : "none"} onValueChange={(value) => field.onChange(value === "none" ? 0 : Number(value))}>
                    <SelectTrigger id="rule-category"><SelectValue placeholder="เลือกหมวดหมู่" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">เลือกหมวดหมู่</SelectItem>
                      {categories?.map((category) => (
                        <SelectItem key={category.categoryId} value={String(category.categoryId)}>{category.categoryName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )} />
              </FormField>
              <FormField label="ลำดับความสำคัญ (ค่าน้อยมาก่อน)" htmlFor="rule-priority" error={ruleForm.formState.errors.priority?.message}>
                <NumberInput id="rule-priority" min={0} step={1} {...ruleForm.register("priority")} />
              </FormField>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button type="submit" disabled={isSavingRule} className="w-full sm:w-auto">
                {isSavingRule ? <LoaderCircle className="animate-spin" /> : editingRule ? <Save /> : <Plus />}
                {editingRule ? "บันทึกกฎ" : "เพิ่มกฎ"}
              </Button>
              {editingRule && (
                <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={clearRuleForm}>
                  <X />
                  ยกเลิก
                </Button>
              )}
            </div>
          </form>
        </Card>
        {rulesLoading ? (
          <p role="status" className="text-[var(--pw-ink)]/70">กำลังโหลดกฎ...</p>
        ) : rulesError ? (
          <p role="alert" className="text-[var(--pw-expense)]">โหลดกฎไม่สำเร็จ</p>
        ) : !rules?.length ? (
          <Card className="flex flex-col items-center justify-center p-8 text-center">
            <Sparkles className="mb-2 size-10 opacity-35 text-[var(--pw-primary)]" />
            <p className="font-medium text-[var(--pw-ink)]">ยังไม่มีกฎจัดหมวดหมู่</p>
            <p className="mt-1 text-xs text-[var(--pw-ink)]/60">เมื่อเลือกหมวดให้รายการ ระบบจะเรียนรู้กฎให้อัตโนมัติ หรือเพิ่มกฎเองด้านบน</p>
          </Card>
        ) : (
          <Card className="p-0">
            <ul>
              {rules.map((rule) => (
                <li key={rule.categoryRuleId} className="flex flex-col gap-3 border-b border-[var(--pw-hairline)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words font-medium">{rule.ruleName}{rule.isGlobal && <span className="ml-2 text-xs text-[var(--pw-ink)]/50">(ส่วนกลาง)</span>}</p>
                    <p className="break-words text-sm text-[var(--pw-ink)]/60">
                      {matchTypeLabels[rule.matchType]}: “{rule.matchPattern}” · {rule.categoryName ?? "ไม่พบหมวด"}
                    </p>
                  </div>
                  {!rule.isGlobal && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => {
                        setEditingRule(rule);
                        ruleForm.reset({
                          ruleName: rule.ruleName,
                          matchType: rule.matchType,
                          matchPattern: rule.matchPattern,
                          categoryId: rule.categoryId,
                          priority: rule.priority,
                        });
                      }}><Pencil />แก้ไข</Button>
                      <ConfirmDialog
                        title="ลบกฎนี้?"
                        description="กฎนี้จะไม่แนะนำหมวดหมู่อีก"
                        confirmLabel="ลบ"
                        pending={deleteRule.isPending}
                        onConfirm={() => deleteRule.mutate(rule.categoryRuleId, {
                          onSuccess: () => toast.success("ลบกฎแล้ว"),
                          onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "ลบไม่สำเร็จ"),
                        })}
                        trigger={<Button size="sm" variant="destructive" aria-label={`ลบกฎ ${rule.ruleName}`}><Trash2 />ลบ</Button>}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
