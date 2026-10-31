"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Megaphone,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  Clock,
  ShieldAlert,
  Users,
  CheckCircle2,
  XCircle,
  X,
  Target,
} from "lucide-react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import {
  useAdminAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useUpdateAnnouncementMutation,
  useDeleteAnnouncementMutation,
} from "@/features/admin-operations/hooks/useAdminOperations";
import { useAdminRoles } from "@/features/admin-permissions/hooks/useAdminRoles";
import { cn } from "@/lib/utils";
import {
  formatDisplayDateTime,
  formatDisplayDate,
  toThailandDateTimeInputValue,
} from "@/lib/date-utils";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BottomSheet, BottomSheetFooter } from "@/components/ui/bottom-sheet";
import { DateTimeInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import type { Announcement, AnnouncementTarget } from "@/types/admin-operations.types";

export default function AdminAnnouncementsPage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { data: announcements = [], isLoading, refetch } = useAdminAnnouncementsQuery();
  const { data: roles = [] } = useAdminRoles();

  const createMutation = useCreateAnnouncementMutation();
  const updateMutation = useUpdateAnnouncementMutation();
  const deleteMutation = useDeleteAnnouncementMutation();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [targets, setTargets] = useState<AnnouncementTarget[]>([{ targetType: "All" }]);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const isAdmin = user?.roles?.includes("Admin") ?? true;

  if (!isUserLoading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="size-16 text-[var(--pw-expense)] mb-4" />
        <h1 className="text-xl font-bold text-[var(--pw-ink)]">
          ปฏิเสธการเข้าถึง (Access Denied)
        </h1>
        <p className="text-sm text-[var(--pw-ink)]/70 mt-2 max-w-md">
          คุณต้องมีบทบาทระดับ Admin จึงจะสามารถจัดการประกาศของระบบได้
        </p>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setEditingId(null);
    setTitle("");
    setMessage("");
    const now = new Date();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setStartsAt(toThailandDateTimeInputValue(now));
    setEndsAt(toThailandDateTimeInputValue(nextWeek));
    setIsActive(true);
    setTargets([{ targetType: "All" }]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Announcement) => {
    setEditingId(item.announcementId);
    setTitle(item.title);
    setMessage(item.message);
    setStartsAt(toThailandDateTimeInputValue(item.startsAt));
    setEndsAt(toThailandDateTimeInputValue(item.endsAt));
    setIsActive(item.isActive);
    setTargets(item.targets.length > 0 ? item.targets : [{ targetType: "All" }]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleAddTargetRule = () => {
    setTargets([...targets, { targetType: "All" }]);
  };

  const handleRemoveTargetRule = (index: number) => {
    if (targets.length === 1) return;
    setTargets(targets.filter((_, i) => i !== index));
  };

  const handleTargetChange = (
    index: number,
    field: keyof AnnouncementTarget,
    value: any
  ) => {
    const updated = [...targets];
    updated[index] = { ...updated[index], [field]: value };
    setTargets(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim()) {
      setFormError("กรุณากรอกหัวข้อประกาศ");
      return;
    }
    if (!message.trim()) {
      setFormError("กรุณากรอกเนื้อหาประกาศ");
      return;
    }
    if (!startsAt || !endsAt) {
      setFormError("กรุณาระบุเวลาเริ่มต้นและสิ้นสุดของประกาศ");
      return;
    }

    const payload = {
      title: title.trim(),
      message: message.trim(),
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      isActive,
      targets: targets.map((t) => ({
        targetType: t.targetType,
        roleId: t.targetType === "Role" && t.roleId ? Number(t.roleId) : null,
        userId: t.targetType === "User" && t.userId ? Number(t.userId) : null,
      })),
    };

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, body: payload });
        toast.success("อัปเดตประกาศระบบเรียบร้อยแล้ว");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("สร้างประกาศระบบใหม่เรียบร้อยแล้ว");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "เกิดข้อผิดพลาดในการบันทึกประกาศ");
      toast.error(err?.message || "เกิดข้อผิดพลาดในการบันทึกประกาศ");
    }
  };

  const handleDelete = (item: Announcement) => {
    setDeleteTarget(item);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.announcementId);
      toast.success(`ลบประกาศ "${deleteTarget.title}" เรียบร้อยแล้ว`);
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.message || "เกิดข้อผิดพลาดในการลบประกาศ");
    }
  };

  const renderTargetBadge = (target: AnnouncementTarget) => {
    switch (target.targetType) {
      case "All":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-500 uppercase">
            ผู้ใช้ทุกคน (All)
          </span>
        );
      case "Role":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-500 uppercase">
            บทบาท: {target.roleName || target.roleId}
          </span>
        );
      case "User":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 uppercase">
            ผู้ใช้: {target.userEmail || `#${target.userId}`}
          </span>
        );
      case "UnverifiedEmail":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-500 uppercase">
            ยังไม่ยืนยันอีเมล
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]">
            <Megaphone className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--pw-ink)]">
              จัดการประกาศระบบ (System Announcements)
            </h1>
            <p className="text-xs sm:text-sm text-[var(--pw-ink)]/75">
              สร้าง เผยแพร่ และกำหนดกลุ่มเป้าหมายของข้อความแจ้งเตือนสำคัญ
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--pw-primary)] text-white text-xs sm:text-sm font-semibold shadow-xs hover:opacity-90 transition-all duration-150 active:scale-95"
        >
          <Plus className="size-4" />
          <span>สร้างประกาศใหม่</span>
        </button>
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-[var(--pw-ink)]/60">
            กำลังโหลดข้อมูลประกาศ...
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/60 text-[var(--pw-ink)]/60 space-y-3">
            <Megaphone className="size-10 mx-auto text-[var(--pw-ink)]/30" />
            <div className="text-sm font-semibold text-[var(--pw-ink)]">
              ยังไม่มีประกาศในระบบ
            </div>
            <p className="text-xs max-w-sm mx-auto">
              สร้างประกาศเพื่อสื่อสารข้อมูล ข่าวสารการปิดปรับปรุง หรือคำแนะนำสำคัญไปยังผู้ใช้งานของคุณ
            </p>
          </div>
        ) : (
          announcements.map((item) => {
            const isCurrentlyActive =
              item.isActive &&
              new Date(item.startsAt) <= new Date() &&
              new Date(item.endsAt) >= new Date();

            return (
              <motion.div
                key={item.announcementId}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-4 sm:p-5 rounded-2xl border bg-[var(--pw-surface)] transition-all space-y-3 shadow-xs",
                  isCurrentlyActive
                    ? "border-[var(--pw-primary)]/40 hover:border-[var(--pw-primary)]"
                    : "border-[var(--pw-hairline)] opacity-80"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2.5 rounded-full shrink-0",
                        isCurrentlyActive ? "bg-[var(--pw-income)]" : "bg-zinc-400"
                      )}
                    />
                    <h3 className="font-bold text-sm sm:text-base text-[var(--pw-ink)]">
                      {item.title}
                    </h3>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                        item.isActive
                          ? "bg-[var(--pw-income)]/15 text-[var(--pw-income)]"
                          : "bg-[var(--pw-expense)]/15 text-[var(--pw-expense)]"
                      )}
                    >
                      {item.isActive ? "เปิดใช้งาน (Active)" : "ปิดการใช้งาน (Disabled)"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 rounded-lg border border-[var(--pw-hairline)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30 transition-all duration-150 active:scale-95"
                      title="แก้ไขประกาศ"
                    >
                      <Edit2 className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-1.5 rounded-lg border border-[var(--pw-expense)]/30 text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/15 transition-all duration-150 active:scale-95"
                      title="ลบประกาศ"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[var(--pw-ink)]/85 whitespace-pre-wrap leading-relaxed">
                  {item.message}
                </p>

                {/* Target rules & Date badges */}
                <div className="pt-2 border-t border-[var(--pw-hairline)]/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-[var(--pw-ink)]/50 flex items-center gap-1">
                      <Target className="size-3" /> เป้าหมาย:
                    </span>
                    {item.targets.map((tgt, i) => (
                      <span key={i}>{renderTargetBadge(tgt)}</span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-[var(--pw-ink)]/60">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> เริ่ม: {formatDisplayDateTime(item.startsAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" /> สิ้นสุด: {formatDisplayDateTime(item.endsAt)}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* ANNOUNCEMENT CREATE / EDIT BOTTOM SHEET                          */}
      {/* ---------------------------------------------------------------- */}
      <BottomSheet
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingId ? "แก้ไขประกาศระบบ" : "สร้างประกาศใหม่"}
        description="ระบุรายละเอียด ข้อความ และกลุ่มเป้าหมายที่จะได้รับประกาศนี้"
        className="sm:max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {formError && (
            <div className="p-3 rounded-xl border border-[var(--pw-expense)]/40 bg-[var(--pw-expense)]/10 text-xs text-[var(--pw-expense)] flex items-center gap-2">
              <ShieldAlert className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block font-semibold text-xs text-[var(--pw-ink)] mb-1">
              หัวข้อประกาศ <span className="text-[var(--pw-expense)]">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น ปรับปรุงระบบประจำสัปดาห์ หรือ ฟีเจอร์ใหม่พร้อมใช้งาน"
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            />
          </div>

          <div>
            <label className="block font-semibold text-xs text-[var(--pw-ink)] mb-1">
              เนื้อหาประกาศ <span className="text-[var(--pw-expense)]">*</span>
            </label>
            <textarea
              rows={3}
              required
              maxLength={2000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="ระบุข้อความประกาศที่ต้องการแจ้งเตือนผู้ใช้งาน..."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
            />
          </div>

          {/* Unified Shared DateTimeInput Components */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="เวลาเริ่มต้นแสดงผล" htmlFor="announcement-starts-at">
              <DateTimeInput
                id="announcement-starts-at"
                value={startsAt}
                onChange={setStartsAt}
              />
            </FormField>

            <FormField label="เวลาสิ้นสุดแสดงผล" htmlFor="announcement-ends-at">
              <DateTimeInput
                id="announcement-ends-at"
                value={endsAt}
                onChange={setEndsAt}
              />
            </FormField>
          </div>

          {/* Target Rules Builder */}
          <div className="space-y-2 pt-2 border-t border-[var(--pw-hairline)]">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-xs text-[var(--pw-ink)]">
                เงื่อนไขกลุ่มเป้าหมาย (Target Rules)
              </label>
              <button
                type="button"
                onClick={handleAddTargetRule}
                className="text-xs text-[var(--pw-primary)] hover:underline font-semibold flex items-center gap-1"
              >
                <Plus className="size-3" /> เพิ่มเงื่อนไข
              </button>
            </div>
            <p className="text-[11px] text-[var(--pw-ink)]/60">
              หากมีหลายเงื่อนไข ระบบจะรวมกลุ่มเป้าหมาย (Union) ให้ผู้ใช้ที่ตรงเงื่อนไขใดเงื่อนไขหนึ่งเห็นประกาศ
            </p>

            <div className="space-y-2">
              {targets.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-hairline)]/10 flex flex-wrap items-center gap-2"
                >
                  <div className="w-48">
                    <Select
                      value={rule.targetType}
                      onValueChange={(val) =>
                        handleTargetChange(idx, "targetType", val as any)
                      }
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">ผู้ใช้ทุกคน (All)</SelectItem>
                        <SelectItem value="Role">เฉพาะบทบาท (Role)</SelectItem>
                        <SelectItem value="User">เฉพาะรหัสผู้ใช้ (User ID)</SelectItem>
                        <SelectItem value="UnverifiedEmail">ยังไม่ยืนยันอีเมล</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {rule.targetType === "Role" && (
                    <div className="w-44">
                      <Select
                        value={rule.roleId ? String(rule.roleId) : ""}
                        onValueChange={(val) =>
                          handleTargetChange(idx, "roleId", Number(val))
                        }
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="เลือกบทบาท..." />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((r) => (
                            <SelectItem key={r.id} value={String(r.id)}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {rule.targetType === "User" && (
                    <input
                      type="number"
                      placeholder="User ID เช่น 3"
                      value={rule.userId || ""}
                      onChange={(e) =>
                        handleTargetChange(idx, "userId", e.target.value ? Number(e.target.value) : undefined)
                      }
                      className="w-28 px-2.5 py-1.5 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] text-xs"
                    />
                  )}

                  {targets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTargetRule(idx)}
                      className="p-1 rounded text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/10 ml-auto"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded text-[var(--pw-primary)]"
            />
            <label htmlFor="isActiveToggle" className="font-semibold text-xs text-[var(--pw-ink)] cursor-pointer">
              เปิดใช้งานประกาศนี้ (Active)
            </label>
          </div>

          {/* BottomSheet Button Hierarchy: Confirm on TOP, Cancel on BOTTOM */}
          <BottomSheetFooter>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="w-full"
            >
              {editingId ? "บันทึกการแก้ไข" : "สร้างประกาศ"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setIsModalOpen(false)}
            >
              ยกเลิก
            </Button>
          </BottomSheetFooter>
        </form>
      </BottomSheet>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบประกาศระบบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบประกาศ &ldquo;{deleteTarget?.title}&rdquo; ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              className="bg-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/90 text-white"
              onClick={handleConfirmDelete}
            >
              ลบประกาศ
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>
              ยกเลิก
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
