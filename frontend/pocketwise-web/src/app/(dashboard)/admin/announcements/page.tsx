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
    setStartsAt(now.toISOString().slice(0, 16));
    setEndsAt(nextWeek.toISOString().slice(0, 16));
    setIsActive(true);
    setTargets([{ targetType: "All" }]);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Announcement) => {
    setEditingId(item.announcementId);
    setTitle(item.title);
    setMessage(item.message);
    setStartsAt(new Date(item.startsAt).toISOString().slice(0, 16));
    setEndsAt(new Date(item.endsAt).toISOString().slice(0, 16));
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

  const handleTargetChange = (index: number, field: keyof AnnouncementTarget, value: any) => {
    const updated = [...targets];
    updated[index] = { ...updated[index], [field]: value };
    setTargets(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !message.trim()) {
      setFormError("กรุณากรอกหัวข้อและเนื้อหาประกาศ");
      return;
    }

    if (new Date(endsAt) <= new Date(startsAt)) {
      setFormError("เวลาสิ้นสุดประกาศต้องมากกว่าเวลาเริ่มต้น");
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
      } else {
        await createMutation.mutateAsync(payload);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err?.message || "เกิดข้อผิดพลาดในการบันทึกประกาศ");
    }
  };

  const handleDelete = async (item: Announcement) => {
    if (!confirm(`คุณต้องการลบประกาศ "${item.title}" ใช่หรือไม่?`)) return;
    try {
      await deleteMutation.mutateAsync(item.announcementId);
    } catch (err: any) {
      alert(err?.message || "เกิดข้อผิดพลาดในการลบประกาศ");
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
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[var(--pw-primary)]/10 text-[var(--pw-primary)]">
            <Megaphone className="size-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--pw-ink)]">
              จัดการประกาศของระบบ (Announcements Management)
            </h1>
            <p className="text-xs sm:text-sm text-[var(--pw-ink)]/70">
              สร้างและเผยแพร่ข้อความแจ้งเตือนถึงผู้ใช้งานตามเงื่อนไขเป้าหมาย (Role, User, Unverified)
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="self-start sm:self-auto px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-[var(--pw-primary)] text-white hover:opacity-90 transition-opacity flex items-center gap-2 shadow-sm"
        >
          <Plus className="size-4" /> สร้างประกาศใหม่
        </button>
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="p-12 text-center text-[var(--pw-ink)]/60 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]">
            กำลังโหลดประกาศ...
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center text-[var(--pw-ink)]/60 rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]">
            ยังไม่มีประกาศในระบบ คลิก &quot;สร้างประกาศใหม่&quot; เพื่อเริ่มต้น
          </div>
        ) : (
          announcements.map((item) => {
            const isCurrentlyActive =
              item.isActive &&
              new Date(item.startsAt) <= new Date() &&
              new Date(item.endsAt) >= new Date();

            return (
              <div
                key={item.announcementId}
                className={cn(
                  "p-4 sm:p-5 rounded-xl border bg-[var(--pw-surface)] shadow-sm transition-all",
                  isCurrentlyActive
                    ? "border-[var(--pw-primary)]/40 ring-1 ring-[var(--pw-primary)]/20"
                    : "border-[var(--pw-hairline)] opacity-85"
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-base text-[var(--pw-ink)]">
                        {item.title}
                      </h3>
                      {isCurrentlyActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--pw-income)]/15 text-[var(--pw-income)]">
                          <CheckCircle2 className="size-3" /> เผยแพร่อยู่ (LIVE)
                        </span>
                      ) : !item.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--pw-hairline)]/60 text-[var(--pw-ink)]/60">
                          <XCircle className="size-3" /> ปิดใช้งาน
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-500">
                          <Clock className="size-3" /> นอกช่วงเวลาแสดงผล
                        </span>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-[var(--pw-ink)]/80 whitespace-pre-line leading-relaxed">
                      {item.message}
                    </p>

                    {/* Target rules & dates */}
                    <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-[var(--pw-ink)]/60">
                      <div className="flex items-center gap-1.5">
                        <Target className="size-3.5 text-[var(--pw-primary)]" />
                        <span className="font-medium">กลุ่มเป้าหมาย:</span>
                        <div className="flex flex-wrap gap-1">
                          {item.targets.map((t, idx) => (
                            <span key={idx}>{renderTargetBadge(t)}</span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3.5" />
                        <span>
                          {new Date(item.startsAt).toLocaleString("th-TH")} &rarr;{" "}
                          {new Date(item.endsAt).toLocaleString("th-TH")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 rounded-lg border border-[var(--pw-hairline)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30 transition-colors"
                      title="แก้ไขประกาศ"
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="p-2 rounded-lg border border-[var(--pw-expense)]/30 text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/10 transition-colors"
                      title="ลบประกาศ"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)] p-5 sm:p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[var(--pw-hairline)] pb-3">
                <h3 className="font-bold text-lg text-[var(--pw-ink)]">
                  {editingId ? "แก้ไขประกาศ" : "สร้างประกาศใหม่"}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-[var(--pw-ink)]/60 hover:text-[var(--pw-ink)]"
                >
                  <X className="size-5" />
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg border border-[var(--pw-expense)]/30 bg-[var(--pw-expense)]/10 text-xs text-[var(--pw-expense)]">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-semibold text-[var(--pw-ink)] mb-1">
                    หัวข้อประกาศ <span className="text-[var(--pw-expense)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="เช่น ปรับปรุงระบบประจำสัปดาห์ หรือ ฟีเจอร์ใหม่พร้อมใช้งาน"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[var(--pw-ink)] mb-1">
                    เนื้อหาประกาศ <span className="text-[var(--pw-expense)]">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    maxLength={2000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="ระบุข้อความประกาศที่ต้องการแจ้งเตือนผู้ใช้งาน..."
                    className="w-full px-3 py-2 rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[var(--pw-ink)] mb-1">
                      เวลาเริ่มต้นแสดงผล
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={startsAt}
                      onChange={(e) => setStartsAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[var(--pw-ink)] mb-1">
                      เวลาสิ้นสุดแสดงผล
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={endsAt}
                      onChange={(e) => setEndsAt(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] focus:outline-none focus:border-[var(--pw-primary)]"
                    />
                  </div>
                </div>

                {/* Target Rules Builder */}
                <div className="space-y-2 pt-2 border-t border-[var(--pw-hairline)]">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-[var(--pw-ink)]">
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
                        <select
                          value={rule.targetType}
                          onChange={(e) =>
                            handleTargetChange(idx, "targetType", e.target.value as any)
                          }
                          className="px-2.5 py-1.5 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] text-xs"
                        >
                          <option value="All">ผู้ใช้ทุกคน (All)</option>
                          <option value="Role">เฉพาะบทบาท (Role)</option>
                          <option value="User">เฉพาะรหัสผู้ใช้ (User ID)</option>
                          <option value="UnverifiedEmail">ยังไม่ยืนยันอีเมล</option>
                        </select>

                        {rule.targetType === "Role" && (
                          <select
                            value={rule.roleId || ""}
                            onChange={(e) =>
                              handleTargetChange(idx, "roleId", Number(e.target.value))
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] text-xs"
                          >
                            <option value="">เลือกบทบาท...</option>
                            {roles.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {rule.targetType === "User" && (
                          <input
                            type="number"
                            placeholder="User ID เช่น 1"
                            value={rule.userId || ""}
                            onChange={(e) =>
                              handleTargetChange(idx, "userId", e.target.value ? Number(e.target.value) : null)
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-[var(--pw-hairline)] bg-transparent text-[var(--pw-ink)] text-xs w-32"
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
                  <label htmlFor="isActiveToggle" className="font-semibold text-xs text-[var(--pw-ink)]">
                    เปิดใช้งานประกาศนี้ (Active)
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--pw-hairline)]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface)] text-[var(--pw-ink)] hover:bg-[var(--pw-hairline)]/30"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="px-4 py-2 text-xs font-bold rounded-lg bg-[var(--pw-primary)] text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {editingId ? "บันทึกการแก้ไข" : "สร้างประกาศ"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
