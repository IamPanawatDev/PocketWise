"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { toast } from "sonner";
import { tagSchema, type TagFormValues } from "@/schemas/tag.schema";
import { zodResolver } from "@/lib/zod-resolver";
import {
  useTags,
  useCreateTag,
  useDeleteTag,
  useReorderTags,
  useUpdateTag,
} from "@/features/tags/hooks/useTags";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

export function TagsView() {
  const { data, isLoading } = useTags();
  const create = useCreateTag();
  const update = useUpdateTag();
  const remove = useDeleteTag();
  const reorder = useReorderTags();

  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: { color: null },
  });

  const onSubmit = (values: TagFormValues) => {
    if (editing) {
      update.mutate(
        { id: editing.id, body: { ...values, color: values.color ?? null } },
        {
          onSuccess: () => { setEditing(null); reset(); toast.success("บันทึกแท็กแล้ว"); },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(
        { ...values, color: values.color ?? null },
        {
          onSuccess: () => { reset(); toast.success("เพิ่มแท็กแล้ว"); },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "เพิ่มไม่สำเร็จ"),
        },
      );
    }
  };

  const moveTag = (tagId: number, offset: -1 | 1) => {
    if (!data) return;
    const next = [...data];
    const index = next.findIndex((tag) => tag.tagId === tagId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= next.length) return;

    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate({
      items: next.map((tag, sortOrder) => ({ tagId: tag.tagId, sortOrder })),
    });
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">แท็ก</h1>

      <Card className="mb-6">
        <h2 className="mb-4 text-lg font-bold">{editing ? "แก้ไขแท็ก" : "เพิ่มแท็ก"}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>ชื่อแท็ก</Label>
            <Input {...register("tagName")} />
            <FieldError message={errors.tagName?.message} />
          </div>
          <div>
            <Label>สี (hex)</Label>
            <Input placeholder="#C7DCA7" {...register("color")} />
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
        <div className="flex flex-wrap gap-2">
          {data?.map((t) => (
            <span
              key={t.tagId}
              className="inline-flex items-center gap-2 rounded-[var(--pw-rounded-pill)] px-4 py-2 text-sm"
              style={{ backgroundColor: t.color ?? "var(--pw-magenta)" }}
            >
              #{t.tagName}
              <button className="text-[var(--pw-link)]" onClick={() => { setEditing({ id: t.tagId, name: t.tagName }); reset({ tagName: t.tagName, color: t.color }); }}>
                แก้ไข
              </button>
              <button
                type="button"
                className="text-[var(--pw-ink)] disabled:opacity-40"
                aria-label={`เลื่อน ${t.tagName} ขึ้น`}
                disabled={reorder.isPending || data?.findIndex((item) => item.tagId === t.tagId) === 0}
                onClick={() => moveTag(t.tagId, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="text-[var(--pw-ink)] disabled:opacity-40"
                aria-label={`เลื่อน ${t.tagName} ลง`}
                disabled={reorder.isPending || data?.findIndex((item) => item.tagId === t.tagId) === (data?.length ?? 0) - 1}
                onClick={() => moveTag(t.tagId, 1)}
              >
                ↓
              </button>
              <ConfirmDialog
                title="ลบแท็กนี้?"
                confirmLabel="ลบ"
                pending={remove.isPending}
                onConfirm={() => {
                  remove.mutate(t.tagId, {
                    onSuccess: () => toast.success("ลบแท็กแล้ว"),
                    onError: (e) => toast.error(e instanceof ApiError ? e.message : "ลบไม่สำเร็จ"),
                  });
                }}
                trigger={<button className="text-[var(--pw-magenta)]">ลบ</button>}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
