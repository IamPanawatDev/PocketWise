"use client";

import { useEffect, useState } from "react";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    // Check initial state
    if (typeof window !== "undefined") {
      setIsOffline(!window.navigator.onLine);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "sticky top-0 z-[100] flex w-full items-center justify-center gap-2 px-4 py-2 text-xs font-semibold shadow-md transition-all duration-300",
        isOffline
          ? "bg-amber-600/95 text-amber-50 backdrop-blur-md border-b border-amber-500/50"
          : "bg-emerald-600/95 text-emerald-50 backdrop-blur-md border-b border-emerald-500/50"
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="size-4 shrink-0 animate-pulse text-amber-200" />
          <span>
            คุณกำลังใช้งานในโหมดออฟไลน์ หรือสัญญาณอินเทอร์เน็ตขาดหาย — โปรดตรวจสอบการเชื่อมต่อ
          </span>
        </>
      ) : (
        <>
          <Wifi className="size-4 shrink-0 text-emerald-200" />
          <span>เชื่อมต่ออินเทอร์เน็ตเรียบร้อยแล้ว ข้อมูลจะซิงค์กับเซิร์ฟเวอร์ตามปกติ</span>
        </>
      )}
    </div>
  );
}
