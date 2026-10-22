"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  Award,
  Banknote,
  BookOpen,
  Briefcase,
  Car,
  Coffee,
  Dumbbell,
  Film,
  FolderTree,
  Gift,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  Laptop,
  LoaderCircle,
  Music,
  Pencil,
  Phone,
  Plane,
  Plus,
  Search,
  Shield,
  ShoppingBag,
  Smile,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Tv,
  Utensils,
  Wifi,
  X,
  Zap,
} from "lucide-react";
import {
  useAdminCategories,
  useCreateAdminCategoryMutation,
  useDeleteAdminCategoryMutation,
  useReorderAdminCategoriesMutation,
  useSeedDefaultCategoriesMutation,
  useUpdateAdminCategoryMutation,
} from "@/features/admin-categories/hooks/useAdminCategories";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { ListRowsSkeleton } from "@/components/shared/Skeletons";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import type { CategoryResponse, CategoryType } from "@/types/category.types";

const AVAILABLE_ICONS = [
  { name: "Utensils", icon: Utensils, label: "อาหาร" },
  { name: "Car", icon: Car, label: "เดินทาง" },
  { name: "ShoppingBag", icon: ShoppingBag, label: "ช้อปปิ้ง" },
  { name: "Home", icon: Home, label: "ที่พัก/บ้าน" },
  { name: "Film", icon: Film, label: "บันเทิง" },
  { name: "HeartPulse", icon: HeartPulse, label: "สุขภาพ" },
  { name: "GraduationCap", icon: GraduationCap, label: "การศึกษา" },
  { name: "Banknote", icon: Banknote, label: "การเงิน" },
  { name: "Briefcase", icon: Briefcase, label: "เงินเดือน/งาน" },
  { name: "Award", icon: Award, label: "โบนัส/รางวัล" },
  { name: "TrendingUp", icon: TrendingUp, label: "การลงทุน" },
  { name: "Gift", icon: Gift, label: "ของขวัญ" },
  { name: "Coffee", icon: Coffee, label: "คาเฟ่" },
  { name: "Plane", icon: Plane, label: "ท่องเที่ยว" },
  { name: "Laptop", icon: Laptop, label: "อุปกรณ์/ไอที" },
  { name: "Dumbbell", icon: Dumbbell, label: "กีฬา" },
  { name: "Music", icon: Music, label: "ดนตรี" },
  { name: "Phone", icon: Phone, label: "โทรศัพท์" },
  { name: "Wifi", icon: Wifi, label: "อินเทอร์เน็ต" },
  { name: "Tv", icon: Tv, label: "สตรีมมิ่ง/ทีวี" },
  { name: "BookOpen", icon: BookOpen, label: "หนังสือ" },
  { name: "Heart", icon: Heart, label: "บริจาค/ความรัก" },
  { name: "Smile", icon: Smile, label: "ครอบครัว/เด็ก" },
  { name: "Zap", icon: Zap, label: "ค่าน้ำ/ค่าไฟ" },
  { name: "Shield", icon: Shield, label: "ประกัน" },
  { name: "Tag", icon: Tag, label: "ทั่วไป" },
];

const PALETTE_COLORS = [
  "#EF4444", // Red
  "#F97316", // Orange
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#14B8A6", // Teal
  "#06B6D4", // Cyan
  "#3B82F6", // Blue
  "#6366F1", // Indigo
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#64748B", // Slate
];

function CategoryIcon({
  name,
  className,
}: {
  name: string | null | undefined;
  className?: string;
}) {
  const item = AVAILABLE_ICONS.find((i) => i.name.toLowerCase() === (name || "").toLowerCase());
  const IconComponent = item ? item.icon : Tag;
  return <IconComponent className={className} />;
}

