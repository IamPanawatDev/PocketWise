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
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ArrowDown, ArrowUp, LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";

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

  const onSubmit = (values: CategoryFormValues) => {
    if (editing) {
      update.mutate(
        {
          id: editing.id,
          body: { ...values, icon: values.icon ?? null, color: values.color ?? null, isActive: true },
        },
        {
          onSuccess: () => { clearForm(); toast.success("บันทึกหมวดหมู่แล้ว"); },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(
        { ...values, icon: values.icon ?? null, color: values.color ?? null },
        {
          onSuccess: () => { clearForm(); toast.success("เพิ่มหมวดหมู่แล้ว"); },
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

  const reorderableCategories = data?.filter((category) => !category.isSystem) ?? [];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">หมวดหมู่</h1>

      <Card className="mb-6 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">{editing ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="ชื่อหมวดหมู่" htmlFor="category-name" error={errors.categoryName?.message}>
              <Input id="category-name" {...register("categoryName")} />
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
                        "flex h-10 cursor-pointer items-center justify-center rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
                        field.value === "expense"
                          ? "border-[var(--pw-expense)] bg-[var(--pw-expense)] text-white shadow-sm"
                          : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-expense)] hover:text-[var(--pw-expense)]",
                      )}
                    >
                      รายจ่าย
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={field.value === "income"}
                      onClick={() => field.onChange("income")}
                      className={cn(
                        "flex h-10 cursor-pointer items-center justify-center rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
                        field.value === "income"
                          ? "border-[var(--pw-green)] bg-[var(--pw-green)] text-black font-semibold shadow-sm"
                          : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-green)] hover:text-[var(--pw-green)]",
                      )}
                    >
                      รายรับ
                    </button>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={field.value === "both"}
                      onClick={() => field.onChange("both")}
                      className={cn(
                        "flex h-10 cursor-pointer items-center justify-center rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
                        field.value === "both"
                          ? "border-[var(--pw-link)] bg-[var(--pw-link)] text-black font-semibold shadow-sm"
                          : "border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-link)] hover:text-[var(--pw-link)]",
                      )}
                    >
                      ทั้งคู่
                    </button>
                  </div>
                )}
              />
            </FormField>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" className="w-full sm:w-auto" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending
                ? <LoaderCircle className="animate-spin" />
                : editing ? <Save /> : <Plus />}
              {editing ? "บันทึก" : "เพิ่ม"}
            </Button>
            {editing && (
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
      ) : (
        <Card className="p-0">
          <ul>
            {data?.map((c) => {
              const reorderableIndex = reorderableCategories.findIndex(
                (category) => category.categoryId === c.categoryId,
              );

              return (
                <li key={c.categoryId} className="flex flex-col gap-3 border-b border-[var(--pw-hairline)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 break-words">
                    {c.categoryName}
                    {c.isSystem && <span className="ml-2 text-xs text-[var(--pw-ink)]/50">(ระบบ)</span>}
                  </span>
                  <div className="flex flex-wrap items-center gap-1">
                    {!c.isSystem && (
                      <>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`เลื่อน ${c.categoryName} ขึ้น`}
                          disabled={reorder.isPending || reorderableIndex === 0}
                          onClick={() => moveCategory(c.categoryId, -1)}
                        >
                          <ArrowUp />
                        </Button>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`เลื่อน ${c.categoryName} ลง`}
                          disabled={reorder.isPending || reorderableIndex === reorderableCategories.length - 1}
                          onClick={() => moveCategory(c.categoryId, 1)}
                        >
                          <ArrowDown />
                        </Button>
                        <Button type="button" size="sm" variant="secondary" className="min-h-10" onClick={() => startEdit(c)}>
                          <Pencil />
                          แก้ไข
                        </Button>
                        <ConfirmDialog
                          title="ลบหมวดหมู่นี้?"
                          description="ไม่สามารถลบหมวดหมู่ที่มีรายการใช้งานอยู่ได้"
                          confirmLabel="ลบ"
                          pending={remove.isPending}
                          onConfirm={() => {
                            remove.mutate(c.categoryId, {
                              onSuccess: () => toast.success("ลบหมวดหมู่แล้ว"),
                              onError: (e) => toast.error(e instanceof ApiError ? e.message : "ลบไม่สำเร็จ"),
                            });
                          }}
                          trigger={<Button size="sm" variant="destructive" className="min-h-10"><Trash2 />ลบ</Button>}
                        />
                      </>
                    )}
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
