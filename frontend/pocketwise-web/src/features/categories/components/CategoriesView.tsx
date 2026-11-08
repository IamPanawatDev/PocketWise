"use client";

import { Controller, useForm } from "react-hook-form";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { categorySchema, type CategoryFormValues } from "@/schemas/category.schema";
import { zodResolver } from "@/lib/zod-resolver";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useReorderCategories,
  useUpdateCategory,
} from "@/features/categories/hooks/useCategories";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { BottomSheet, BottomSheetFooter } from "@/components/ui/bottom-sheet";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/EmptyState";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ListRowsSkeleton } from "@/components/shared/Skeletons";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  FolderTree,
  Loader2,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  X,
} from "lucide-react";

const initialCategoryValues: CategoryFormValues = {
  categoryName: "",
  categoryType: "expense",
  icon: null,
  color: null,
};

export function CategoriesView() {
  const { data, isLoading } = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();
  const reorder = useReorderCategories();

  const [editing, setEditing] = useState<{ id: number; name: string; type: string } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");

  const filteredCategories = useMemo(() => {
    if (!data) return [];
    return data.filter((c) => {
      const matchesSearch = !searchQuery.trim() || c.categoryName.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesType =
        typeFilter === "all" ||
        (typeFilter === "expense" && c.categoryType?.toLowerCase() === "expense") ||
        (typeFilter === "income" && c.categoryType?.toLowerCase() === "income");
      return matchesSearch && matchesType;
    });
  }, [data, searchQuery, typeFilter]);

  const expenseCount = data?.filter((c) => c.categoryType?.toLowerCase() === "expense").length ?? 0;
  const incomeCount = data?.filter((c) => c.categoryType?.toLowerCase() === "income").length ?? 0;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: initialCategoryValues,
  });

  const clearForm = () => {
    setEditing(null);
    reset(initialCategoryValues);
  };

  const closeForm = () => {
    clearForm();
    setIsFormOpen(false);
  };

  const onSubmit = (values: CategoryFormValues) => {
    if (editing) {
      update.mutate(
        {
          id: editing.id,
          body: { ...values, icon: values.icon ?? null, color: values.color ?? null, isActive: true },
        },
        {
          onSuccess: () => {
            closeForm();
            toast.success("บันทึกหมวดหมู่แล้ว");
          },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(
        { ...values, icon: values.icon ?? null, color: values.color ?? null },
        {
          onSuccess: () => {
            closeForm();
            toast.success("เพิ่มหมวดหมู่แล้ว");
          },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "เพิ่มไม่สำเร็จ"),
        },
      );
    }
  };

  const startEdit = (c: { categoryId: number; categoryName: string; categoryType: string }) => {
    setEditing({ id: c.categoryId, name: c.categoryName, type: c.categoryType });
    reset({
      categoryName: c.categoryName,
      categoryType: (c.categoryType?.toLowerCase() as CategoryFormValues["categoryType"]) ?? "expense",
      icon: null,
      color: null,
    });
    setIsFormOpen(true);
  };

  const moveCategory = (categoryId: number, offset: -1 | 1) => {
    if (!data) return;
    const index = data.findIndex((category) => category.categoryId === categoryId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= data.length) return;

    const newList = [...data];
    const [moved] = newList.splice(index, 1);
    newList.splice(target, 0, moved);

    reorder.mutate({
      items: newList.map((category, sortOrder) => ({
        categoryId: category.categoryId,
        sortOrder,
      })),
    });
  };

  const getCategoryTypeBadge = (type?: string) => {
    const t = type?.toLowerCase();
    if (t === "expense") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-medium text-rose-600 dark:text-rose-400">
          <ArrowDownRight className="size-3" />
          รายจ่าย
        </span>
      );
    }
    if (t === "income") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
          <ArrowUpRight className="size-3" />
          รายรับ
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:text-blue-400">
        <ArrowUpDown className="size-3" />
        ทั้งคู่
      </span>
    );
  };

  const reorderableCategories = data?.filter((category) => !category.isSystem) ?? [];

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <FolderTree className="size-6 text-[var(--pw-primary)]" />
            หมวดหมู่
          </h1>
          <p className="mt-1 text-sm text-[var(--pw-ink)]/65">
            จัดหมวดหมู่รายรับและรายจ่ายเพื่อวิเคราะห์พฤติกรรมการใช้เงิน
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
          เพิ่มหมวดหมู่
        </Button>
      </div>

      {/* Form in BottomSheet */}
      <BottomSheet
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
          else setIsFormOpen(true);
        }}
        title={editing ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
        description="ระบุชื่อและประเภทของหมวดหมู่"
      >
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="ชื่อหมวดหมู่" htmlFor="category-name" error={errors.categoryName?.message}>
                <Input id="category-name" placeholder="เช่น อาหาร, การเดินทาง, เงินเดือน" {...register("categoryName")} />
              </FormField>
              <FormField label="ประเภท" htmlFor="category-type" error={errors.categoryType?.message}>
                <Controller
                  control={control}
                  name="categoryType"
                  render={({ field }) => (
                    <div id="category-type" className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="ประเภทหมวดหมู่">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={field.value === "expense"}
                        onClick={() => field.onChange("expense")}
                        className={cn(
                          "flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
                          field.value === "expense"
                            ? "border-[var(--pw-expense)] bg-[var(--pw-expense)] text-white shadow-sm"
                            : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-expense)] hover:text-[var(--pw-expense)]",
                        )}
                      >
                        <ArrowDownRight className="size-4" />
                        รายจ่าย
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={field.value === "income"}
                        onClick={() => field.onChange("income")}
                        className={cn(
                          "flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
                          field.value === "income"
                            ? "border-[var(--pw-green)] bg-[var(--pw-green)] text-[var(--pw-on-green)] font-semibold shadow-sm"
                            : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-green)] hover:text-[var(--pw-green)]",
                        )}
                      >
                        <ArrowUpRight className="size-4" />
                        รายรับ
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={field.value === "both"}
                        onClick={() => field.onChange("both")}
                        className={cn(
                          "flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
                          field.value === "both"
                            ? "border-[var(--pw-primary)] bg-[var(--pw-primary)] text-[var(--pw-primary-foreground)] shadow-sm"
                            : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-primary)] hover:text-[var(--pw-primary)]",
                        )}
                      >
                        <ArrowUpDown className="size-4" />
                        ทั้งคู่
                      </button>
                    </div>
                  )}
                />
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
                ) : editing ? (
                  <>
                    <Save className="size-4" />
                    <span>บันทึกการแก้ไข</span>
                  </>
                ) : (
                  <>
                    <Plus className="size-4 stroke-[2.5]" />
                    <span>เพิ่มหมวดหมู่</span>
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
        </div>
      </BottomSheet>

      {/* Search & Segmented Filter Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--pw-ink)]/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาหมวดหมู่..."
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--pw-ink)]/40 hover:text-[var(--pw-ink)] p-1"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Type Segmented Buttons */}
        <div className="flex items-center gap-1.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/70 p-1">
          <button
            type="button"
            onClick={() => setTypeFilter("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              typeFilter === "all"
                ? "bg-[var(--pw-primary)] text-white shadow-xs"
                : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]"
            )}
          >
            ทั้งหมด ({data?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("expense")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              typeFilter === "expense"
                ? "bg-rose-500 text-white shadow-xs"
                : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]"
            )}
          >
            รายจ่าย ({expenseCount})
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter("income")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
              typeFilter === "income"
                ? "bg-emerald-500 text-white shadow-xs"
                : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]"
            )}
          >
            รายรับ ({incomeCount})
          </button>
        </div>
      </div>

      {/* Categories List */}
      {isLoading ? (
        <ListRowsSkeleton count={6} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={FolderTree}
          title="ยังไม่มีหมวดหมู่รายรับ-รายจ่าย"
          description="จัดกลุ่มรายการธุรกรรมเพื่อวิเคราะห์พฤติกรรมการใช้จ่ายของคุณได้อย่างมีประสิทธิภาพ"
          actionLabel="เพิ่มหมวดหมู่แรก"
          actionIcon={Plus}
          onAction={() => {
            setEditing(null);
            reset(initialCategoryValues);
            setIsFormOpen(true);
          }}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <AnimatedList>
            {filteredCategories.map((c) => {
              const index = data.findIndex(
                (category) => category.categoryId === c.categoryId,
              );
              const canMoveUp = index > 0;
              const canMoveDown = index < data.length - 1;

              return (
                <AnimatedListItem
                  key={c.categoryId}
                  className="flex flex-col gap-3 border-b border-[var(--pw-hairline)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[var(--pw-ink)]/40">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0"
                        disabled={!canMoveUp || reorder.isPending}
                        onClick={() => moveCategory(c.categoryId, -1)}
                        aria-label={`เลื่อนหมวดหมู่ ${c.categoryName} ขึ้น`}
                      >
                        <ArrowUp className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="size-8 p-0"
                        disabled={!canMoveDown || reorder.isPending}
                        onClick={() => moveCategory(c.categoryId, 1)}
                        aria-label={`เลื่อนหมวดหมู่ ${c.categoryName} ลง`}
                      >
                        <ArrowDown className="size-4" />
                      </Button>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-[var(--pw-ink)]">{c.categoryName}</span>
                        {c.isSystem && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--pw-surface-sunken)] px-2 py-0.5 text-[10px] text-[var(--pw-ink)]/60">
                            <Shield className="size-3" />
                            ระบบ
                          </span>
                        )}
                      </div>
                      <div className="mt-1">{getCategoryTypeBadge(c.categoryType)}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="min-h-10 flex-1 sm:flex-none"
                      disabled={c.isSystem}
                      onClick={() => startEdit(c)}
                    >
                      <Pencil />
                      แก้ไข
                    </Button>
                    <ConfirmDialog
                      title="ลบหมวดหมู่นี้?"
                      description="หมวดหมู่ระบบไม่สามารถลบได้ หากหมวดหมู่มีรายการอยู่จะไม่สามารถลบได้"
                      confirmLabel="ลบ"
                      pending={remove.isPending}
                      onConfirm={() => {
                        remove.mutate(c.categoryId, {
                          onSuccess: () => toast.success("ลบหมวดหมู่แล้ว"),
                          onError: (e) => toast.error(e instanceof ApiError ? e.message : "ลบไม่สำเร็จ"),
                        });
                      }}
                      trigger={
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={c.isSystem}
                          className="min-h-10 flex-1 sm:flex-none"
                        >
                          <Trash2 />
                          ลบ
                        </Button>
                      }
                    />
                  </div>
                </AnimatedListItem>
              );
            })}
          </AnimatedList>
        </Card>
      )}
    </div>
  );
}
