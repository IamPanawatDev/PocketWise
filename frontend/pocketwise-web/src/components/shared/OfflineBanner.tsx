"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CloudUpload, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getOfflineQueue, syncOfflineQueue } from "@/lib/offline-queue";

export function OfflineBanner() {
  const queryClient = useQueryClient();
  const [isOffline, setIsOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    // Check initial state
    if (typeof window !== "undefined") {
      setIsOffline(!window.navigator.onLine);
      setQueueCount(getOfflineQueue().length);
    }

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
      setQueueCount(getOfflineQueue().length);
    };

    const handleOnline = async () => {
      setIsOffline(false);
      setShowReconnected(true);

      // Auto-sync pending offline transactions
      const res = await syncOfflineQueue();
      if (res.succeeded > 0) {
        toast.success(`เชื่อมต่อเน็ตแล้ว: ซิงค์รายการออฟไลน์สำเร็จ ${res.succeeded} รายการ`);
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["reports"] });
        queryClient.invalidateQueries({ queryKey: ["budgets"] });
      }

      setQueueCount(getOfflineQueue().length);

      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3500);
      return () => clearTimeout(timer);
    };

    const handleQueueChanged = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      setQueueCount(customEvent.detail?.count ?? getOfflineQueue().length);
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener("pocketwise:offline-queue-changed", handleQueueChanged);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("pocketwise:offline-queue-changed", handleQueueChanged);
    };
  }, [queryClient]);

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
            {queueCount > 0
              ? `คุณกำลังใช้งานในโหมดออฟไลน์ — มี ${queueCount} รายการบันทึกไว้และรอนำเข้าสู่เซิร์ฟเวอร์อัตโนมัติเมื่อต่อเน็ต`
              : "คุณกำลังใช้งานในโหมดออฟไลน์ — สามารถบันทึกรายการได้ตามปกติ ระบบจะซิงค์ให้อัตโนมัติเมื่อเชื่อมต่ออินเทอร์เน็ต"}
          </span>
          {queueCount > 0 && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
              <CloudUpload className="size-3" />
              {queueCount}
            </span>
          )}
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
