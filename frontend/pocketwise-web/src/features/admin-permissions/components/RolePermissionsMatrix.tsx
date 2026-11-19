"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-client";
import {
  useAdminPermissions,
  useAdminRoleDetail,
  useAdminRoles,
  useUpdateRolePermissionsMutation,
} from "../hooks/useAdminRoles";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  CheckSquare,
  FileUp,
  FolderTree,
  LoaderCircle,
  PieChart,
  Save,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Square,
  Wallet,
  X,
  Filter,
} from "lucide-react";
import type { PermissionResponse } from "@/types/admin.types";

const MODULE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  Transactions: { label: "ธุรกรรมและการเงิน", icon: Wallet, color: "text-emerald-400" },
  Budgets: { label: "งบประมาณ", icon: Wallet, color: "text-amber-400" },
  Categories: { label: "หมวดหมู่และแท็ก", icon: FolderTree, color: "text-sky-400" },
  Categorization: { label: "จัดหมวดหมู่อัตโนมัติ (Auto-Categorization)", icon: Sparkles, color: "text-pink-400" },
  Reports: { label: "รายงานและสถิติ", icon: PieChart, color: "text-indigo-400" },
  Imports: { label: "นำเข้าข้อมูลสลิป/สเตทเมนต์", icon: FileUp, color: "text-purple-400" },
  Admin: { label: "การจัดการระบบ (Admin)", icon: ShieldCheck, color: "text-rose-400" },
};

