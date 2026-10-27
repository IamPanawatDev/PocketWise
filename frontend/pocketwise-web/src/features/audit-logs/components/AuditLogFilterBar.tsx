"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  thailandDateBoundaryToUtcIso,
  toThailandDateInputValue,
} from "@/lib/utils";
import type { AuditLogFilter } from "@/types/audit-log.types";
import { Filter, RotateCcw, Search, X } from "lucide-react";

interface AuditLogFilterBarProps {
  filter: AuditLogFilter;
  onFilterChange: (patch: Partial<AuditLogFilter>) => void;
  onReset: () => void;
  entityTypes: string[];
}

const ACTION_OPTIONS = [
  { value: "all", label: "ทุกเหตุการณ์ (ทั้งหมด)" },
  { value: "Create", label: "สร้าง (Create)" },
  { value: "Update", label: "แก้ไข (Update)" },
  { value: "Delete", label: "ลบ (Delete)" },
  { value: "Import", label: "นำเข้า (Import)" },
];

const ENTITY_TYPE_LABELS: Record<string, string> = {
  Transactions: "รายการธุรกรรม (Transactions)",
  TransferGroups: "การโอนเงิน (TransferGroups)",
  Categories: "หมวดหมู่ (Categories)",
  Tags: "แท็ก (Tags)",
  BankAccounts: "บัญชีธนาคาร (BankAccounts)",
  CreditCards: "บัตรเครดิต (CreditCards)",
  Budgets: "งบประมาณ (Budgets)",
  RecurringTransactions: "รายการประจำ (RecurringTransactions)",
  CategoryRules: "กฎจัดหมวด (CategoryRules)",
  Merchants: "ร้านค้า (Merchants)",
  SlipImportFiles: "สลิปธนาคาร (SlipImportFiles)",
  CreditCardStatements: "ใบแจ้งยอดบัตร (CreditCardStatements)",
  UserSettings: "ตั้งค่าระบบ (UserSettings)",
  UserData: "ข้อมูลผู้ใช้ (UserData)",
  Users: "โปรไฟล์ผู้ใช้ (Users)",
  Roles: "บทบาทผู้ใช้ (Roles)",
  UserRoles: "การกำหนดบทบาท (UserRoles)",
  RolePermissions: "สิทธิ์บทบาท (RolePermissions)",
};

