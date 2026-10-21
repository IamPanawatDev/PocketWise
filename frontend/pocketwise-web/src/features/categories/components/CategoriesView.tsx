"use client";

import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
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
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpDown,
  ArrowUpRight,
  FolderTree,
  LoaderCircle,
  Pencil,
  Plus,
  Save,
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
    const reorderable = data.filter((category) => !category.isSystem);
    const index = reorderable.findIndex((category) => category.categoryId === categoryId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= reorderable.length) return;

    [reorderable[index], reorderable[target]] = [reorderable[target], reorderable[index]];
    reorder.mutate({
      items: reorderable.map((category, sortOrder) => ({
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
                          "flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
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
                          "flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
                          field.value === "income"
                            ? "border-[var(--pw-green)] bg-[var(--pw-green)] text-black font-semibold shadow-sm"
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
                          "flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
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

            <div className="flex flex-col gap-3 pt-3 border-t border-[var(--pw-hairline)] sm:flex-row-reverse sm:justify-start">
              <Button type="submit" disabled={create.isPending || update.isPending} className="w-full sm:w-auto">
                {create.isPending || update.isPending ? (
                  <LoaderCircle className="animate-spin size-4 mr-1.5" />
                ) : editing ? (
                  <Save className="size-4 mr-1.5" />
                ) : (
                  <Plus className="size-4 mr-1.5" />
                )}
                {editing ? "บันทึกการแก้ไข" : "เพิ่มหมวดหมู่"}
              </Button>
              <Button type="button" variant="ghost" onClick={closeForm} className="w-full sm:w-auto">
                <X className="size-4 mr-1.5" />
                ยกเลิก
              </Button>
            </div>
          </form>
        </div>
      </BottomSheet>

      {/* Categories List */}
      {isLoading ? (
        <p className="text-[var(--pw-ink)]/70">กำลังโหลด...</p>
      ) : !data || data.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-8 text-center">
          <FolderTree className="mb-2 size-10 opacity-35 text-[var(--pw-primary)]" />
          <p className="font-medium text-[var(--pw-ink)]">ยังไม่มีหมวดหมู่</p>
          <p className="mt-1 text-xs text-[var(--pw-ink)]/60">
            กดปุ่ม &quot;เพิ่มหมวดหมู่&quot; ด้านบนเพื่อเริ่มกำหนดหมวดหมู่
          </p>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <ul>
            {data.map((c) => {
              const reorderIndex = reorderableCategories.findIndex(
                (category) => category.categoryId === c.categoryId,
              );
              const canMoveUp = !c.isSystem && reorderIndex > 0;
              const canMoveDown =
                !c.isSystem && reorderIndex >= 0 && reorderIndex < reorderableCategories.length - 1;

              return (
                <li
                  key={c.categoryId}
                  className="flex flex-col gap-3 border-b border-[var(--pw-hairline)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[var(--pw-ink)]/40">
                      {!c.isSystem ? (
                        <>
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
                        </>
                      ) : (
                        <div className="size-8" />
                      )}
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
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
