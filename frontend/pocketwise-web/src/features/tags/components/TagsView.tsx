"use client";

import { Controller, useForm } from "react-hook-form";
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
import { getReadableTextColor } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ArrowDown, ArrowUp, LoaderCircle, Pencil, Plus, Save, Trash2, X } from "lucide-react";

export function TagsView() {
  const { data, isLoading } = useTags();
  const create = useCreateTag();
  const update = useUpdateTag();
  const remove = useDeleteTag();
  const reorder = useReorderTags();

  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: { color: "#5865f2" },
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

      <Card className="mb-6 p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-bold">{editing ? "แก้ไขแท็ก" : "เพิ่มแท็ก"}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="ชื่อแท็ก" htmlFor="tag-name" error={errors.tagName?.message}>
            <Input id="tag-name" {...register("tagName")} />
          </FormField>
          <FormField label="สีของแท็ก" htmlFor="tag-color">
            <div className="flex items-center gap-3">
              <Controller
                control={control}
                name="color"
                render={({ field }) => (
                  <Input
                    id="tag-color"
                    type="color"
                    className="h-12 w-20 cursor-pointer p-1"
                    aria-label="เลือกสีแท็ก"
                    value={field.value ?? "#5865f2"}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                )}
              />
              <span className="text-sm text-[var(--pw-ink)]/70">
                เลือกสีจากตัวเลือกสี
              </span>
            </div>
          </FormField>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button type="submit" className="w-full sm:w-auto" disabled={create.isPending || update.isPending}>
              {create.isPending || update.isPending
                ? <LoaderCircle className="animate-spin" />
                : editing ? <Save /> : <Plus />}
              {editing ? "บันทึก" : "เพิ่ม"}
            </Button>
            {editing && (
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={() => { setEditing(null); reset(); }}>
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data?.map((t) => (
            <span
              key={t.tagId}
              className="flex min-w-0 flex-wrap items-center gap-2 rounded-[var(--pw-rounded-lg)] p-3 text-sm"
              style={{
                backgroundColor: t.color ?? "var(--pw-magenta)",
                color: getReadableTextColor(t.color ?? "#ec48bd"),
              }}
            >
              <span className="min-w-0 flex-1 break-words">#{t.tagName}</span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditing({ id: t.tagId, name: t.tagName });
                  reset({ tagName: t.tagName, color: t.color ?? "#5865f2" });
                }}
              >
                <Pencil />
                แก้ไข
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`เลื่อน ${t.tagName} ขึ้น`}
                disabled={reorder.isPending || data?.findIndex((item) => item.tagId === t.tagId) === 0}
                onClick={() => moveTag(t.tagId, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`เลื่อน ${t.tagName} ลง`}
                disabled={reorder.isPending || data?.findIndex((item) => item.tagId === t.tagId) === (data?.length ?? 0) - 1}
                onClick={() => moveTag(t.tagId, 1)}
              >
                <ArrowDown />
              </Button>
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
                trigger={<Button size="sm" variant="destructive"><Trash2 />ลบ</Button>}
              />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
