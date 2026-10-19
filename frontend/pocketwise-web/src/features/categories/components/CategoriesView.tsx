"use client";

import { useForm } from "react-hook-form";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export function CategoriesView() {
  const { data, isLoading } = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();
  const remove = useDeleteCategory();
  const reorder = useReorderCategories();

  const [editing, setEditing] = useState<{ id: number; name: string; type: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { icon: null, color: null },
  });

  const onSubmit = (values: CategoryFormValues) => {
    if (editing) {
      update.mutate(
        {
          id: editing.id,
          body: { ...values, icon: values.icon ?? null, color: values.color ?? null, isActive: true },
        },
        {
          onSuccess: () => { setEditing(null); reset(); toast.success("บันทึกหมวดหมู่แล้ว"); },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(
        { ...values, icon: values.icon ?? null, color: values.color ?? null },
        {
          onSuccess: () => { reset(); toast.success("เพิ่มหมวดหมู่แล้ว"); },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "เพิ่มไม่สำเร็จ"),
        },
      );
    }
  };

  const startEdit = (c: { categoryId: number; categoryName: string; categoryType: string }) => {
    setEditing({ id: c.categoryId, name: c.categoryName, type: c.categoryType });
    reset({
      categoryName: c.categoryName,
      categoryType: c.categoryType as CategoryFormValues["categoryType"],
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

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-bold">{editing ? "แก้ไขหมวดหมู่" : "เพิ่มหมวดหมู่"}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label>ชื่อหมวดหมู่</Label>
              <Input {...register("categoryName")} />
              <FieldError message={errors.categoryName?.message} />
            </div>
            <div>
              <Label>ประเภท</Label>
              <Select {...register("categoryType")}>
                <option value="expense">รายจ่าย</option>
                <option value="income">รายรับ</option>
                <option value="both">ทั้งคู่</option>
              </Select>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {editing ? "บันทึก" : "เพิ่ม"}
            </Button>
            {editing && (
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
            {data?.map((c) => {
              const reorderableIndex = reorderableCategories.findIndex(
                (category) => category.categoryId === c.categoryId,
              );

              return (
                <li key={c.categoryId} className="flex items-center justify-between border-b border-[var(--pw-hairline)] px-4 py-3 last:border-b-0">
                  <span>
                    {c.categoryName}
                    {c.isSystem && <span className="ml-2 text-xs text-[var(--pw-ink)]/50">(ระบบ)</span>}
                  </span>
                  <div>
                    {!c.isSystem && (
                      <>
                        <button
                          type="button"
                          className="mr-2 text-[var(--pw-link)] disabled:opacity-40"
                          aria-label={`เลื่อน ${c.categoryName} ขึ้น`}
                          disabled={reorder.isPending || reorderableIndex === 0}
                          onClick={() => moveCategory(c.categoryId, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="mr-3 text-[var(--pw-link)] disabled:opacity-40"
                          aria-label={`เลื่อน ${c.categoryName} ลง`}
                          disabled={reorder.isPending || reorderableIndex === reorderableCategories.length - 1}
                          onClick={() => moveCategory(c.categoryId, 1)}
                        >
                          ↓
                        </button>
                        <button className="mr-3 text-[var(--pw-link)]" onClick={() => startEdit(c)}>
                          แก้ไข
                        </button>
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
                          trigger={<button className="text-[var(--pw-magenta)]">ลบ</button>}
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
