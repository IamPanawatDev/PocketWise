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
  ChevronRight,
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
import { triggerHaptic } from "@/lib/haptic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { ListRowsSkeleton } from "@/components/shared/Skeletons";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { BottomSheet } from "@/components/ui/bottom-sheet";
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
  const [selectedCategoryForSheet, setSelectedCategoryForSheet] = useState<CategoryResponse | null>(null);
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

  // Keep selectedCategoryForSheet in sync with latest categories data
  const currentSheetCategory = useMemo(() => {
    if (!selectedCategoryForSheet) return null;
    return categories.find((c) => c.categoryId === selectedCategoryForSheet.categoryId) ?? selectedCategoryForSheet;
  }, [categories, selectedCategoryForSheet]);

  const currentSheetIndex = useMemo(() => {
    if (!currentSheetCategory) return -1;
    return filteredCategories.findIndex((c) => c.categoryId === currentSheetCategory.categoryId);
  }, [currentSheetCategory, filteredCategories]);

  const isSheetFirst = currentSheetIndex === 0;
  const isSheetLast = currentSheetIndex === filteredCategories.length - 1;

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
              className="gap-1.5 min-h-9 hidden sm:inline-flex"
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
            className="pl-9 h-9 text-base md:text-xs"
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
                    "p-3 sm:p-3.5 transition-colors border-[var(--pw-hairline)]",
                    !c.isActive && "opacity-60 bg-[var(--pw-surface-indigo)]/50"
                  )}
                >
                  {/* Mobile Compact View (< sm) */}
                  <div
                    onClick={() => {
                      triggerHaptic("light");
                      setSelectedCategoryForSheet(c);
                    }}
                    className="flex sm:hidden items-center justify-between gap-2.5 cursor-pointer select-none active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-6 text-center text-xs font-mono font-medium text-[var(--pw-ink)]/60 bg-[var(--pw-surface-onyx)] py-1 rounded shrink-0 border border-[var(--pw-hairline)]">
                        {c.sortOrder}
                      </span>

                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg shadow-xs"
                        style={{
                          backgroundColor: c.color ? `${c.color}25` : "rgba(100, 116, 139, 0.15)",
                          color: c.color || "var(--pw-ink)",
                        }}
                      >
                        <CategoryIcon name={c.icon} className="size-5" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-[var(--pw-ink)] truncate">
                            {c.categoryName}
                          </span>
                          <span
                            className={cn(
                              "px-1.5 py-0.2 text-[9px] font-semibold rounded-full border shrink-0",
                              isExpense
                                ? "bg-[var(--pw-expense)]/10 text-[var(--pw-expense)] border-[var(--pw-expense)]/25"
                                : "bg-[var(--pw-green)]/15 text-[var(--pw-green)] border-[var(--pw-green)]/30"
                            )}
                          >
                            {isExpense ? "รายจ่าย" : "รายรับ"}
                          </span>
                        </div>
                        {!c.isActive && (
                          <p className="text-[10px] text-neutral-400 mt-0.5">ปิดการใช้งาน</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 text-[var(--pw-ink)]/40">
                      <ChevronRight className="size-4" />
                    </div>
                  </div>

                  {/* Desktop Full View (>= sm) */}
                  <div className="hidden sm:flex sm:items-center sm:justify-between gap-3">
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
                          className="size-7 touch-manipulation"
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
                          className="size-7 touch-manipulation"
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
                    <div className="flex items-center gap-1.5">
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
                        className="text-xs h-8 px-2.5 gap-1 font-medium"
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
                  </div>
                </Card>
            </AnimatedListItem>
            );
          })}
        </AnimatedList>
      )}

      {/* Create / Edit BottomSheet */}
      <BottomSheet
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
          else setIsDialogOpen(true);
        }}
        title={editingCategory ? `แก้ไขหมวดหมู่มาตรฐาน: ${editingCategory.categoryName}` : "เพิ่มหมวดหมู่มาตรฐานใหม่"}
        description="กำหนดชื่อ ประเภท ไอคอน และสีของหมวดหมู่มาตรฐานสำหรับผู้ใช้ทุกคน"
        footer={
          <div className="flex flex-col gap-2.5 w-full">
            <Button
              type="submit"
              form="category-form"
              variant="default"
              className="w-full min-h-[44px] bg-[var(--pw-primary)] hover:bg-[var(--pw-primary-hover)] text-white font-bold shadow-md disabled:opacity-85 disabled:text-white active:scale-[0.98] transition-all cursor-pointer"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <LoaderCircle className="size-4 animate-spin mr-1.5" />
              )}
              {editingCategory ? "บันทึกการแก้ไข" : "สร้างหมวดหมู่"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full min-h-[44px] border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/70 hover:bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)] order-2 shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
              onClick={closeDialog}
            >
              ยกเลิก
            </Button>
          </div>
        }
      >
        <div className="space-y-4 pt-1">
          {formError && (
            <div className="flex items-center gap-2 p-3 text-xs text-[var(--pw-magenta)] bg-[var(--pw-magenta)]/10 border border-[var(--pw-magenta)]/30 rounded-[var(--pw-rounded-xs)]">
              <AlertCircle className="size-4 shrink-0 text-[var(--pw-magenta)]" />
              <span>{formError}</span>
            </div>
          )}

            <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
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
                    onClick={() => {
                      triggerHaptic("light");
                      setFormType("expense");
                    }}
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
                    onClick={() => {
                      triggerHaptic("light");
                      setFormType("income");
                    }}
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
                        onClick={() => {
                          triggerHaptic("light");
                          setFormColor(color);
                        }}
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
                    className="h-7 w-24 text-base md:text-xs font-mono uppercase"
                    placeholder="#HEX"
                  />
                </div>
              </div>

              {/* Icon Picker Grid */}
              <div>
                <label className="text-xs font-medium text-[var(--pw-ink)] mb-1.5 block">
                  ไอคอน (Icon)
                </label>
                <div className="grid grid-cols-5 xs:grid-cols-6 sm:grid-cols-8 gap-2 sm:gap-1.5 max-h-48 overflow-y-auto overscroll-contain touch-pan-y p-2 sm:p-1.5 border border-[var(--pw-hairline)] rounded-[var(--pw-rounded-sm)] bg-[var(--pw-surface-black)]">
                  {AVAILABLE_ICONS.map((item) => {
                    const IconComponent = item.icon;
                    const isSelected = formIcon.toLowerCase() === item.name.toLowerCase();
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => {
                          triggerHaptic("light");
                          setFormIcon(item.name);
                        }}
                        title={item.label}
                        className={cn(
                          "flex size-10 sm:size-9 items-center justify-center rounded-md border text-sm transition-all active:scale-95",
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
                    เปิดให้ผู้ใช้สามารถเลือกหมวดหมู่นี้ได้
                  </Label>
                </div>
              )}
            </form>
        </div>
      </BottomSheet>

      {/* Mobile Category Action Sheet (< sm) */}
      <BottomSheet
        open={Boolean(currentSheetCategory)}
        onOpenChange={(open) => {
          if (!open) setSelectedCategoryForSheet(null);
        }}
        title="จัดการหมวดหมู่มาตรฐาน"
        description="ดูรายละเอียด ปรับเปลี่ยนสถานะ ลำดับ หรือแก้ไขข้อมูลหมวดหมู่"
        footer={
          <button
            type="button"
            onClick={() => setSelectedCategoryForSheet(null)}
            className="w-full min-h-[48px] px-4 py-2.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-onyx)] hover:bg-[var(--pw-hairline)]/30 text-[var(--pw-ink)] font-semibold text-sm active:scale-[0.98] transition-all shadow-sm flex items-center justify-center cursor-pointer"
          >
            ปิด
          </button>
        }
      >
        {currentSheetCategory && (
          <div className="space-y-4 pt-1">
            {/* Category Summary Card */}
            <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/30 backdrop-blur-md">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-xl shadow-xs"
                style={{
                  backgroundColor: currentSheetCategory.color ? `${currentSheetCategory.color}25` : "rgba(100, 116, 139, 0.15)",
                  color: currentSheetCategory.color || "var(--pw-ink)",
                }}
              >
                <CategoryIcon name={currentSheetCategory.icon} className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-[var(--pw-ink)] truncate">
                    {currentSheetCategory.categoryName}
                  </h3>
                  <span
                    className={cn(
                      "px-2 py-0.5 text-[10px] font-semibold rounded-full border shrink-0",
                      currentSheetCategory.categoryType?.toLowerCase() === "expense"
                        ? "bg-[var(--pw-expense)]/10 text-[var(--pw-expense)] border-[var(--pw-expense)]/25"
                        : "bg-[var(--pw-green)]/15 text-[var(--pw-green)] border-[var(--pw-green)]/30"
                    )}
                  >
                    {currentSheetCategory.categoryType?.toLowerCase() === "expense" ? "รายจ่าย" : "รายรับ"}
                  </span>
                </div>
                <p className="text-xs text-[var(--pw-ink)]/60 mt-0.5">
                  สถานะ: {currentSheetCategory.isActive ? "เปิดใช้งานอยู่ในระบบ" : "ปิดการใช้งานชั่วคราว"} • ลำดับที่ #{currentSheetCategory.sortOrder}
                </p>
              </div>
            </div>

            {/* Quick Reorder Controls */}
            <div className="p-3 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/50 space-y-2">
              <div className="flex items-center justify-between text-xs text-[var(--pw-ink)]/70">
                <span className="font-medium">จัดลำดับการแสดงผล</span>
                <span className="font-mono text-xs text-[var(--pw-ink)]/50">ลำดับปัจจุบัน: #{currentSheetCategory.sortOrder}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSheetFirst || reorderMutation.isPending}
                  onClick={() => {
                    triggerHaptic("medium");
                    handleMove(currentSheetCategory, -1);
                  }}
                  className="min-h-[44px] text-xs gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <ArrowUp className="size-4" />
                  เลื่อนขึ้นก่อนหน้า
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSheetLast || reorderMutation.isPending}
                  onClick={() => {
                    triggerHaptic("medium");
                    handleMove(currentSheetCategory, 1);
                  }}
                  className="min-h-[44px] text-xs gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <ArrowDown className="size-4" />
                  เลื่อนลงถัดไป
                </Button>
              </div>
            </div>

            {/* Action Buttons following Master UI Rule (Action/Confirm top, Cancel bottom) */}
            <div className="space-y-2.5 pt-1">
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  const cat = currentSheetCategory;
                  setSelectedCategoryForSheet(null);
                  triggerHaptic("light");
                  openEditDialog(cat);
                }}
                className="w-full min-h-[44px] text-sm font-semibold gap-2 bg-[var(--pw-primary)] hover:bg-[var(--pw-primary-hover)] text-white shadow-md active:scale-98 cursor-pointer rounded-xl"
              >
                <Pencil className="size-4" />
                แก้ไขข้อมูลหมวดหมู่
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={updateMutation.isPending}
                onClick={() => {
                  triggerHaptic("medium");
                  handleToggleActive(currentSheetCategory);
                }}
                className="w-full min-h-[44px] text-sm font-medium gap-2 border-[var(--pw-hairline)] bg-[var(--pw-surface)] hover:bg-[var(--pw-surface-indigo)]/50 active:scale-98 cursor-pointer rounded-xl"
              >
                {currentSheetCategory.isActive ? "ปิดการใช้งานหมวดหมู่นี้" : "เปิดใช้งานหมวดหมู่นี้"}
              </Button>

              <ConfirmDialog
                title={`ลบหมวดหมู่ "${currentSheetCategory.categoryName}"?`}
                description="การลบหมวดหมู่มาตรฐานจะไม่สามารถทำได้หากมีรายการธุรกรรมอ้างอิงอยู่ หากต้องการระงับการใช้งาน แนะนำให้กด 'ปิดการใช้งาน' แทน"
                confirmLabel="ยืนยันลบหมวดหมู่"
                pending={deleteMutation.isPending}
                onConfirm={() => {
                  const cat = currentSheetCategory;
                  setSelectedCategoryForSheet(null);
                  triggerHaptic("heavy");
                  handleDelete(cat);
                }}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full min-h-[44px] text-sm font-medium text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/10 hover:text-[var(--pw-expense)] active:scale-98 cursor-pointer rounded-xl"
                  >
                    <Trash2 className="size-4 mr-1.5" />
                    ลบหมวดหมู่มาตรฐาน
                  </Button>
                }
              />
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Floating Action Button for Mobile (< sm) */}
      <button
        type="button"
        onClick={() => {
          triggerHaptic("medium");
          openCreateDialog();
        }}
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex sm:hidden items-center gap-2 rounded-full bg-[var(--pw-primary)] hover:bg-[var(--pw-primary-hover)] text-white px-4 py-3 shadow-xl shadow-[var(--pw-primary)]/30 font-semibold text-xs active:scale-95 transition-transform cursor-pointer"
        aria-label="เพิ่มหมวดหมู่มาตรฐาน"
      >
        <Plus className="size-5" />
        <span>เพิ่มหมวดหมู่</span>
      </button>
    </div>
  );
}
