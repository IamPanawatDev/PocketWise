"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import {
  useAdminRoles,
  useCreateRoleMutation,
  useDeleteRoleMutation,
  useUpdateRoleMutation,
} from "../hooks/useAdminRoles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormField } from "@/components/ui/form-field";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  AlertCircle,
  Check,
  Edit2,
  KeyRound,
  LoaderCircle,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import type { RoleResponse } from "@/types/admin.types";

export function RolesManager() {
  const { data: roles = [], isLoading } = useAdminRoles();
  const createMutation = useCreateRoleMutation();
  const updateMutation = useUpdateRoleMutation();
  const deleteMutation = useDeleteRoleMutation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleResponse | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateDialog = () => {
    setEditingRole(null);
    setFormName("");
    setFormDescription("");
    setFormIsActive(true);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (role: RoleResponse) => {
    setEditingRole(role);
    setFormName(role.name);
    setFormDescription(role.description || "");
    setFormIsActive(role.isActive);
    setFormError(null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingRole(null);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setFormError("กรุณาระบุชื่อบทบาท");
      return;
    }

    try {
      if (editingRole) {
        await updateMutation.mutateAsync({
          id: editingRole.id,
          body: {
            name: trimmedName,
            description: formDescription.trim() || undefined,
            isActive: formIsActive,
          },
        });
        toast.success(`บันทึกการแก้ไขบทบาท "${trimmedName}" สำเร็จ`);
      } else {
        await createMutation.mutateAsync({
          name: trimmedName,
          description: formDescription.trim() || undefined,
        });
        toast.success(`สร้างบทบาท "${trimmedName}" สำเร็จ`);
      }
      closeDialog();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึกข้อมูล";
      setFormError(msg);
      toast.error(msg);
    }
  };

  const handleDelete = async (role: RoleResponse) => {
    try {
      await deleteMutation.mutateAsync(role.id);
      toast.success(`ลบบทบาท "${role.name}" เรียบร้อยแล้ว`);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "ไม่สามารถลบบทบาทได้";
      toast.error(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoaderCircle className="size-8 animate-spin text-[var(--pw-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--pw-ink)]">
            รายการบทบาทในระบบ ({roles.length})
          </h2>
          <p className="text-xs text-[var(--pw-ink)]/70">
            สร้างและจัดการบทบาทเพื่อมอบหมายให้กับผู้ใช้งานในระบบ
          </p>
        </div>

        <Button type="button" variant="default" onClick={openCreateDialog}>
          <Plus className="size-4" />
          เพิ่มบทบาทใหม่
        </Button>
      </div>

      {/* Roles Cards / Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => {
          const isSystemRole = role.name.toUpperCase() === "ADMIN";

          return (
            <Card
              key={role.id}
              className="flex flex-col justify-between border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/40 p-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-base text-[var(--pw-ink)]">
                      {role.name}
                    </span>
                    {isSystemRole && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        บทบาทหลักระบบ
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      role.isActive
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-zinc-700/30 text-zinc-400 border border-zinc-700"
                    }`}
                  >
                    {role.isActive ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                  </span>
                </div>

                <p className="text-xs text-[var(--pw-ink)]/70 line-clamp-2 min-h-8 mb-4">
                  {role.description || "ไม่มีคำอธิบายบทบาท"}
                </p>

                <div className="flex items-center gap-4 text-xs text-[var(--pw-ink)]/80 pt-2 border-t border-[var(--pw-hairline)]">
                  <div className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-sky-400" />
                    <span>{role.userCount} ผู้ใช้</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <KeyRound className="size-3.5 text-amber-400" />
                    <span>{role.permissionCount} สิทธิ์</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-[var(--pw-hairline)]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(role)}
                  className="h-8 text-xs"
                >
                  <Edit2 className="size-3.5 text-[var(--pw-primary)]" />
                  แก้ไข
                </Button>

                {!isSystemRole && (
                  <ConfirmDialog
                    trigger={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-[var(--pw-expense)] hover:text-[var(--pw-expense)] hover:bg-[var(--pw-expense)]/10"
                      >
                        <Trash2 className="size-3.5" />
                        ลบ
                      </Button>
                    }
                    title={`ยืนยันการลบบทบาท "${role.name}"`}
                    description="หากลบบทบาทนี้ ผู้ใช้ที่มีบทบาทนี้จะถูกนำออกจากบทบาทโดยอัตโนมัติ การดำเนินการนี้ไม่สามารถยกเลิกได้"
                    confirmLabel="ลบบทบาท"
                    onConfirm={() => handleDelete(role)}
                    pending={deleteMutation.isPending}
                  />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Create / Edit Role Modal */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-[var(--pw-rounded-lg)] bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--pw-hairline)]">
              <h3 className="text-base font-semibold text-[var(--pw-ink)]">
                {editingRole ? `แก้ไขบทบาท: ${editingRole.name}` : "เพิ่มบทบาทใหม่"}
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
              <FormField label="ชื่อบทบาท *" htmlFor="role-name">
                <Input
                  id="role-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น Manager, Auditor, Editor"
                  disabled={editingRole?.name.toUpperCase() === "ADMIN"}
                  autoFocus
                />
              </FormField>

              <FormField label="คำอธิบายบทบาท" htmlFor="role-desc">
                <Input
                  id="role-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="ระบุหน้าที่ความรับผิดชอบของบทบาทนี้"
                />
              </FormField>

              <div className="flex items-center gap-2.5 pt-2">
                <Checkbox
                  id="role-active"
                  checked={formIsActive}
                  onCheckedChange={(checked) => setFormIsActive(Boolean(checked))}
                  disabled={editingRole?.name.toUpperCase() === "ADMIN"}
                />
                <Label
                  htmlFor="role-active"
                  className="mb-0 cursor-pointer text-sm font-medium leading-none text-[var(--pw-ink)] select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  เปิดใช้งานบทบาทนี้
                </Label>
              </div>

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
                  {createMutation.isPending || updateMutation.isPending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {editingRole ? "บันทึกการแก้ไข" : "สร้างบทบาท"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