export function SystemCategoriesManager() {
  const { data: categories = [], isLoading } = useAdminCategories();
  const createMutation = useCreateAdminCategoryMutation();
  const updateMutation = useUpdateAdminCategoryMutation();
  const deleteMutation = useDeleteAdminCategoryMutation();
  const reorderMutation = useReorderAdminCategoriesMutation();
  const seedMutation = useSeedDefaultCategoriesMutation();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryResponse | null>(null);
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<CategoryType>("expense");
  const [formIcon, setFormIcon] = useState("Utensils");
  const [formColor, setFormColor] = useState("#EF4444");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateDialog = () => {
    setEditingCategory(null);
    setFormName("");
    setFormType("expense");
    setFormIcon("Utensils");
    setFormColor("#EF4444");
    setFormIsActive(true);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: CategoryResponse) => {
    setEditingCategory(category);
    setFormName(category.categoryName);
    setFormType(
      category.categoryType?.toLowerCase() === "income" ? "income" : "expense"
    );
    setFormIcon(category.icon || "Tag");
    setFormColor(category.color || "#3B82F6");
    setFormIsActive(category.isActive);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("กรุณากรอกชื่อหมวดหมู่");
      return;
    }

    if (editingCategory) {
      updateMutation.mutate(
        {
          id: editingCategory.categoryId,
          body: {
            categoryName: formName.trim(),
            categoryType: formType,
            icon: formIcon,
            color: formColor,
            isActive: formIsActive,
          },
        },
        {
          onSuccess: () => {
            toast.success(`อัปเดตหมวดหมู่ "${formName.trim()}" สำเร็จ`);
            closeDialog();
          },
          onError: (err) => {
            const msg = err instanceof ApiError ? err.message : "เกิดข้อผิดพลาดในการอัปเดต";
            setFormError(msg);
            toast.error(msg);
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          categoryName: formName.trim(),
          categoryType: formType,
          icon: formIcon,
          color: formColor,
        },
        {
          onSuccess: () => {
            toast.success(`เพิ่มหมวดหมู่มาตรฐาน "${formName.trim()}" สำเร็จ`);
            closeDialog();
          },
          onError: (err) => {
            const msg = err instanceof ApiError ? err.message : "เกิดข้อผิดพลาดในการสร้าง";
            setFormError(msg);
            toast.error(msg);
          },
        }
      );
    }
  };

  const handleDelete = (category: CategoryResponse) => {
    deleteMutation.mutate(category.categoryId, {
      onSuccess: () => {
        toast.success(`ลบหมวดหมู่ "${category.categoryName}" สำเร็จ`);
      },
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : "ลบหมวดหมู่ไม่สำเร็จ";
        toast.error(msg);
      },
    });
  };

  const handleToggleActive = (category: CategoryResponse) => {
    updateMutation.mutate(
      {
        id: category.categoryId,
        body: {
          categoryName: category.categoryName,
          categoryType: category.categoryType,
          icon: category.icon,
          color: category.color,
          isActive: !category.isActive,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            `เปลี่ยนสถานะเป็น ${!category.isActive ? "เปิดใช้งาน" : "ปิดการใช้งาน"} สำเร็จ`
          );
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : "เปลี่ยนสถานะไม่สำเร็จ";
          toast.error(msg);
        },
      }
    );
  };

  const handleMove = (category: CategoryResponse, direction: -1 | 1) => {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((c) => c.categoryId === category.categoryId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;

    [sorted[index], sorted[targetIndex]] = [sorted[targetIndex], sorted[index]];

    const items = sorted.map((cat, i) => ({
      categoryId: cat.categoryId,
      sortOrder: i + 1,
    }));

    reorderMutation.mutate(
      { items },
      {
        onSuccess: () => {
          toast.success("จัดลำดับหมวดหมู่มาตรฐานแล้ว");
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : "จัดลำดับไม่สำเร็จ";
          toast.error(msg);
        },
      }
    );
  };

  const handleSeedDefaults = () => {
    seedMutation.mutate(undefined, {
      onSuccess: (res) => {
        toast.success(res.message || `นำเข้าสำเร็จ ${res.addedCount} รายการ`);
      },
      onError: (err) => {
        const msg = err instanceof ApiError ? err.message : "นำเข้าหมวดหมู่มาตรฐานไม่สำเร็จ";
        toast.error(msg);
      },
    });
  };

  // Filtered & Sorted list
  const filteredCategories = useMemo(() => {
    return categories
      .filter((c) => {
        if (typeFilter !== "all" && c.categoryType?.toLowerCase() !== typeFilter) {
          return false;
        }
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          return c.categoryName.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [categories, typeFilter, search]);

  const expenseCount = categories.filter(
    (c) => c.categoryType?.toLowerCase() === "expense"
  ).length;
  const incomeCount = categories.filter(
    (c) => c.categoryType?.toLowerCase() === "income"
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <Card className="p-4 sm:p-6 bg-[var(--pw-surface-indigo)] border-[var(--pw-hairline)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FolderTree className="size-5 text-[var(--pw-primary)]" />
              <h2 className="text-lg font-bold text-[var(--pw-ink)]">
                หมวดหมู่มาตรฐานของระบบ (System Standard Categories)
              </h2>
            </div>
            <p className="text-xs text-[var(--pw-ink)]/70">
              หมวดหมู่เริ่มต้นที่ระบบจัดสรรให้ผู้ใช้ทุกคน โดยผู้ใช้ทั่วไปจะไม่สามารถแก้ไขหรือลบได้
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ConfirmDialog
              title="คืนค่าหมวดหมู่มาตรฐาน 12 รายการ?"
              description="ระบบจะตรวจสอบและนำเข้า 12 หมวดหมู่พื้นฐานของ PocketWise (อาหาร, เดินทาง, ช้อปปิ้ง, เงินเดือน ฯลฯ) ที่ยังไม่มีในระบบกลับมาให้อัตโนมัติ"
              confirmLabel="ยืนยันนำเข้า"
              pending={seedMutation.isPending}
              onConfirm={handleSeedDefaults}
              trigger={
                <Button type="button" variant="outline" size="sm" className="gap-1.5 min-h-9">
                  <Sparkles className="size-4 text-[var(--pw-primary)]" />
                  คืนค่าเริ่มต้น 12 หมวดหมู่
                </Button>
              }
            />

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={openCreateDialog}
              className="gap-1.5 min-h-9"
            >
              <Plus className="size-4" />
              เพิ่มหมวดหมู่มาตรฐาน
            </Button>
          </div>
        </div>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={typeFilter === "all" ? "default" : "outline"}
            onClick={() => setTypeFilter("all")}
            className="text-xs min-h-8"
          >
            ทั้งหมด ({categories.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={typeFilter === "expense" ? "default" : "outline"}
            onClick={() => setTypeFilter("expense")}
            className="text-xs min-h-8"
          >
            รายจ่าย ({expenseCount})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={typeFilter === "income" ? "default" : "outline"}
            onClick={() => setTypeFilter("income")}
            className="text-xs min-h-8"
          >
            รายรับ ({incomeCount})
          </Button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--pw-ink)]/50" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาหมวดหมู่..."
            className="pl-9 h-9 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--pw-ink)]/50 hover:text-[var(--pw-ink)]"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Categories List */}
      {isLoading ? (
        <ListRowsSkeleton count={8} />
      ) : filteredCategories.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-[var(--pw-hairline)]">
          <FolderTree className="size-12 text-[var(--pw-ink)]/30 mb-3" />
          <p className="text-sm font-medium text-[var(--pw-ink)]">ไม่พบหมวดหมู่มาตรฐาน</p>
          <p className="text-xs text-[var(--pw-ink)]/60 mt-1 max-w-sm">
            {search || typeFilter !== "all"
              ? "ลองเปลี่ยนคำค้นหาหรือตัวกรองประเภทหมวดหมู่"
              : "ยังไม่มีหมวดหมู่มาตรฐานในระบบ คุณสามารถคลิก 'คืนค่าเริ่มต้น 12 หมวดหมู่' เพื่อเริ่มต้นใช้งาน"}
          </p>
          {!search && typeFilter === "all" && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSeedDefaults}
              disabled={seedMutation.isPending}
              className="mt-4 gap-1.5"
            >
              <Sparkles className="size-4 text-[var(--pw-primary)]" />
              คืนค่าเริ่มต้น 12 หมวดหมู่ทันที
            </Button>
          )}
        </Card>
      ) : (
        <AnimatedList className="space-y-2">
          {filteredCategories.map((c, idx) => {
            const isExpense = c.categoryType?.toLowerCase() === "expense";
            const isFirst = idx === 0;
            const isLast = idx === filteredCategories.length - 1;

            return (
              <AnimatedListItem key={c.categoryId}>
                <Card
                  className={cn(
                    "flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between transition-colors border-[var(--pw-hairline)]",
                    !c.isActive && "opacity-60 bg-[var(--pw-surface-indigo)]/50"
                  )}
                >
                {/* Left: Reorder + Icon + Info */}
                <div className="flex items-center gap-3 min-w-0">
                  {/* Order control */}
                  <div className="flex items-center gap-0.5">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={isFirst || reorderMutation.isPending}
                      onClick={() => handleMove(c, -1)}
                      title="เลื่อนขึ้น"
                      aria-label={`เลื่อน ${c.categoryName} ขึ้น`}
                    >
                      <ArrowUp className="size-3.5" />
                    </Button>
                    <span className="w-5 text-center text-xs font-mono text-[var(--pw-ink)]/50">
                      {c.sortOrder}
                    </span>
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="ghost"
                      disabled={isLast || reorderMutation.isPending}
                      onClick={() => handleMove(c, 1)}
                      title="เลื่อนลง"
                      aria-label={`เลื่อน ${c.categoryName} ลง`}
                    >
                      <ArrowDown className="size-3.5" />
                    </Button>
                  </div>

                  {/* Icon badge */}
                  <div
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg shadow-xs"
                    style={{
                      backgroundColor: c.color ? `${c.color}25` : "rgba(100, 116, 139, 0.15)",
                      color: c.color || "var(--pw-ink)",
                    }}
                  >
                    <CategoryIcon name={c.icon} className="size-5" />
                  </div>

                  {/* Category Details */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-sm text-[var(--pw-ink)] truncate">
                        {c.categoryName}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 text-[10px] font-medium rounded-full border",
                          isExpense
                            ? "bg-[var(--pw-expense)]/10 text-[var(--pw-expense)] border-[var(--pw-expense)]/25"
                            : "bg-[var(--pw-green)]/15 text-[var(--pw-green)] border-[var(--pw-green)]/30 font-semibold"
                        )}
                      >
                        {isExpense ? "รายจ่าย" : "รายรับ"}
                      </span>
                      {!c.isActive && (
                        <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-neutral-500/10 text-neutral-400 border border-neutral-500/20">
                          ปิดการใช้งาน
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(c)}
                    disabled={updateMutation.isPending}
                    className="text-xs h-8 px-2.5 text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]"
                  >
                    {c.isActive ? "ปิดการใช้งาน" : "เปิดใช้งาน"}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => openEditDialog(c)}
                    className="text-xs h-8 px-2.5 gap-1"
                  >
                    <Pencil className="size-3.5" />
                    แก้ไข
                  </Button>

                  <ConfirmDialog
                    title={`ลบหมวดหมู่ "${c.categoryName}"?`}
                    description="การลบหมวดหมู่มาตรฐานจะไม่สามารถทำได้หากมีรายการธุรกรรมอ้างอิงอยู่ หากต้องการระงับการใช้งาน แนะนำให้กด 'ปิดการใช้งาน' แทน"
                    confirmLabel="ลบหมวดหมู่"
                    pending={deleteMutation.isPending}
                    onConfirm={() => handleDelete(c)}
                    trigger={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 px-2 text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/10 hover:text-[var(--pw-expense)]"
                        title="ลบหมวดหมู่"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    }
                  />
                </div>
              </Card>
            </AnimatedListItem>
            );
          })}
        </AnimatedList>
      )}

      {/* Create / Edit Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-[var(--pw-rounded-lg)] bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--pw-hairline)]">
              <h3 className="text-base font-semibold text-[var(--pw-ink)]">
                {editingCategory ? `แก้ไขหมวดหมู่มาตรฐาน: ${editingCategory.categoryName}` : "เพิ่มหมวดหมู่มาตรฐานใหม่"}
              </h3>
              <Button type="button" variant="ghost" size="icon" onClick={closeDialog}>
                <X className="size-4" />
              </Button>
            </div>

            {formError && (
              <div className="flex items-center gap-2 p-3 text-xs text-[var(--pw-magenta)] bg-[var(--pw-magenta)]/10 border border-[var(--pw-magenta)]/30 rounded-[var(--pw-rounded-xs)]">
                <AlertCircle className="size-4 shrink-0 text-[var(--pw-magenta)]" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Category Name */}
              <FormField label="ชื่อหมวดหมู่ *" htmlFor="category-name">
                <Input
                  id="category-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น อาหารและเครื่องดื่ม, เงินเดือน"
                  autoFocus
                />
              </FormField>

              {/* Category Type */}
              <FormField label="ประเภทหมวดหมู่ *" htmlFor="category-type">
                <div id="category-type" className="grid grid-cols-2 gap-2" role="radiogroup">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={formType === "expense"}
                    onClick={() => setFormType("expense")}
                    className={cn(
                      "flex h-10 cursor-pointer items-center justify-center rounded-[var(--pw-rounded-sm)] border text-sm font-medium transition-colors",
                      formType === "expense"
                        ? "border-[var(--pw-expense)] bg-[var(--pw-expense)] text-white shadow-xs"
                        : "border-[var(--pw-input-border)] bg-[var(--pw-surface-black)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-expense)]"
                    )}
                  >
                    รายจ่าย (Expense)
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={formType === "income"}
                    onClick={() => setFormType("income")}
                    className={cn(
                      "flex h-10 cursor-pointer items-center justify-center rounded-[var(--pw-rounded-sm)] border text-sm font-semibold transition-colors",
                      formType === "income"
                        ? "border-[var(--pw-green)] bg-[var(--pw-green)] text-[var(--pw-on-green)] shadow-xs"
                        : "border-[var(--pw-input-border)] bg-[var(--pw-surface-black)] text-[var(--pw-ink)]/75 hover:border-[var(--pw-green)]"
                    )}
                  >
                    รายรับ (Income)
                  </button>
                </div>
              </FormField>

              {/* Color Swatch Picker */}
              <div>
                <label className="text-xs font-medium text-[var(--pw-ink)] mb-1.5 block">
                  สีหมวดหมู่
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {PALETTE_COLORS.map((color) => {
                    const isSelected = formColor.toUpperCase() === color.toUpperCase();
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setFormColor(color)}
                        className={cn(
                          "size-7 rounded-full border-2 transition-transform",
                          isSelected
                            ? "scale-110 border-white ring-2 ring-[var(--pw-primary)]"
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                        aria-label={`เลือกสี ${color}`}
                      />
                    );
                  })}
                  <Input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="h-7 w-24 text-xs font-mono uppercase"
                    placeholder="#HEX"
                  />
                </div>
              </div>

              {/* Icon Picker Grid */}
              <div>
                <label className="text-xs font-medium text-[var(--pw-ink)] mb-1.5 block">
                  ไอคอน (Icon)
                </label>
                <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-44 overflow-y-auto p-1.5 border border-[var(--pw-hairline)] rounded-[var(--pw-rounded-sm)] bg-[var(--pw-surface-black)]">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconComponent = item.icon;
                    const isSelected = formIcon.toLowerCase() === item.name.toLowerCase();
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setFormIcon(item.name)}
                        title={item.label}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-md border text-sm transition-all",
                          isSelected
                            ? "border-[var(--pw-primary)] bg-[var(--pw-primary)]/20 text-[var(--pw-primary)] ring-1 ring-[var(--pw-primary)]"
                            : "border-transparent text-[var(--pw-ink)]/60 hover:bg-[var(--pw-surface-indigo)] hover:text-[var(--pw-ink)]"
                        )}
                      >
                        <IconComponent className="size-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active Toggle (Only on edit) */}
              {editingCategory && (
                <div className="flex items-center gap-2.5 pt-2">
                  <Checkbox
                    id="cat-active"
                    checked={formIsActive}
                    onCheckedChange={(checked) => setFormIsActive(Boolean(checked))}
                  />
                  <Label
                    htmlFor="cat-active"
                    className="mb-0 cursor-pointer text-sm font-medium leading-none text-[var(--pw-ink)] select-none"
                  >
                    เปิดให้ผู้ใช้สามารถเลือกหมวดหมู่นี้ได้ (Active)
                  </Label>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex flex-col-reverse gap-2 pt-4 border-t border-[var(--pw-hairline)] sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={closeDialog}>
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  variant="default"
                  className="w-full sm:w-auto"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <LoaderCircle className="size-4 animate-spin mr-1.5" />
                  )}
                  {editingCategory ? "บันทึกการแก้ไข" : "สร้างหมวดหมู่"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
