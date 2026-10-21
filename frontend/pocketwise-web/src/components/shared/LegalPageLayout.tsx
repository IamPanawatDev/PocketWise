"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Printer, ShieldCheck, FileText, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { cn } from "@/lib/utils";

interface LegalPageLayoutProps {
  title: string;
  subtitle: string;
  lastUpdated: string;
  activeTab: "privacy" | "terms";
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function LegalPageLayout({
  title,
  subtitle,
  lastUpdated,
  activeTab,
  icon,
  children,
}: LegalPageLayoutProps) {
  const pathname = usePathname();
  const { data: user, isSuccess } = useCurrentUser();
  const isLoggedIn = isSuccess && !!user;

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-[var(--pw-canvas)] text-[var(--pw-ink)]">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--pw-hairline)] bg-[var(--pw-canvas)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-85"
          >
            <Image
              src="/app-icon.png"
              alt="PocketWise"
              width={34}
              height={34}
              priority
              className="size-8.5 rounded-lg drop-shadow"
            />
            <div className="flex flex-col">
              <span className="text-base font-bold leading-tight tracking-tight text-[var(--pw-on-primary)]">
                PocketWise
              </span>
              <span className="text-[10px] text-[var(--pw-ink)]/55">
                Legal & Compliance
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden items-center gap-1.5 sm:flex">
            <Link
              href="/privacy-policy"
              className={cn(
                "flex items-center gap-1.5 rounded-[var(--pw-rounded-sm)] px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === "privacy"
                  ? "border border-[var(--pw-primary)]/50 bg-[var(--pw-surface-indigo)] font-semibold text-[var(--pw-on-primary)] shadow-xs"
                  : "text-[var(--pw-ink)]/70 hover:bg-[var(--pw-surface-indigo)]/50 hover:text-[var(--pw-ink)]"
              )}
            >
              <ShieldCheck className="size-3.5 text-[var(--pw-link)]" />
              <span>นโยบายความเป็นส่วนตัว</span>
            </Link>

            <Link
              href="/terms"
              className={cn(
                "flex items-center gap-1.5 rounded-[var(--pw-rounded-sm)] px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === "terms"
                  ? "border border-[var(--pw-primary)]/50 bg-[var(--pw-surface-indigo)] font-semibold text-[var(--pw-on-primary)] shadow-xs"
                  : "text-[var(--pw-ink)]/70 hover:bg-[var(--pw-surface-indigo)]/50 hover:text-[var(--pw-ink)]"
              )}
            >
              <FileText className="size-3.5 text-[var(--pw-primary)]" />
              <span>ข้อกำหนดการใช้งาน</span>
            </Link>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="hidden h-8 gap-1.5 border-[var(--pw-input-border)]/60 bg-[var(--pw-surface-indigo)] px-2.5 text-xs text-[var(--pw-ink)] md:flex"
              title="พิมพ์เอกสารนี้"
            >
              <Printer className="size-3.5" />
              <span>พิมพ์</span>
            </Button>
            <Link href={isLoggedIn ? "/" : "/login"}>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-[var(--pw-input-border)]/60 bg-[var(--pw-surface-indigo)] px-3 text-xs text-[var(--pw-ink)] shadow-xs"
              >
                {isLoggedIn ? (
                  <>
                    <ArrowLeft className="size-3.5" />
                    <span>กลับสู่ระบบ</span>
                  </>
                ) : (
                  <>
                    <LogIn className="size-3.5" />
                    <span>เข้าสู่ระบบ</span>
                  </>
                )}
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex border-t border-[var(--pw-hairline)] px-2 py-1.5 sm:hidden">
          <Link
            href="/privacy-policy"
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-[var(--pw-rounded-xs)] py-1.5 text-center text-xs font-medium",
              activeTab === "privacy"
                ? "bg-[var(--pw-surface-indigo)] font-semibold text-[var(--pw-on-primary)] shadow-xs"
                : "text-[var(--pw-ink)]/65"
            )}
          >
            <ShieldCheck className="size-3.5 text-[var(--pw-link)]" />
            <span>นโยบายความเป็นส่วนตัว</span>
          </Link>
          <Link
            href="/terms"
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-[var(--pw-rounded-xs)] py-1.5 text-center text-xs font-medium",
              activeTab === "terms"
                ? "bg-[var(--pw-surface-indigo)] font-semibold text-[var(--pw-on-primary)] shadow-xs"
                : "text-[var(--pw-ink)]/65"
            )}
          >
            <FileText className="size-3.5 text-[var(--pw-primary)]" />
            <span>ข้อกำหนดการใช้งาน</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Document Header Hero */}
        <header className="mb-8 border-b border-[var(--pw-hairline)] pb-6">
          <div className="flex items-start gap-4">
            <div className="hidden size-12 shrink-0 items-center justify-center rounded-[var(--pw-rounded-md)] border border-[var(--pw-primary)]/40 bg-[var(--pw-surface-indigo)] sm:flex">
              {icon || <FileText className="size-6 text-[var(--pw-primary)]" />}
            </div>
            <div className="flex-1">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--pw-primary)]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--pw-primary)]">
                  PDPA & Legal Compliance
                </span>
                <span className="text-xs text-[var(--pw-ink)]/60">
                  {lastUpdated}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--pw-on-primary)] sm:text-3xl">
                {title}
              </h1>
              <p className="mt-1 text-sm text-[var(--pw-ink)]/70 sm:text-base">
                {subtitle}
              </p>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="space-y-8 text-sm leading-relaxed sm:text-base">
          {children}
        </div>

        {/* Bottom Contact & Quick Navigation Box */}
        <div className="mt-12 rounded-[var(--pw-rounded-lg)] border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)] p-5 text-center sm:p-6">
          <h3 className="text-base font-semibold text-[var(--pw-on-primary)]">
            มีข้อสงสัยเกี่ยวกับข้อมูลส่วนบุคคลหรือข้อกำหนด?
          </h3>
          <p className="mt-1 text-xs text-[var(--pw-ink)]/70 sm:text-sm">
            คุณสามารถติดต่อทีมงานหรือเจ้าหน้าที่คุ้มครองข้อมูลได้ที่{" "}
            <a
              href="mailto:famreplay@gmail.com"
              className="text-[var(--pw-link)] underline hover:opacity-80"
            >
              famreplay@gmail.com
            </a>
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs">
            <Link
              href={isLoggedIn ? "/" : "/login"}
              className="rounded-[var(--pw-rounded-xs)] border border-[var(--pw-input-border)]/50 bg-[var(--pw-canvas)] px-3 py-1.5 transition-colors hover:border-[var(--pw-primary)]"
            >
              {isLoggedIn ? "กลับสู่หน้าหลัก" : "เข้าสู่ระบบ"}
            </Link>
            <Link
              href={activeTab === "privacy" ? "/terms" : "/privacy-policy"}
              className="rounded-[var(--pw-rounded-xs)] border border-[var(--pw-input-border)]/50 bg-[var(--pw-canvas)] px-3 py-1.5 transition-colors hover:border-[var(--pw-primary)]"
            >
              {activeTab === "privacy"
                ? "อ่านข้อกำหนดการใช้งาน →"
                : "อ่านนโยบายความเป็นส่วนตัว →"}
            </Link>
          </div>
        </div>
      </main>

      {/* Global Public Footer */}
      <footer className="border-t border-[var(--pw-hairline)] py-6 text-center text-xs text-[var(--pw-ink)]/55">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <span>© 2026 PocketWise. สงวนลิขสิทธิ์ทุกประการ</span>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy-policy"
              className={cn(
                "hover:underline",
                pathname === "/privacy-policy" && "text-[var(--pw-primary)] font-medium"
              )}
            >
              นโยบายความเป็นส่วนตัว
            </Link>
            <span>•</span>
            <Link
              href="/terms"
              className={cn(
                "hover:underline",
                pathname === "/terms" && "text-[var(--pw-primary)] font-medium"
              )}
            >
              ข้อกำหนดการใช้งาน
            </Link>
            <span>•</span>
            <Link
              href={isLoggedIn ? "/" : "/login"}
              className="hover:underline"
            >
              {isLoggedIn ? "หน้าแรกของระบบ" : "เข้าสู่ระบบ"}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
