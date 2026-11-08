"use client";

import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { tagSchema, type TagFormValues } from "@/schemas/tag.schema";
import { zodResolver } from "@/lib/zod-resolver";
import {
  useCreateTag,
  useDeleteTag,
  useReorderTags,
  useTags,
  useUpdateTag,
} from "@/features/tags/hooks/useTags";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { BottomSheet, BottomSheetFooter } from "@/components/ui/bottom-sheet";
import { Card } from "@/components/ui/card";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListRowsSkeleton } from "@/components/shared/Skeletons";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";

export function TagsView() {
  const { data, isLoading } = useTags();
  const create = useCreateTag();
  const update = useUpdateTag();
  const remove = useDeleteTag();
  const reorder = useReorderTags();

  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTags = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data;
    return data.filter((t) => t.tagName.toLowerCase().includes(searchQuery.toLowerCase().trim()));
  }, [data, searchQuery]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TagFormValues>({
    resolver: zodResolver(tagSchema),
    defaultValues: { tagName: "", color: "#5865f2" },
  });

  const clearForm = () => {
    setEditing(null);
    reset({ tagName: "", color: "#5865f2" });
  };

  const closeForm = () => {
    clearForm();
    setIsFormOpen(false);
  };

  const onSubmit = (values: TagFormValues) => {
    if (editing) {
      update.mutate(
        {
          id: editing.id,
          body: { ...values, color: values.color ?? null },
        },
        {
          onSuccess: () => {
            closeForm();
            toast.success("บันทึกแท็กแล้ว");
          },
          onError: (e) => toast.error(e instanceof ApiError ? e.message : "บันทึกไม่สำเร็จ"),
        },
      );
    } else {
      create.mutate(
        { ...values, color: values.color ?? null },
        {
          onSuccess: () => {
            closeForm();
            toast.success("เพิ่มแท็กแล้ว");
          },
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
      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
            <Tags className="size-6 text-[var(--pw-primary)]" />
            แท็ก
          </h1>
          <p className="mt-1 text-sm text-[var(--pw-ink)]/65">
            ติดแท็กให้รายการเพื่อรวบรวมและค้นหาค่าใช้จ่ายตามเรื่องที่สนใจ
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
          เพิ่มแท็ก
        </Button>
      </div>

      {/* Form in BottomSheet */}
      <BottomSheet
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) closeForm();
          else setIsFormOpen(true);
        }}
        title={editing ? "แก้ไขแท็ก" : "เพิ่มแท็กใหม่"}
        description="ระบุชื่อและสีของแท็ก"
      >
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField label="ชื่อแท็ก" htmlFor="tag-name" error={errors.tagName?.message}>
              <Input id="tag-name" placeholder="เช่น เที่ยวญี่ปุ่น, ช้อปปิ้ง, ค่าบ้าน" {...register("tagName")} />
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
                  เลือกสีสำหรับแสดงแท็ก
                </span>
              </div>
            </FormField>

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
                    <span>เพิ่มแท็ก</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={closeForm}
                className="min-h-[44px] gap-1.5 text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] cursor-pointer order-2"
              >
                <X className="size-4" />
                <span>ยกเลิก</span>
              </Button>
            </BottomSheetFooter>
          </form>
        </div>
      </BottomSheet>

      {/* Search Bar */}
      <div className="mb-4 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--pw-ink)]/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาแท็ก..."
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
      </div>

      {/* Tags List */}
      {isLoading ? (
        <ListRowsSkeleton count={6} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="ยังไม่มีแท็กรายการ"
          description="เพิ่มแท็กเพื่อจัดกลุ่มและค้นหารายการธุรกรรมของคุณได้สะดวกรวดเร็วยิ่งขึ้น"
          actionLabel="สร้างแท็กแรกของคุณ"
          actionIcon={Plus}
          onAction={() => {
            setEditing(null);
            reset({ tagName: "", color: "#5865f2" });
            setIsFormOpen(true);
          }}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <AnimatedList>
            {filteredTags.map((t, index) => (
              <AnimatedListItem
                key={t.tagId}
                className="flex flex-col gap-3 border-b border-[var(--pw-hairline)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[var(--pw-ink)]/40">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => moveTag(t.tagId, -1)}
                      aria-label={`เลื่อนแท็ก ${t.tagName} ขึ้น`}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="size-8 p-0"
                      disabled={index === data.length - 1 || reorder.isPending}
                      onClick={() => moveTag(t.tagId, 1)}
                      aria-label={`เลื่อนแท็ก ${t.tagName} ลง`}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block size-3 rounded-full shrink-0"
                      style={{ backgroundColor: t.color ?? "var(--pw-primary)" }}
                    />
                    <span className="font-medium text-[var(--pw-ink)]">#{t.tagName}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="min-h-10 flex-1 sm:flex-none"
                    onClick={() => {
                      setEditing({ id: t.tagId, name: t.tagName });
                      reset({ tagName: t.tagName, color: t.color ?? "#5865f2" });
                      setIsFormOpen(true);
                    }}
                  >
                    <Pencil />
                    แก้ไข
                  </Button>
                  <ConfirmDialog
                    title="ลบแท็กนี้?"
                    description="แท็กจะถูกลบออกจากรายการทั้งหมดที่ใช้อยู่"
                    confirmLabel="ลบ"
                    pending={remove.isPending}
                    onConfirm={() => {
                      remove.mutate(t.tagId, {
                        onSuccess: () => toast.success("ลบแท็กแล้ว"),
                        onError: (e) => toast.error(e instanceof ApiError ? e.message : "ลบไม่สำเร็จ"),
                      });
                    }}
                    trigger={
                      <Button size="sm" variant="destructive" className="min-h-10 flex-1 sm:flex-none">
                        <Trash2 />
                        ลบ
                      </Button>
                    }
                  />
                </div>
              </AnimatedListItem>
            ))}
          </AnimatedList>
        </Card>
      )}
    </div>
  );
}
