"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import {
  thailandDateBoundaryToUtcIso,
  toThailandDateInputValue,
} from "@/lib/utils";
import type { AuditLogFilter } from "@/types/audit-log.types";
import { RotateCcw, Search } from "lucide-react";

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
  const fromDateValue = filter.fromDate ? toThailandDateInputValue(filter.fromDate) : "";
  const toDateValue = filter.toDate ? toThailandDateInputValue(filter.toDate) : "";

  return (
    <Card className="mb-4 grid grid-cols-1 items-end gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-4 xl:grid-cols-5">
      <FormField
        label={<span className="inline-flex items-center gap-1.5"><Search className="size-4" />ค้นหาคำสำคัญ</span>}
        htmlFor="audit-search"
        className="w-full min-w-0"
      >
        <Input
          id="audit-search"
          placeholder="ค้นหาข้อมูล, รหัส, รายละเอียด..."
          value={filter.q ?? ""}
          onChange={(e) => onFilterChange({ q: e.target.value })}
        />
      </FormField>

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

      <div className="flex w-full items-end gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-1">
        <FormField label="ถึงวันที่ (ค.ศ.)" htmlFor="audit-to-date" className="w-full min-w-0 flex-1">
          <DateInput
            id="audit-to-date"
            value={toDateValue}
            onChange={(val) => {
              const utc = val ? thailandDateBoundaryToUtcIso(val, true) : undefined;
              onFilterChange({ toDate: utc });
            }}
          />
        </FormField>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onReset}
          title="ล้างตัวกรอง"
          aria-label="ล้างตัวกรอง"
          className="shrink-0"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>
    </Card>
  );
}
