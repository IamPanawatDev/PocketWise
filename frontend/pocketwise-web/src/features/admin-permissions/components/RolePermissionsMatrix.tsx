"use client";

import { useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckSquare,
  FileUp,
  FolderTree,
  LoaderCircle,
  PieChart,
  Save,
  ShieldCheck,
  Square,
  Wallet,
} from "lucide-react";
import type { PermissionResponse } from "@/types/admin.types";

const MODULE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  Transactions: { label: "ธุรกรรมและการเงิน", icon: Wallet, color: "text-emerald-400" },
  Budgets: { label: "งบประมาณ", icon: Wallet, color: "text-amber-400" },
  Categories: { label: "หมวดหมู่และแท็ก", icon: FolderTree, color: "text-sky-400" },
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
        <Card className="h-16 w-full animate-pulse bg-[var(--pw-surface-indigo)]/50" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

  return (
    <div className="space-y-6">
      {/* Role Picker Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-[var(--pw-rounded-lg)] bg-[var(--pw-surface-indigo)] p-4 border border-[var(--pw-hairline)]">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-[var(--pw-ink)] shrink-0">
            เลือกบทบาทที่ต้องการจัดการสิทธิ์:
          </label>
          <div className="w-56">
            <Select
              value={activeRoleId ? String(activeRoleId) : ""}
              onValueChange={(val) => {
                setSelectedRoleIdState(Number(val));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="เลือกบทบาท" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.name} ({r.permissionCount} สิทธิ์)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {activeRole && (
            <span className="text-xs text-[var(--pw-ink)]/70">
              {activeRole.description || "ไม่มีคำอธิบายบทบาท"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            disabled={!isDirty || updatePermissionsMutation.isPending}
            onClick={handleSave}
            className="w-full sm:w-auto"
          >
            {updatePermissionsMutation.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            บันทึกการเปลี่ยนแปลงสิทธิ์
          </Button>
        </div>
      </div>

      {isLoadingDetail ? (
        <div className="flex items-center justify-center py-12">
          <LoaderCircle className="size-6 animate-spin text-[var(--pw-primary)]" />
        </div>
      ) : (
        /* Module-grouped Permission Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from(groupedPermissions.entries()).map(([moduleName, perms]) => {
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
                className="flex flex-col justify-between border border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/40 p-4"
              >
                <div>
                  {/* Module Header */}
                  <div className="flex items-center justify-between border-b border-[var(--pw-hairline)] pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`size-5 ${config.color}`} />
                      <h3 className="font-semibold text-sm text-[var(--pw-ink)]">
                        {config.label}
                      </h3>
                      <span className="text-xs text-[var(--pw-ink)]/50">
                        ({selectedInModule}/{moduleIds.length})
                      </span>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleModule(perms)}
                      className="h-7 text-xs text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)]"
                    >
                      {isAllSelected ? (
                        <>
                          <CheckSquare className="size-3.5 text-emerald-400" />
                          ยกเลิกทั้งหมด
                        </>
                      ) : (
                        <>
                          <Square className="size-3.5" />
                          เลือกทั้งหมด
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
                          className={`flex items-start gap-3 p-2.5 rounded-[var(--pw-rounded-sm)] border cursor-pointer transition ${
                            checked
                              ? "bg-[var(--pw-surface-indigo)] border-[var(--pw-primary)]/50"
                              : "bg-[var(--pw-canvas)] border-[var(--pw-hairline)] opacity-80 hover:opacity-100"
                          }`}
                        >
                          <Checkbox
                            checked={checked}
                            className="pointer-events-none mt-0.5 shrink-0"
                            aria-hidden="true"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[var(--pw-ink)]">
                                {perm.permissionName}
                              </span>
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                                {perm.permissionCode}
                              </span>
                            </div>
                            {perm.description && (
                              <p className="text-xs text-[var(--pw-ink)]/60 mt-0.5">
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
    </div>
  );
}
