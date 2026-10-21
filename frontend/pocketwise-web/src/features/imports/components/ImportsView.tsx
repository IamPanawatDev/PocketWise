"use client";

import { useState } from "react";
import { CreditCard, FileUp, History, Receipt } from "lucide-react";
import { SlipImportTab } from "./SlipImportTab";
import { StatementImportTab } from "./StatementImportTab";
import { ImportJobsTab } from "./ImportJobsTab";

type ImportTab = "slip" | "statement" | "jobs";

export function ImportsView() {
  const [activeTab, setActiveTab] = useState<ImportTab>("slip");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--pw-text-primary)]">
          <FileUp className="size-6 text-[var(--pw-primary)]" />
          นำเข้าข้อมูล (Imports)
        </h1>
        <p className="mt-1 text-sm text-[var(--pw-text-secondary)]">
          นำเข้าสลิปการโอนเงินเพื่อบันทึกธุรกรรมทันที หรือนำเข้าใบแจ้งยอดบัตรเครดิต (CSV / JSON) พร้อมระบบตรวจจับรายการซ้ำและการจัดหมวดหมู่อัตโนมัติ
        </p>
      </div>

      {/* Tabs navigation */}
      <div className="flex border-b border-[var(--pw-hairline)] space-x-2">
        <button
          type="button"
          onClick={() => setActiveTab("slip")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "slip"
              ? "border-[var(--pw-accent-primary)] text-[var(--pw-accent-primary)]"
              : "border-transparent text-[var(--pw-text-muted)] hover:text-[var(--pw-text-primary)]"
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>สลิปโอนเงิน</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("statement")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "statement"
              ? "border-[var(--pw-accent-primary)] text-[var(--pw-accent-primary)]"
              : "border-transparent text-[var(--pw-text-muted)] hover:text-[var(--pw-text-primary)]"
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>ใบแจ้งยอดบัตรเครดิต</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("jobs")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "jobs"
              ? "border-[var(--pw-accent-primary)] text-[var(--pw-accent-primary)]"
              : "border-transparent text-[var(--pw-text-muted)] hover:text-[var(--pw-text-primary)]"
          }`}
        >
          <History className="h-4 w-4" />
          <span>ประวัติการนำเข้า</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === "slip" && <SlipImportTab />}
        {activeTab === "statement" && <StatementImportTab />}
        {activeTab === "jobs" && <ImportJobsTab />}
      </div>
    </div>
  );
}
