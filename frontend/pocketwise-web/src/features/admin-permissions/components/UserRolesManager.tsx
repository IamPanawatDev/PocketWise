"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import {
  useAdminRoles,
  useAdminUsers,
  useAssignUserRolesMutation,
} from "../hooks/useAdminRoles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedList, AnimatedListItem } from "@/components/ui/animated-list";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  Check,
  Edit2,
  LoaderCircle,
  Mail,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import type { UserWithRolesResponse } from "@/types/admin.types";

export function UserRolesManager() {
  const { data: users = [], isLoading: isLoadingUsers } = useAdminUsers();
  const { data: roles = [], isLoading: isLoadingRoles } = useAdminRoles();
  const assignRolesMutation = useAssignUserRolesMutation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithRolesResponse | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        u.displayName.toLowerCase().includes(q) ||
        u.roles.some((r) => r.toLowerCase().includes(q)),
    );
  }, [users, searchQuery]);

  const openAssignDialog = (user: UserWithRolesResponse) => {
    setSelectedUser(user);
    setSelectedRoles([...user.roles]);
    setDialogError(null);
  };

  const closeDialog = () => {
    setSelectedUser(null);
    setSelectedRoles([]);
    setDialogError(null);
  };

  const toggleRole = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName) ? prev.filter((r) => r !== roleName) : [...prev, roleName],
    );
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    try {
      await assignRolesMutation.mutateAsync({
        userId: selectedUser.userId,
        body: { roleNames: selectedRoles },
      });
      toast.success(`อัปเดตบทบาทของ "${selectedUser.displayName}" สำเร็จ`);
      closeDialog();
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "ไม่สามารถบันทึกบทบาทผู้ใช้ได้";
      setDialogError(msg);
      toast.error(msg);
    }
  };

  if (isLoadingUsers || isLoadingRoles) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoaderCircle className="size-8 animate-spin text-[var(--pw-primary)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[var(--pw-ink)]">
            กำหนดบทบาทผู้ใช้งาน ({users.length} บัญชี)
          </h2>
          <p className="text-xs text-[var(--pw-ink)]/70">
            มอบหมายบทบาทและสิทธิ์การเข้าถึงให้กับบัญชีผู้ใช้ในระบบ
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-[var(--pw-ink)]/40" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ, อีเมล หรือบทบาท..."
            className="pl-9 h-9 text-base md:text-xs"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-sm text-[var(--pw-ink)]/60 bg-[var(--pw-canvas)]/30 rounded-lg border border-[var(--pw-hairline)]">
            ไม่พบบัญชีผู้ใช้ที่ตรงกับคำค้นหา
          </div>
        ) : (
          <AnimatedList className="space-y-3">
            {filteredUsers.map((u) => (
              <AnimatedListItem key={u.userId}>
                <Card
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/40 p-4"
                >
              <div className="flex items-start sm:items-center gap-3">
                <div className="size-9 rounded-full bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] flex items-center justify-center shrink-0">
                  <User className="size-4 text-[var(--pw-primary)]" />
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[var(--pw-ink)] truncate">
                      {u.displayName}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.2 rounded-full ${
                        u.isActive
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-zinc-700/30 text-zinc-400 border border-zinc-700"
                      }`}
                    >
                      {u.isActive ? "Active" : "Disabled"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-[var(--pw-ink)]/60 mt-0.5">
                    <Mail className="size-3" />
                    <span className="truncate">{u.email}</span>
                  </div>
                </div>
              </div>

              {/* Roles Badges & Action */}
              <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-0 border-[var(--pw-hairline)]">
                <div className="flex flex-wrap items-center gap-1.5">
                  {u.roles.length === 0 ? (
                    <span className="text-xs text-[var(--pw-ink)]/40 italic">ไม่มีบทบาท</span>
                  ) : (
                    u.roles.map((r) => (
                      <span
                        key={r}
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          r.toUpperCase() === "ADMIN"
                            ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            : "bg-[var(--pw-primary)]/15 text-[var(--pw-primary)] border border-[var(--pw-primary)]/30"
                        }`}
                      >
                        {r}
                      </span>
                    ))
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openAssignDialog(u)}
                  className="h-8 text-xs shrink-0"
                >
                  <Edit2 className="size-3.5" />
                  แก้ไขบทบาท
                </Button>
              </div>
            </Card>
          </AnimatedListItem>
          ))}
        </AnimatedList>
        )}
      </div>

      {/* Assign Roles Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-[var(--pw-rounded-lg)] bg-[var(--pw-surface-indigo)] border border-[var(--pw-hairline)] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--pw-hairline)]">
              <div>
                <h3 className="text-base font-semibold text-[var(--pw-ink)]">
                  กำหนดบทบาท: {selectedUser.displayName}
                </h3>
                <p className="text-xs text-[var(--pw-ink)]/60">{selectedUser.email}</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={closeDialog}>
                <X className="size-4" />
              </Button>
            </div>

            {dialogError && (
              <div className="flex items-center gap-2 p-3 text-xs text-[var(--pw-magenta)] bg-[var(--pw-magenta)]/10 border border-[var(--pw-magenta)]/30 rounded-[var(--pw-rounded-xs)]">
                <AlertCircle className="size-4 shrink-0 text-[var(--pw-magenta)]" />
                <span>{dialogError}</span>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--pw-ink)]/80 mb-2">
                เลือกบทบาทที่ต้องการมอบหมาย:
              </p>

              {roles.map((role) => {
                const checked = selectedRoles.includes(role.name);
                return (
                  <div
                    key={role.id}
                    onClick={() => toggleRole(role.name)}
                    className={`flex items-center justify-between p-3 rounded-[var(--pw-rounded-sm)] border cursor-pointer transition ${
                      checked
                        ? "bg-[var(--pw-primary)]/10 border-[var(--pw-primary)]/50"
                        : "bg-[var(--pw-canvas)] border-[var(--pw-hairline)] opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-[var(--pw-ink)]">
                          {role.name}
                        </span>
                        {role.name.toUpperCase() === "ADMIN" && (
                          <ShieldCheck className="size-4 text-amber-400" />
                        )}
                      </div>
                      <p className="text-xs text-[var(--pw-ink)]/60 mt-0.5">
                        {role.description || `${role.permissionCount} สิทธิ์`}
                      </p>
                    </div>

                    <Checkbox
                      checked={checked}
                      className="pointer-events-none size-5 rounded-[var(--pw-rounded-xs)]"
                      aria-hidden="true"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col-reverse gap-2 pt-4 border-t border-[var(--pw-hairline)] sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" className="w-full sm:w-auto" onClick={closeDialog}>
                ยกเลิก
              </Button>
              <Button
                type="button"
                variant="default"
                className="w-full sm:w-auto"
                onClick={handleSave}
                disabled={assignRolesMutation.isPending}
              >
                {assignRolesMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                บันทึกบทบาท
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
