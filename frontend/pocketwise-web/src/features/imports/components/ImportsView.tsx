"use client";

import { useState } from "react";
import { CreditCard, FileUp, History, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { SlipImportTab } from "./SlipImportTab";
import { StatementImportTab } from "./StatementImportTab";
import { ImportJobsTab } from "./ImportJobsTab";

type ImportTab = "slip" | "statement" | "jobs";

export function ImportsView() {
  const [activeTab, setActiveTab] = useState<ImportTab>("slip");

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl text-[var(--pw-ink)]">
          <FileUp className="size-6 text-[var(--pw-primary)]" />
          นำเข้าข้อมูล (Imports)
        </h1>
        <p className="mt-1 text-xs text-[var(--pw-ink)]/65 sm:text-sm">
          อัปโหลดสลิปโอนเงิน สแกน AI และนำเข้าใบแจ้งยอดบัตรเครดิต
        </p>
      </div>

      {/* Responsive Segmented Tabs Bar */}
      <div className="flex rounded-xl bg-[var(--pw-surface-indigo)]/30 p-1 border border-[var(--pw-hairline)] w-full overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("slip")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer",
            activeTab === "slip"
              ? "bg-[var(--pw-primary)] text-white shadow-sm"
              : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] hover:bg-white/[0.04]",
          )}
        >
          <Receipt className="size-4 shrink-0" />
          <span>สลิปโอนเงิน</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("statement")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer",
            activeTab === "statement"
              ? "bg-[var(--pw-primary)] text-white shadow-sm"
              : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] hover:bg-white/[0.04]",
          )}
        >
          <CreditCard className="size-4 shrink-0" />
          <span>ใบแจ้งยอดบัตร</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("jobs")}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium transition-all whitespace-nowrap cursor-pointer",
            activeTab === "jobs"
              ? "bg-[var(--pw-primary)] text-white shadow-sm"
              : "text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] hover:bg-white/[0.04]",
          )}
        >
          <History className="size-4 shrink-0" />
          <span>ประวัติการนำเข้า</span>
        </button>
      </div>

      {/* Tab Panels */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {activeTab === "slip" && <SlipImportTab />}
          {activeTab === "statement" && <StatementImportTab />}
          {activeTab === "jobs" && <ImportJobsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