export function AuditLogFilterBar({
  filter,
  onFilterChange,
  onReset,
  entityTypes,
}: AuditLogFilterBarProps) {
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const fromDateValue = filter.fromDate ? toThailandDateInputValue(filter.fromDate) : "";
  const toDateValue = filter.toDate ? toThailandDateInputValue(filter.toDate) : "";

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filter.action) count++;
    if (filter.entityType) count++;
    if (filter.fromDate || filter.toDate) count++;
    return count;
  }, [filter.action, filter.entityType, filter.fromDate, filter.toDate]);

  return (
    <div className="mb-4 space-y-3">
      {/* Search & Filter Trigger Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--pw-ink)]/40" />
          <Input
            id="audit-search"
            placeholder="ค้นหาข้อมูล, รหัส, รายละเอียด..."
            value={filter.q ?? ""}
            onChange={(e) => onFilterChange({ q: e.target.value })}
            className="pl-9 h-10 bg-[var(--pw-surface-indigo)] border-[var(--pw-hairline)]"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={activeFilterCount > 0 ? "secondary" : "outline"}
            onClick={() => setShowFilterSheet(true)}
            className="relative gap-2 h-10 border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] hover:bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)] shadow-xs"
          >
            <Filter className="size-4 text-[var(--pw-primary)]" />
            <span>ตัวกรอง</span>
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-[var(--pw-primary)] text-[10px] font-bold text-[var(--pw-primary-foreground)]">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {activeFilterCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onReset}
              title="ล้างตัวกรอง"
              aria-label="ล้างตัวกรอง"
              className="h-10 w-10 shrink-0 text-[var(--pw-ink)]/60 hover:text-[var(--pw-ink)]"
            >
              <RotateCcw className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {filter.action && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--pw-primary)]/30 bg-[var(--pw-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--pw-primary)]">
              เหตุการณ์: {ACTION_OPTIONS.find((o) => o.value === filter.action)?.label ?? filter.action}
              <button
                type="button"
                onClick={() => onFilterChange({ action: undefined })}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--pw-primary)]/20"
                aria-label="ลบตัวกรองเหตุการณ์"
              >
                <X className="size-3" />
              </button>
            </span>
          )}

          {filter.entityType && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--pw-primary)]/30 bg-[var(--pw-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--pw-primary)]">
              หมวดข้อมูล: {ENTITY_TYPE_LABELS[filter.entityType] ?? filter.entityType}
              <button
                type="button"
                onClick={() => onFilterChange({ entityType: undefined })}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--pw-primary)]/20"
                aria-label="ลบตัวกรองหมวดข้อมูล"
              >
                <X className="size-3" />
              </button>
            </span>
          )}

          {(filter.fromDate || filter.toDate) && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--pw-primary)]/30 bg-[var(--pw-primary)]/10 px-2.5 py-1 text-xs font-medium text-[var(--pw-primary)]">
              ช่วงวันที่: {fromDateValue || "ไม่ระบุ"} ถึง {toDateValue || "ไม่ระบุ"}
              <button
                type="button"
                onClick={() => onFilterChange({ fromDate: undefined, toDate: undefined })}
                className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--pw-primary)]/20"
                aria-label="ลบตัวกรองช่วงวันที่"
              >
                <X className="size-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onReset}
            className="text-xs text-[var(--pw-primary)] underline hover:text-[var(--pw-primary)]/80 ml-1"
          >
            ล้างตัวกรอง
          </button>
        </div>
      )}

      {/* Filter BottomSheet */}
      <BottomSheet
        open={showFilterSheet}
        onOpenChange={setShowFilterSheet}
        title="ตัวกรองประวัติการใช้งาน"
        description="กรองบันทึกประวัติตามเหตุการณ์ หมวดข้อมูล และช่วงวันที่บันทึก"
      >
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="เหตุการณ์ (Action)" className="w-full min-w-0">
              <Select
                value={filter.action ?? "all"}
                onValueChange={(val) => onFilterChange({ action: val === "all" ? undefined : val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="เลือกเหตุการณ์" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="หมวดข้อมูล (Entity Type)" className="w-full min-w-0">
              <Select
                value={filter.entityType ?? "all"}
                onValueChange={(val) => onFilterChange({ entityType: val === "all" ? undefined : val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="เลือกหมวดข้อมูล" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกหมวดข้อมูล (ทั้งหมด)</SelectItem>
                  {entityTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ENTITY_TYPE_LABELS[type] ?? type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField label="ตั้งแต่วันที่ (ค.ศ.)" htmlFor="audit-from-date" className="w-full min-w-0">
              <DateInput
                id="audit-from-date"
                value={fromDateValue}
                onChange={(val) => {
                  const utc = val ? thailandDateBoundaryToUtcIso(val) : undefined;
                  onFilterChange({ fromDate: utc });
                }}
              />
            </FormField>

            <FormField label="ถึงวันที่ (ค.ศ.)" htmlFor="audit-to-date" className="w-full min-w-0">
              <DateInput
                id="audit-to-date"
                value={toDateValue}
                onChange={(val) => {
                  const utc = val ? thailandDateBoundaryToUtcIso(val, true) : undefined;
                  onFilterChange({ toDate: utc });
                }}
              />
            </FormField>
          </div>

          <div className="flex flex-col-reverse gap-2 pt-4 border-t border-[var(--pw-hairline)] sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onReset}
              disabled={activeFilterCount === 0}
            >
              ล้างตัวกรอง
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => setShowFilterSheet(false)}
            >
              ดูผลลัพธ์
            </Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