export function RolePermissionsMatrix() {
  const { data: roles = [], isLoading: isLoadingRoles } = useAdminRoles();
  const { data: allPermissions = [], isLoading: isLoadingPerms } = useAdminPermissions();

  const [selectedRoleIdState, setSelectedRoleIdState] = useState<number | null>(null);
  const activeRoleId = selectedRoleIdState ?? roles[0]?.id ?? null;

  const { data: roleDetail, isLoading: isLoadingDetail } = useAdminRoleDetail(activeRoleId);
  const updatePermissionsMutation = useUpdateRolePermissionsMutation();

  const [dirtyPermissionsMap, setDirtyPermissionsMap] = useState<Record<number, number[]>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "granted" | "revoked">("all");

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const map = new Map<string, PermissionResponse[]>();
    for (const perm of allPermissions) {
      const moduleKey = perm.module || "General";
      const list = map.get(moduleKey) || [];
      list.push(perm);
      map.set(moduleKey, list);
    }
    return map;
  }, [allPermissions]);

  const initialIds = useMemo(() => {
    return roleDetail?.permissions.map((p) => p.permissionId) ?? [];
  }, [roleDetail]);

  const activeSelectedIds = useMemo(() => {
    if (!activeRoleId) return [];
    if (dirtyPermissionsMap[activeRoleId] !== undefined) {
      return dirtyPermissionsMap[activeRoleId];
    }
    return initialIds;
  }, [activeRoleId, dirtyPermissionsMap, initialIds]);

  const currentIds = useMemo(() => new Set(activeSelectedIds), [activeSelectedIds]);

  const isDirty = useMemo(() => {
    if (!activeRoleId || dirtyPermissionsMap[activeRoleId] === undefined) return false;
    const initialSet = new Set(initialIds);
    if (initialSet.size !== currentIds.size) return true;
    for (const id of initialSet) {
      if (!currentIds.has(id)) return true;
    }
    return false;
  }, [activeRoleId, dirtyPermissionsMap, initialIds, currentIds]);

  // Filtered permissions by search and status
  const filteredGroupedPermissions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const map = new Map<string, PermissionResponse[]>();

    for (const [moduleName, perms] of groupedPermissions.entries()) {
      const filtered = perms.filter((perm) => {
        const isGranted = currentIds.has(perm.permissionId);
        if (statusFilter === "granted" && !isGranted) return false;
        if (statusFilter === "revoked" && isGranted) return false;

        if (!q) return true;
        return (
          perm.permissionName.toLowerCase().includes(q) ||
          perm.permissionCode.toLowerCase().includes(q) ||
          (perm.description && perm.description.toLowerCase().includes(q))
        );
      });

      if (filtered.length > 0) {
        map.set(moduleName, filtered);
      }
    }
    return map;
  }, [groupedPermissions, searchQuery, statusFilter, currentIds]);

  const togglePermission = (id: number) => {
    if (!activeRoleId) return;
    const next = currentIds.has(id)
      ? activeSelectedIds.filter((p) => p !== id)
      : [...activeSelectedIds, id];

    setDirtyPermissionsMap((prev) => ({
      ...prev,
      [activeRoleId]: next,
    }));
  };

  const toggleModule = (modulePerms: PermissionResponse[]) => {
    if (!activeRoleId) return;
    const moduleIds = modulePerms.map((p) => p.permissionId);
    const allSelected = moduleIds.every((id) => currentIds.has(id));

    let next: number[];
    if (allSelected) {
      next = activeSelectedIds.filter((id) => !moduleIds.includes(id));
    } else {
      next = Array.from(new Set([...activeSelectedIds, ...moduleIds]));
    }

    setDirtyPermissionsMap((prev) => ({
      ...prev,
      [activeRoleId]: next,
    }));
  };

  const handleReset = () => {
    if (!activeRoleId) return;
    setDirtyPermissionsMap((prev) => {
      const copy = { ...prev };
      delete copy[activeRoleId];
      return copy;
    });
    toast.info("ยกเลิกการเปลี่ยนแปลงสิทธิ์แล้ว");
  };

  const handleSave = async () => {
    if (!activeRoleId) return;
    try {
      await updatePermissionsMutation.mutateAsync({
        id: activeRoleId,
        body: { permissionIds: activeSelectedIds },
      });
      setDirtyPermissionsMap((prev) => {
        const copy = { ...prev };
        delete copy[activeRoleId];
        return copy;
      });
      toast.success(
        `บันทึกชุดสิทธิ์ของบทบาท "${activeRole?.name ?? ""}" สำเร็จแล้ว (${activeSelectedIds.length} สิทธิ์)`
      );
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
          ? err.message
          : "ไม่สามารถบันทึกสิทธิ์ได้";
      toast.error(msg);
    }
  };

  if (isLoadingRoles || isLoadingPerms) {
    return (
      <div className="space-y-6">
        <Card className="h-24 w-full animate-pulse bg-[var(--pw-surface-indigo)]/50" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              <div className="space-y-2 pt-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const activeRole = roles.find((r) => r.id === activeRoleId);
  const totalCount = allPermissions.length;
  const grantedCount = currentIds.size;
  const percentGranted = totalCount > 0 ? Math.round((grantedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Role Picker & Overview Banner */}
      <div className="rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/40 p-4 sm:p-5 backdrop-blur-md space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--pw-ink)]/70 uppercase tracking-wider block mb-2">
              เลือกระดับบทบาท (Role)
            </label>
            {/* Quick Segmented Role Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {roles.map((r) => {
                const isActive = activeRoleId === r.id;
                const isSystemAdmin = r.name.toUpperCase() === "ADMIN" || r.name.toUpperCase() === "SUPERADMIN";
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRoleIdState(r.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer border active:scale-95",
                      isActive
                        ? "bg-[var(--pw-primary)] text-white border-[var(--pw-primary)] shadow-sm scale-102"
                        : "bg-[var(--pw-surface-indigo)]/60 text-[var(--pw-ink)]/80 border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)] hover:text-[var(--pw-ink)]"
                    )}
                  >
                    <Shield className={cn("size-3.5", isActive ? "text-white" : isSystemAdmin ? "text-amber-400" : "text-[var(--pw-primary)]")} />
                    <span>{r.name}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                        isActive ? "bg-white/20 text-white" : "bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)]/60"
                      )}
                    >
                      {r.permissionCount}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop Save / Reset Action */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {isDirty && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={updatePermissionsMutation.isPending}
                className="h-10 text-xs border-[var(--pw-hairline)] hover:bg-[var(--pw-surface-onyx)]"
              >
                คืนค่าเดิม
              </Button>
            )}
            <Button
              type="button"
              variant="default"
              size="sm"
              disabled={!isDirty || updatePermissionsMutation.isPending}
              onClick={handleSave}
              className={cn(
                "h-10 text-xs font-bold px-4 gap-1.5 shadow-sm transition-all",
                isDirty
                  ? "bg-[var(--pw-primary)] hover:bg-[var(--pw-primary-hover)] text-white"
                  : "opacity-60"
              )}
            >
              {updatePermissionsMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {isDirty ? "บันทึกการเปลี่ยนแปลงสิทธิ์" : "บันทึกแล้ว"}
            </Button>
          </div>
        </div>

        {/* Role Description & Quick Summary Bar */}
        <div className="pt-2 border-t border-[var(--pw-hairline)]/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
          <p className="text-[var(--pw-ink)]/70">
            <span className="font-semibold text-[var(--pw-ink)]">{activeRole?.name}: </span>
            {activeRole?.description || "ไม่มีคำอธิบายบทบาท"}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[var(--pw-ink)]/60">
              ครอบคลุม {grantedCount} จาก {totalCount} สิทธิ์ ({percentGranted}%)
            </span>
            <div className="w-24 h-2 rounded-full bg-[var(--pw-surface-onyx)] border border-[var(--pw-hairline)] overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-[var(--pw-primary)] to-emerald-400 transition-all duration-300"
                style={{ width: `${percentGranted}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Search & Status Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[var(--pw-ink)]/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาสิทธิ์ตามชื่อ รหัส เช่น transactions, export, slip..."
            className="h-9 w-full rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/30 pl-8.5 pr-8 text-xs text-[var(--pw-ink)] placeholder:text-[var(--pw-ink)]/40 focus:border-[var(--pw-primary)] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--pw-ink)]/40 hover:text-[var(--pw-ink)] p-0.5"
            >
              <X className="size-3" />
            </button>
          )}
        </div>

        {/* Quick Filter Status Pills */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer",
              statusFilter === "all"
                ? "bg-[var(--pw-primary)]/15 border-[var(--pw-primary)] text-[var(--pw-primary)] font-semibold"
                : "border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/30 text-[var(--pw-ink)]/70 hover:bg-[var(--pw-surface-onyx)]"
            )}
          >
            ทั้งหมด
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("granted")}
            className={cn(
              "px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer",
              statusFilter === "granted"
                ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-400 font-semibold"
                : "border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/30 text-[var(--pw-ink)]/70 hover:bg-[var(--pw-surface-onyx)]"
            )}
          >
            เฉพาะที่เปิดใช้งาน ({grantedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("revoked")}
            className={cn(
              "px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer",
              statusFilter === "revoked"
                ? "bg-rose-500/15 border-rose-500/50 text-rose-400 font-semibold"
                : "border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/30 text-[var(--pw-ink)]/70 hover:bg-[var(--pw-surface-onyx)]"
            )}
          >
            เฉพาะที่ยังไม่เปิด ({totalCount - grantedCount})
          </button>
        </div>
      </div>

      {isLoadingDetail ? (
        <div className="flex items-center justify-center py-16">
          <LoaderCircle className="size-8 animate-spin text-[var(--pw-primary)]" />
        </div>
      ) : filteredGroupedPermissions.size === 0 ? (
        <div className="rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/20 p-8 text-center space-y-2">
          <Filter className="size-8 mx-auto text-[var(--pw-ink)]/30" />
          <p className="text-sm font-semibold text-[var(--pw-ink)]">ไม่พบรายการสิทธิ์ที่ตรงกับเงื่อนไข</p>
          <p className="text-xs text-[var(--pw-ink)]/50">ลองปรับคำค้นหา หรือเลือกตัวกรองสถานะเป็น &quot;ทั้งหมด&quot;</p>
        </div>
      ) : (
        /* Module-grouped Permission Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from(filteredGroupedPermissions.entries()).map(([moduleName, perms]) => {
            const config = MODULE_CONFIG[moduleName] || {
              label: moduleName,
              icon: FolderTree,
              color: "text-zinc-400",
            };
            const Icon = config.icon;
            const moduleIds = perms.map((p) => p.permissionId);
            const selectedInModule = moduleIds.filter((id) => currentIds.has(id)).length;
            const isAllSelected = selectedInModule === moduleIds.length;

            return (
              <Card
                key={moduleName}
                className="flex flex-col justify-between border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/25 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-xs"
              >
                <div>
                  {/* Module Header */}
                  <div className="flex items-center justify-between border-b border-[var(--pw-hairline)] pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`size-4.5 ${config.color}`} />
                      <h3 className="font-semibold text-sm text-[var(--pw-ink)]">
                        {config.label}
                      </h3>
                      <span className="text-xs font-mono font-medium text-[var(--pw-ink)]/50 bg-[var(--pw-surface-onyx)] px-2 py-0.5 rounded-full border border-[var(--pw-hairline)]">
                        {selectedInModule}/{moduleIds.length}
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleModule(perms)}
                      className="h-7 text-xs text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] cursor-pointer"
                    >
                      {isAllSelected ? (
                        <>
                          <CheckSquare className="size-3.5 text-emerald-400" />
                          ยกเลิกทั้งหมวด
                        </>
                      ) : (
                        <>
                          <Square className="size-3.5" />
                          เลือกทั้งหมวด
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Permissions List */}
                  <div className="space-y-2">
                    {perms.map((perm) => {
                      const checked = currentIds.has(perm.permissionId);
                      return (
                        <div
                          key={perm.permissionId}
                          onClick={() => togglePermission(perm.permissionId)}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all active:scale-[0.99]",
                            checked
                              ? "bg-[var(--pw-primary)]/10 border-[var(--pw-primary)]/50 text-[var(--pw-ink)] shadow-2xs"
                              : "bg-[var(--pw-surface)]/40 border-[var(--pw-hairline)] text-[var(--pw-ink)]/80 hover:bg-[var(--pw-surface-indigo)]/40 hover:text-[var(--pw-ink)]"
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            className="pointer-events-none mt-0.5 shrink-0"
                            aria-hidden="true"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs sm:text-sm font-semibold text-[var(--pw-ink)]">
                                {perm.permissionName}
                              </span>
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-[var(--pw-surface-onyx)] text-[var(--pw-ink)]/75 border border-[var(--pw-hairline)]">
                                {perm.permissionCode}
                              </span>
                            </div>
                            {perm.description && (
                              <p className="text-[11px] sm:text-xs text-[var(--pw-ink)]/65 mt-0.5 leading-relaxed">
                                {perm.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Floating Save Bar on Mobile (< sm) - Positioned safely above Mobile Bottom Nav */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] inset-x-4 z-40 sm:hidden rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface)]/95 backdrop-blur-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="size-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--pw-ink)] truncate">มีการแก้ไขสิทธิ์</p>
                <p className="text-[11px] text-[var(--pw-ink)]/60 truncate">
                  เลือก {activeSelectedIds.length} จาก {totalCount} สิทธิ์
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={updatePermissionsMutation.isPending}
                className="min-h-[40px] px-3 text-xs"
              >
                คืนค่าเดิม
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleSave}
                disabled={updatePermissionsMutation.isPending}
                className="min-h-[40px] px-3.5 text-xs font-bold bg-[var(--pw-primary)] hover:bg-[var(--pw-primary-hover)] text-white shadow-md disabled:opacity-85 disabled:text-white"
              >
                {updatePermissionsMutation.isPending ? (
                  <LoaderCircle className="size-4 animate-spin mr-1" />
                ) : (
                  <Save className="size-4 mr-1" />
                )}
                บันทึก
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}