"use client";

import { useState, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
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
import { BottomSheet, BottomSheetFooter } from "@/components/ui/bottom-sheet";
import { ListRowsSkeleton } from "@/components/shared/Skeletons";
import {
  ArrowRight,
  Building2,
  FolderTree,
  Globe,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Search,
  Sparkles,
  Store,
  Trash2,
  X,
} from "lucide-react";

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
  bankReference: "เลขอ้างอิงธนาคาร",
};

export function CategorizationView() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const isAdmin = (user?.roles?.includes("Admin") || user?.roles?.includes("SuperAdmin")) ?? false;
  const canView = isAdmin || (user?.permissions?.includes("CATEGORIZATION_VIEW") ?? false);
  const canManage = isAdmin || (user?.permissions?.includes("CATEGORIZATION_MANAGE") ?? false);

  const { data: merchants, isLoading: merchantsLoading, isError: merchantsError } = useMerchants();
  const { data: rules, isLoading: rulesLoading, isError: rulesError } = useCategoryRules();
  const { data: categories } = useCategories();
  const createMerchant = useCreateMerchant();
  const updateMerchant = useUpdateMerchant();
  const deleteMerchant = useDeleteMerchant();
  const createRule = useCreateCategoryRule();
  const updateRule = useUpdateCategoryRule();
  const deleteRule = useDeleteCategoryRule();

  const [activeTab, setActiveTab] = useState<"rules" | "merchants">("rules");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingMerchant, setEditingMerchant] = useState<MerchantResponse | null>(null);
  const [editingRule, setEditingRule] = useState<CategoryRuleResponse | null>(null);
  const [isMerchantSheetOpen, setIsMerchantSheetOpen] = useState(false);
  const [isRuleSheetOpen, setIsRuleSheetOpen] = useState(false);

  const openCreateMerchant = () => {
    clearMerchantForm();
    setIsMerchantSheetOpen(true);
  };

  const openEditMerchant = (merchant: MerchantResponse) => {
    setEditingMerchant(merchant);
    merchantForm.reset({
      merchantName: merchant.merchantName,
      defaultCategoryId: merchant.defaultCategoryId,
      bankOrProvider: merchant.bankOrProvider,
    });
    setIsMerchantSheetOpen(true);
  };

  const openCreateRule = () => {
    clearRuleForm();
    setIsRuleSheetOpen(true);
  };

  const openEditRule = (rule: CategoryRuleResponse) => {
    setEditingRule(rule);
    ruleForm.reset({
      ruleName: rule.ruleName,
      matchType: rule.matchType,
      matchPattern: rule.matchPattern,
      categoryId: rule.categoryId,
      priority: rule.priority,
    });
    setIsRuleSheetOpen(true);
  };

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
          onSuccess: () => {
            clearMerchantForm();
            setIsMerchantSheetOpen(false);
            toast.success("บันทึกร้านค้าแล้ว");
          },
          onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      createMerchant.mutate(payload, {
        onSuccess: () => {
          clearMerchantForm();
          setIsMerchantSheetOpen(false);
          toast.success("เพิ่มร้านค้าแล้ว");
        },
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
          onSuccess: () => {
            clearRuleForm();
            setIsRuleSheetOpen(false);
            toast.success("บันทึกกฎแล้ว");
          },
          onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      createRule.mutate(values, {
        onSuccess: () => {
          clearRuleForm();
          setIsRuleSheetOpen(false);
          toast.success("เพิ่มกฎแล้ว");
        },
        onError: (reason) => toast.error(reason instanceof ApiError ? reason.message : "เพิ่มกฎไม่สำเร็จ"),
      });
    }
  };

  const isSavingMerchant = createMerchant.isPending || updateMerchant.isPending;
  const isSavingRule = createRule.isPending || updateRule.isPending;

  // Filtered lists
  const filteredRules = useMemo(() => {
    if (!rules) return [];
    if (!searchQuery.trim()) return rules;
    const q = searchQuery.toLowerCase().trim();
    return rules.filter(
      (r) =>
        r.ruleName.toLowerCase().includes(q) ||
        r.matchPattern.toLowerCase().includes(q) ||
        (r.categoryName && r.categoryName.toLowerCase().includes(q)),
    );
  }, [rules, searchQuery]);

  const filteredMerchants = useMemo(() => {
    if (!merchants) return [];
    if (!searchQuery.trim()) return merchants;
    const q = searchQuery.toLowerCase().trim();
    return merchants.filter(
      (m) =>
        m.merchantName.toLowerCase().includes(q) ||
        (m.bankOrProvider && m.bankOrProvider.toLowerCase().includes(q)) ||
        (m.defaultCategoryName && m.defaultCategoryName.toLowerCase().includes(q)),
    );
  }, [merchants, searchQuery]);

  if (!userLoading && !canView) {
    return (
      <div className="space-y-8">
        <Card className="p-8 text-center space-y-4">
          <div className="inline-flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 mx-auto">
            <Sparkles className="size-8" />
          </div>
          <h2 className="text-xl font-bold">ไม่มีสิทธิ์เข้าถึงหน้านี้</h2>
          <p className="text-sm text-[var(--pw-ink)]/70 max-w-md mx-auto">
            คุณไม่ได้รับสิทธิ์ (CATEGORIZATION_VIEW) ในการเข้าถึงหน้าจัดหมวดหมู่อัตโนมัติ กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดสิทธิ์การใช้งาน
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl text-[var(--pw-ink)]">
            <Sparkles className="size-6 text-[var(--pw-primary)]" />
            จัดหมวดหมู่อัตโนมัติ
          </h1>
          <p className="mt-1 text-xs text-[var(--pw-ink)]/65 sm:text-sm">
            จัดการกฎอัจฉริยะและรายชื่อร้านค้าเพื่อช่วยให้ระบบกำหนดหมวดหมู่ให้ธุรกรรมอัตโนมัติ
          </p>
        </div>
        {canManage && (
          <Button
            className="w-full sm:w-auto h-11 sm:h-10 text-sm font-semibold"
            onClick={activeTab === "rules" ? openCreateRule : openCreateMerchant}
          >
            <Plus className="size-4 mr-1.5" />
            {activeTab === "rules" ? "เพิ่มกฎจัดหมวดหมู่" : "เพิ่มร้านค้า"}
          </Button>
        )}
      </div>

      {/* Segmented Tabs & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Segmented Tabs */}
        <div className="flex rounded-xl bg-[var(--pw-surface-indigo)]/30 p-1 border border-[var(--pw-hairline)] w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab("rules")}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-medium transition-all",
              activeTab === "rules"
                ? "bg-[var(--pw-primary)] text-white shadow-sm"
                : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] hover:bg-white/[0.04]",
            )}
          >
            <Sparkles className="size-4" />
            <span>กฎจัดหมวด</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                activeTab === "rules" ? "bg-white/20 text-white" : "bg-[var(--pw-hairline)] text-[var(--pw-ink)]/70",
              )}
            >
              {rules?.length ?? 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("merchants")}
            className={cn(
              "flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-medium transition-all",
              activeTab === "merchants"
                ? "bg-[var(--pw-primary)] text-white shadow-sm"
                : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] hover:bg-white/[0.04]",
            )}
          >
            <Store className="size-4" />
            <span>ร้านค้า</span>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                activeTab === "merchants" ? "bg-white/20 text-white" : "bg-[var(--pw-hairline)] text-[var(--pw-ink)]/70",
              )}
            >
              {merchants?.length ?? 0}
            </span>
          </button>
        </div>

        {/* Instant Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--pw-ink)]/40 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === "rules" ? "ค้นหาชื่อกฎ, คำค้น, หมวดหมู่..." : "ค้นหาชื่อร้านค้า, ธนาคาร..."}
            className="pl-9 pr-8 h-10 text-xs sm:text-sm bg-[var(--pw-surface)]/70 border-[var(--pw-hairline)]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--pw-ink)]/40 hover:text-[var(--pw-ink)]"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Rules List */}
      {activeTab === "rules" && (
        <section className="space-y-3">
          {rulesLoading ? (
            <ListRowsSkeleton count={4} />
          ) : rulesError ? (
            <p role="alert" className="text-[var(--pw-expense)]">โหลดกฎจัดหมวดหมู่ไม่สำเร็จ</p>
          ) : !filteredRules.length ? (
            <Card className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border-[var(--pw-hairline)] bg-[var(--pw-surface)]/70">
              <Sparkles className="mb-3 size-12 opacity-30 text-[var(--pw-primary)]" />
              <p className="font-semibold text-base text-[var(--pw-ink)]">
                {searchQuery ? "ไม่พบกฎที่ตรงกับคำค้นหา" : "ยังไม่มีกฎจัดหมวดหมู่อัตโนมัติ"}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-[var(--pw-ink)]/60 max-w-sm">
                {searchQuery
                  ? "ลองเปลี่ยนคำค้นหา หรือล้างคำค้นเพื่อดูกฎทั้งหมด"
                  : "เมื่อคุณจัดหมวดหมู่รายการด้วยตนเอง ระบบจะช่วยเรียนรู้ หรือกดปุ่มเพิ่มกฎด้านบน"}
              </p>
              {canManage && !searchQuery && (
                <Button size="sm" className="mt-4" onClick={openCreateRule}>
                  <Plus className="size-4 mr-1.5" />
                  เพิ่มกฎแรก
                </Button>
              )}
            </Card>
          ) : (
            <AnimatedList className="space-y-2.5 sm:space-y-3">
              {filteredRules.map((rule) => (
                <AnimatedListItem key={rule.categoryRuleId}>
                  <Card className="p-3.5 sm:p-4 border-[var(--pw-hairline)] bg-[var(--pw-surface)]/80 hover:border-[var(--pw-primary)]/40 transition-colors">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                      {/* Rule Info */}
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-sm sm:text-base text-[var(--pw-ink)] truncate">
                            {rule.ruleName}
                          </p>
                          {rule.isGlobal && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] px-2 py-0.5 text-[10px] text-[var(--pw-ink)]/70">
                              <Globe className="size-3 text-[var(--pw-link)]" />
                              ส่วนกลาง
                            </span>
                          )}
                          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] text-[var(--pw-ink)]/60">
                            ลำดับ #{rule.priority}
                          </span>
                        </div>

                        {/* Match Criteria Visual */}
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--pw-ink)]/75">
                          <span className="text-[var(--pw-ink)]/45">เมื่อ</span>
                          <span className="rounded bg-[var(--pw-surface-indigo)]/50 px-1.5 py-0.5 font-medium text-[var(--pw-primary)]">
                            {matchTypeLabels[rule.matchType]}
                          </span>
                          <span className="text-[var(--pw-ink)]/45">ตรงกับ:</span>
                          <span className="font-mono rounded bg-white/[0.05] px-1.5 py-0.5 text-[var(--pw-ink)]">
                            &ldquo;{rule.matchPattern}&rdquo;
                          </span>
                          <ArrowRight className="size-3 text-[var(--pw-ink)]/40" />
                          <span className="inline-flex items-center gap-1 rounded bg-[var(--pw-green)]/15 px-2 py-0.5 font-semibold text-[var(--pw-green)]">
                            <FolderTree className="size-3" />
                            {rule.categoryName ?? "ไม่พบหมวด"}
                          </span>
                        </div>
                      </div>

                      {/* Rule Actions */}
                      {!rule.isGlobal && canManage && (
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0 border-t border-[var(--pw-hairline)]/40 sm:border-t-0 w-full sm:w-auto justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openEditRule(rule)}
                            className="h-8 px-2.5 text-xs"
                          >
                            <Pencil className="size-3.5 mr-1" />
                            แก้ไข
                          </Button>
                          <ConfirmDialog
                            title="ลบกฎจัดหมวดหมู่นี้?"
                            description={`คุณแน่ใจหรือไม่ว่าต้องการลบกฎ "${rule.ruleName}"? ระบบจะไม่ใช้กฎนี้ในการแนะนำหมวดหมู่อีก`}
                            confirmLabel="ลบกฎ"
                            pending={deleteRule.isPending}
                            onConfirm={() =>
                              deleteRule.mutate(rule.categoryRuleId, {
                                onSuccess: () => toast.success("ลบกฎเรียบร้อยแล้ว"),
                                onError: (reason) =>
                                  toast.error(reason instanceof ApiError ? reason.message : "ลบไม่สำเร็จ"),
                              })
                            }
                            trigger={
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 px-2.5 text-xs"
                                aria-label={`ลบกฎ ${rule.ruleName}`}
                              >
                                <Trash2 className="size-3.5 mr-1" />
                                ลบ
                              </Button>
                            }
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                </AnimatedListItem>
              ))}
            </AnimatedList>
          )}
        </section>
      )}

      {/* Tab 2: Merchants List */}
      {activeTab === "merchants" && (
        <section className="space-y-3">
          {merchantsLoading ? (
            <ListRowsSkeleton count={4} />
          ) : merchantsError ? (
            <p role="alert" className="text-[var(--pw-expense)]">โหลดร้านค้าไม่สำเร็จ</p>
          ) : !filteredMerchants.length ? (
            <Card className="flex flex-col items-center justify-center p-8 sm:p-12 text-center border-[var(--pw-hairline)] bg-[var(--pw-surface)]/70">
              <Store className="mb-3 size-12 opacity-30 text-[var(--pw-primary)]" />
              <p className="font-semibold text-base text-[var(--pw-ink)]">
                {searchQuery ? "ไม่พบร้านค้าที่ตรงกับคำค้นหา" : "ยังไม่มีข้อมูลร้านค้า"}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-[var(--pw-ink)]/60 max-w-sm">
                {searchQuery
                  ? "ลองเปลี่ยนคำค้นหา หรือล้างคำค้นเพื่อดูรายชื่อทั้งหมด"
                  : "เพิ่มร้านค้าเพื่อกำหนดหมวดหมู่เริ่มต้นเมื่อตรวจพบรายการจากร้านค้านี้"}
              </p>
              {canManage && !searchQuery && (
                <Button size="sm" className="mt-4" onClick={openCreateMerchant}>
                  <Plus className="size-4 mr-1.5" />
                  เพิ่มร้านค้าแรก
                </Button>
              )}
            </Card>
          ) : (
            <AnimatedList className="space-y-2.5 sm:space-y-3">
              {filteredMerchants.map((merchant) => (
                <AnimatedListItem key={merchant.merchantId}>
                  <Card className="p-3.5 sm:p-4 border-[var(--pw-hairline)] bg-[var(--pw-surface)]/80 hover:border-[var(--pw-primary)]/40 transition-colors">
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                      {/* Merchant Info */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <Store className="size-4 shrink-0 text-[var(--pw-primary)]" />
                          <p className="font-semibold text-sm sm:text-base text-[var(--pw-ink)] truncate">
                            {merchant.merchantName}
                          </p>
                          {merchant.bankOrProvider && (
                            <span className="inline-flex items-center gap-1 rounded bg-[var(--pw-surface-indigo)]/50 border border-[var(--pw-hairline)] px-2 py-0.5 text-[10px] text-[var(--pw-ink)]/70">
                              <Building2 className="size-3" />
                              {merchant.bankOrProvider}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-[var(--pw-ink)]/70">
                          <span className="text-[var(--pw-ink)]/40">หมวดเริ่มต้น:</span>
                          {merchant.defaultCategoryName ? (
                            <span className="inline-flex items-center gap-1 font-medium text-[var(--pw-link)]">
                              <FolderTree className="size-3" />
                              {merchant.defaultCategoryName}
                            </span>
                          ) : (
                            <span className="text-[var(--pw-ink)]/45">ไม่ระบุหมวดหมู่</span>
                          )}
                        </div>
                      </div>

                      {/* Merchant Actions */}
                      {canManage && (
                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0 pt-2 sm:pt-0 border-t border-[var(--pw-hairline)]/40 sm:border-t-0 w-full sm:w-auto justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openEditMerchant(merchant)}
                            className="h-8 px-2.5 text-xs"
                          >
                            <Pencil className="size-3.5 mr-1" />
                            แก้ไข
                          </Button>
                          <ConfirmDialog
                            title="ลบร้านค้านี้?"
                            description={`คุณแน่ใจหรือไม่ว่าต้องการลบ "${merchant.merchantName}"? ระบบจะไม่นำร้านค้านี้มาแนะนำหมวดหมู่อีก`}
                            confirmLabel="ลบร้านค้า"
                            pending={deleteMerchant.isPending}
                            onConfirm={() =>
                              deleteMerchant.mutate(merchant.merchantId, {
                                onSuccess: () => toast.success("ลบร้านค้าเรียบร้อยแล้ว"),
                                onError: (reason) =>
                                  toast.error(reason instanceof ApiError ? reason.message : "ลบไม่สำเร็จ"),
                              })
                            }
                            trigger={
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 px-2.5 text-xs"
                                aria-label={`ลบร้านค้า ${merchant.merchantName}`}
                              >
                                <Trash2 className="size-3.5 mr-1" />
                                ลบ
                              </Button>
                            }
                          />
                        </div>
                      )}
                    </div>
                  </Card>
                </AnimatedListItem>
              ))}
            </AnimatedList>
          )}
        </section>
      )}

      {/* Modal: Add/Edit Merchant in BottomSheet */}
      {canManage && (
        <BottomSheet
          open={isMerchantSheetOpen}
          onOpenChange={(open) => {
            if (!open) clearMerchantForm();
            setIsMerchantSheetOpen(open);
          }}
          title={editingMerchant ? "แก้ไขร้านค้า" : "เพิ่มร้านค้าใหม่"}
          description="ระบุชื่อร้านค้า ผู้ให้บริการ และหมวดหมู่เริ่มต้น"
        >
          <form onSubmit={merchantForm.handleSubmit(onMerchantSubmit)} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="ชื่อร้านค้า"
                htmlFor="merchant-name"
                error={merchantForm.formState.errors.merchantName?.message}
              >
                <Input
                  id="merchant-name"
                  placeholder="เช่น 7-Eleven, Cafe Amazon"
                  {...merchantForm.register("merchantName")}
                />
              </FormField>
              <FormField
                label="ผู้ให้บริการ / ธนาคาร"
                htmlFor="merchant-provider"
                error={merchantForm.formState.errors.bankOrProvider?.message}
              >
                <Input
                  id="merchant-provider"
                  placeholder="เช่น SCB, TrueMoney, KBank"
                  {...merchantForm.register("bankOrProvider")}
                />
              </FormField>
              <FormField
                label="หมวดหมู่เริ่มต้น"
                htmlFor="merchant-category"
                error={merchantForm.formState.errors.defaultCategoryId?.message}
                className="sm:col-span-2"
              >
                <Controller
                  control={merchantForm.control}
                  name="defaultCategoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value == null ? "none" : String(field.value)}
                      onValueChange={(value) => field.onChange(value === "none" ? null : Number(value))}
                    >
                      <SelectTrigger id="merchant-category" className="w-full">
                        <SelectValue placeholder="— ไม่ระบุ —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— ไม่ระบุ —</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.categoryId} value={String(category.categoryId)}>
                              {category.categoryName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
            </div>

            <BottomSheetFooter>
              <Button
                type="submit"
                disabled={isSavingMerchant}
                className="h-11 sm:h-10 font-semibold"
              >
                {isSavingMerchant ? (
                  <LoaderCircle className="animate-spin mr-1.5 size-4" />
                ) : editingMerchant ? (
                  <Save className="mr-1.5 size-4" />
                ) : (
                  <Plus className="mr-1.5 size-4" />
                )}
                {editingMerchant ? "บันทึกร้านค้า" : "เพิ่มร้านค้า"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 sm:h-10"
                onClick={() => {
                  clearMerchantForm();
                  setIsMerchantSheetOpen(false);
                }}
              >
                <X className="size-4 mr-1.5" />
                ยกเลิก
              </Button>
            </BottomSheetFooter>
          </form>
        </BottomSheet>
      )}

      {/* Modal: Add/Edit Rule in BottomSheet */}
      {canManage && (
        <BottomSheet
          open={isRuleSheetOpen}
          onOpenChange={(open) => {
            if (!open) clearRuleForm();
            setIsRuleSheetOpen(open);
          }}
          title={editingRule ? "แก้ไขกฎจัดหมวดหมู่" : "เพิ่มกฎจัดหมวดหมู่ใหม่"}
          description="กำหนดเงื่อนไขการจับคู่และหมวดหมู่ที่ต้องการให้ระบบจัดให้อัตโนมัติ"
        >
          <form onSubmit={ruleForm.handleSubmit(onRuleSubmit)} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="ชื่อกฎ"
                htmlFor="rule-name"
                error={ruleForm.formState.errors.ruleName?.message}
              >
                <Input
                  id="rule-name"
                  placeholder="เช่น กาแฟยามเช้า, บิลค่าไฟ"
                  {...ruleForm.register("ruleName")}
                />
              </FormField>
              <FormField
                label="จับคู่จาก"
                htmlFor="rule-match-type"
                error={ruleForm.formState.errors.matchType?.message}
              >
                <Controller
                  control={ruleForm.control}
                  name="matchType"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="rule-match-type" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="description">รายละเอียดรายการ</SelectItem>
                        <SelectItem value="merchantName">ชื่อร้านค้า</SelectItem>
                        <SelectItem value="bankReference">เลขอ้างอิงธนาคาร</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                label="ข้อความที่ใช้จับคู่ (Keyword/Pattern)"
                htmlFor="rule-pattern"
                error={ruleForm.formState.errors.matchPattern?.message}
              >
                <Input
                  id="rule-pattern"
                  placeholder="เช่น Starbucks, การไฟฟ้านครหลวง"
                  {...ruleForm.register("matchPattern")}
                />
              </FormField>
              <FormField
                label="หมวดหมู่ที่ต้องการกำหนด"
                htmlFor="rule-category"
                error={ruleForm.formState.errors.categoryId?.message}
              >
                <Controller
                  control={ruleForm.control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value > 0 ? String(field.value) : "none"}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? 0 : Number(value))
                      }
                    >
                      <SelectTrigger id="rule-category" className="w-full">
                        <SelectValue placeholder="เลือกหมวดหมู่" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">เลือกหมวดหมู่</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem
                            key={category.categoryId}
                            value={String(category.categoryId)}
                          >
                            {category.categoryName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField
                label="ลำดับความสำคัญ (ค่าน้อยประมวลผลก่อน)"
                htmlFor="rule-priority"
                error={ruleForm.formState.errors.priority?.message}
                className="sm:col-span-2"
              >
                <NumberInput
                  id="rule-priority"
                  min={0}
                  step={1}
                  enableQuickMath
                  {...ruleForm.register("priority")}
                />
              </FormField>
            </div>

            <BottomSheetFooter>
              <Button
                type="submit"
                disabled={isSavingRule}
                className="h-11 sm:h-10 font-semibold"
              >
                {isSavingRule ? (
                  <LoaderCircle className="animate-spin mr-1.5 size-4" />
                ) : editingRule ? (
                  <Save className="mr-1.5 size-4" />
                ) : (
                  <Plus className="mr-1.5 size-4" />
                )}
                {editingRule ? "บันทึกกฎ" : "เพิ่มกฎ"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 sm:h-10"
                onClick={() => {
                  clearRuleForm();
                  setIsRuleSheetOpen(false);
                }}
              >
                <X className="size-4 mr-1.5" />
                ยกเลิก
              </Button>
            </BottomSheetFooter>
          </form>
        </BottomSheet>
      )}
    </div>
  );
}
