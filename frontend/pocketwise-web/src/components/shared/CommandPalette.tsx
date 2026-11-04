"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useUserSettings, useUpdateUserSettings } from "@/features/settings/hooks/useSettings";
import { cn } from "@/lib/utils";
import {
  CreditCard,
  FileUp,
  FolderTree,
  Landmark,
  Moon,
  PieChart,
  Plus,
  ReceiptText,
  Repeat,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Tags,
  Users,
  Wallet,
  X,
  ArrowRightLeft,
} from "lucide-react";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "actions" | "navigation" | "theme" | "admin";
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string[];
  action: () => void;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: user } = useCurrentUser();
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();

  const isAdmin = (user?.roles?.includes("Admin") || user?.roles?.includes("SuperAdmin")) ?? false;

  // Listen for open events and shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pocketwise:open-command-palette", handleCustomOpen);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pocketwise:open-command-palette", handleCustomOpen);
    };
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const toggleTheme = (theme: "light" | "dark") => {
    if (settings) {
      updateSettings.mutate({ ...settings, theme });
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem("pocketwise-theme", theme);
      } catch {}
    }
    setIsOpen(false);
  };

  const commands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      // Actions
      {
        id: "act-new-transaction",
        title: "จดรายการใหม่",
        subtitle: "บันทึกรายรับหรือรายจ่ายด่วน",
        category: "actions",
        icon: Plus,
        keywords: ["add", "new", "create", "transaction", "จด", "บันทึก"],
        action: () => {
          setIsOpen(false);
          window.dispatchEvent(new CustomEvent("pocketwise:open-transaction-form"));
        },
      },
      {
        id: "act-scan-slip",
        title: "สแกนสลิปโอนเงิน",
        subtitle: "นำเข้าสลิปผ่าน AI OCR อัตโนมัติ",
        category: "actions",
        icon: FileUp,
        keywords: ["slip", "ocr", "import", "scan", "สลิป", "สแกน"],
        action: () => {
          setIsOpen(false);
          router.push("/imports");
        },
      },

      // Navigation
      {
        id: "nav-transactions",
        title: "รายการธุรกรรม",
        subtitle: "ดูประวัติรายรับ รายจ่าย ทั้งหมด",
        category: "navigation",
        icon: ReceiptText,
        keywords: ["transactions", "history", "รายการ", "ประวัติ"],
        action: () => {
          setIsOpen(false);
          router.push("/transactions");
        },
      },
      {
        id: "nav-reports",
        title: "รายงานและสถิติ",
        subtitle: "วิเคราะห์ภาพรวมกระแสเงินสดและหมวดหมู่",
        category: "navigation",
        icon: PieChart,
        keywords: ["reports", "stats", "charts", "รายงาน", "กราฟ"],
        action: () => {
          setIsOpen(false);
          router.push("/reports");
        },
      },
      {
        id: "nav-budgets",
        title: "งบประมาณ",
        subtitle: "ติดตามการใช้จ่ายและขีดจำกัดงบ",
        category: "navigation",
        icon: Wallet,
        keywords: ["budgets", "limit", "งบประมาณ", "งบ"],
        action: () => {
          setIsOpen(false);
          router.push("/budgets");
        },
      },
      {
        id: "nav-bank-accounts",
        title: "บัญชีธนาคาร",
        subtitle: "กระเป๋าเงินและยอดเงินคงเหลือ",
        category: "navigation",
        icon: Landmark,
        keywords: ["bank", "accounts", "wallet", "ธนาคาร", "บัญชี"],
        action: () => {
          setIsOpen(false);
          router.push("/bank-accounts");
        },
      },
      {
        id: "nav-credit-cards",
        title: "บัตรเครดิต",
        subtitle: "วงเงินและวันตัดรอบบิล",
        category: "navigation",
        icon: CreditCard,
        keywords: ["credit", "cards", "บัตร", "บัตรเครดิต"],
        action: () => {
          setIsOpen(false);
          router.push("/credit-cards");
        },
      },
      {
        id: "nav-recurring",
        title: "รายการประจำ & บิล",
        subtitle: "ภาระค่าใช้จ่ายรายเดือนและวันครบกำหนด",
        category: "navigation",
        icon: Repeat,
        keywords: ["recurring", "bills", "ประจำ", "บิล"],
        action: () => {
          setIsOpen(false);
          router.push("/recurring-transactions");
        },
      },
      {
        id: "nav-categories",
        title: "หมวดหมู่",
        subtitle: "จัดการหมวดหมู่รายรับและรายจ่าย",
        category: "navigation",
        icon: FolderTree,
        keywords: ["categories", "หมวดหมู่", "ประเภท"],
        action: () => {
          setIsOpen(false);
          router.push("/categories");
        },
      },
      {
        id: "nav-tags",
        title: "แท็ก (Tags)",
        subtitle: "จัดการป้ายกำกับสำหรับจัดกลุ่มรายการ",
        category: "navigation",
        icon: Tags,
        keywords: ["tags", "แท็ก", "ป้ายกำกับ"],
        action: () => {
          setIsOpen(false);
          router.push("/tags");
        },
      },
      {
        id: "nav-transfers",
        title: "โอนเงินระหว่างบัญชี",
        subtitle: "ย้ายเงินระหว่างบัญชีธนาคารหรือบัตร",
        category: "navigation",
        icon: ArrowRightLeft,
        keywords: ["transfers", "move", "โอนเงิน", "ย้าย"],
        action: () => {
          setIsOpen(false);
          router.push("/transfers");
        },
      },
      {
        id: "nav-settings",
        title: "ตั้งค่าและโปรไฟล์",
        subtitle: "แก้ไขโปรไฟล์ ธีม และความปลอดภัย",
        category: "navigation",
        icon: Settings,
        keywords: ["settings", "profile", "ตั้งค่า", "โปรไฟล์"],
        action: () => {
          setIsOpen(false);
          router.push("/settings");
        },
      },

      // Theme
      {
        id: "theme-dark",
        title: "เปลี่ยนเป็นโหมดมืด (Dark Mode)",
        subtitle: "ใช้ธีมมืดสบายตา",
        category: "theme",
        icon: Moon,
        keywords: ["dark", "theme", "มืด", "โหมดมืด"],
        action: () => toggleTheme("dark"),
      },
      {
        id: "theme-light",
        title: "เปลี่ยนเป็นโหมดสว่าง (Light Mode)",
        subtitle: "ใช้ธีมสว่างคมชัด",
        category: "theme",
        icon: Sun,
        keywords: ["light", "theme", "สว่าง", "โหมดสว่าง"],
        action: () => toggleTheme("light"),
      },
    ];

    if (isAdmin) {
      list.push(
        {
          id: "admin-users",
          title: "จัดการผู้ใช้งาน (Admin)",
          subtitle: "ดูรายชื่อ สิทธิ์ และการระงับบัญชี",
          category: "admin",
          icon: Users,
          keywords: ["admin", "users", "ผู้ใช้"],
          action: () => {
            setIsOpen(false);
            router.push("/admin/users");
          },
        },
        {
          id: "admin-security",
          title: "เหตุการณ์ความปลอดภัย (Admin)",
          subtitle: "ตรวจสอบ Audit Log และการเข้าสู่ระบบ",
          category: "admin",
          icon: ShieldAlert,
          keywords: ["admin", "security", "audit", "ความปลอดภัย"],
          action: () => {
            setIsOpen(false);
            router.push("/admin/security-events");
          },
        },
        {
          id: "admin-overview",
          title: "ภาพรวมระบบ (Admin Overview)",
          subtitle: "สถานะระบบและสถิติรวม",
          category: "admin",
          icon: ShieldCheck,
          keywords: ["admin", "overview", "ภาพรวม"],
          action: () => {
            setIsOpen(false);
            router.push("/admin/overview");
          },
        }
      );
    }

    return list;
  }, [isAdmin, router, settings, updateSettings]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();
    return commands.filter((c) => {
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchSubtitle = c.subtitle?.toLowerCase().includes(q);
      const matchKeywords = c.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchSubtitle || matchKeywords;
    });
  }, [commands, query]);

  // Handle keyboard navigation inside the palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = filteredCommands[selectedIndex];
      if (current) current.action();
    }
  };

  const getCategoryLabel = (category: CommandItem["category"]) => {
    switch (category) {
      case "actions":
        return "การดำเนินการด่วน (Quick Actions)";
      case "navigation":
        return "ไปยังหน้าต่างๆ (Navigation)";
      case "theme":
        return "ธีมและการแสดงผล (Theme)";
      case "admin":
        return "ผู้ดูแลระบบ (Admin)";
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-24 px-3">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />

          {/* Palette Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-raised)]/95 shadow-2xl backdrop-blur-xl"
            onKeyDown={handleKeyDown}
          >
            {/* Search Input Box */}
            <div className="relative flex items-center border-b border-[var(--pw-hairline)] px-4 py-3">
              <Search className="size-5 shrink-0 text-[var(--pw-ink)]/50" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="ค้นหาหน้า หรือพิมพ์คำสั่ง... (เช่น รายการ, งบ, สลิป)"
                className="ml-3 flex-1 bg-transparent text-sm text-[var(--pw-ink)] placeholder-[var(--pw-ink)]/40 outline-none"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                <kbd className="hidden sm:inline-block rounded border border-[var(--pw-hairline)] bg-[var(--pw-canvas)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--pw-ink)]/50">
                  ESC
                </kbd>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1 text-[var(--pw-ink)]/50 hover:bg-[var(--pw-surface-indigo)] hover:text-[var(--pw-ink)] transition"
                  aria-label="ปิดกล่องค้นหา"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Results List */}
            <div className="max-h-[60vh] overflow-y-auto overscroll-contain p-2 space-y-1">
              {filteredCommands.length === 0 ? (
                <div className="py-8 text-center text-xs text-[var(--pw-ink)]/50">
                  ไม่พบผลลัพธ์สำหรับ &quot;{query}&quot;
                </div>
              ) : (
                filteredCommands.map((item, index) => {
                  const Icon = item.icon;
                  const isSelected = index === selectedIndex;
                  const isFirstInCategory =
                    index === 0 || filteredCommands[index - 1].category !== item.category;

                  return (
                    <div key={item.id}>
                      {isFirstInCategory && (
                        <p className="px-2.5 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--pw-ink)]/45">
                          {getCategoryLabel(item.category)}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={item.action}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-100 cursor-pointer",
                          isSelected
                            ? "bg-[var(--pw-primary)] text-white shadow-xs"
                            : "text-[var(--pw-ink)]/85 hover:bg-[var(--pw-surface-indigo)]/70"
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-lg border",
                            isSelected
                              ? "bg-white/20 border-white/30 text-white"
                              : "border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/80 text-[var(--pw-primary)]"
                          )}
                        >
                          <Icon className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-xs sm:text-sm truncate">{item.title}</p>
                          {item.subtitle && (
                            <p
                              className={cn(
                                "text-[11px] truncate",
                                isSelected ? "text-white/80" : "text-[var(--pw-ink)]/55"
                              )}
                            >
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        <kbd
                          className={cn(
                            "hidden sm:inline-block rounded px-1.5 py-0.5 text-[10px] font-mono",
                            isSelected
                              ? "bg-white/20 text-white"
                              : "border border-[var(--pw-hairline)] text-[var(--pw-ink)]/40"
                          )}
                        >
                          ↵
                        </kbd>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer with Keyboard Hints */}
            <div className="flex items-center justify-between border-t border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/40 px-4 py-2 text-[11px] text-[var(--pw-ink)]/50">
              <div className="hidden sm:flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] px-1 py-0.5 text-[10px] font-mono">
                    ↑
                  </kbd>
                  <kbd className="rounded border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] px-1 py-0.5 text-[10px] font-mono">
                    ↓
                  </kbd>
                  <span>เลือกคำสั่ง</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] px-1 py-0.5 text-[10px] font-mono">
                    Enter
                  </kbd>
                  <span>เปิด</span>
                </span>
              </div>
              <span className="text-right w-full sm:w-auto">PocketWise Command Palette</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
