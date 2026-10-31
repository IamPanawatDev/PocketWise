"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Megaphone, X, Bell } from "lucide-react";
import { useActiveAnnouncementsQuery } from "../hooks/useAdminOperations";

export function ActiveAnnouncementsBanner() {
  const { data: announcements = [] } = useActiveAnnouncementsQuery();
  const [dismissedIds, setDismissedIds] = useState<number[]>([]);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("pw_dismissed_announcements");
      if (stored) {
        setDismissedIds(JSON.parse(stored));
      }
    } catch {}
  }, []);

  const handleDismiss = (id: number) => {
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    try {
      sessionStorage.setItem("pw_dismissed_announcements", JSON.stringify(updated));
    } catch {}
  };

  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.announcementId)
  );

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      <AnimatePresence>
        {visibleAnnouncements.map((item) => (
          <motion.div
            key={item.announcementId}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.25 }}
            className="relative flex items-start gap-3 p-3.5 sm:p-4 rounded-xl border border-[var(--pw-primary)]/30 bg-[var(--pw-primary)]/10 text-[var(--pw-ink)] shadow-sm backdrop-blur-sm"
          >
            <div className="p-2 rounded-lg bg-[var(--pw-primary)]/20 text-[var(--pw-primary)] shrink-0 mt-0.5">
              <Megaphone className="size-4 sm:size-5 animate-pulse" />
            </div>
            <div className="flex-1 pr-6 text-sm">
              <h4 className="font-semibold text-[var(--pw-ink)] text-sm sm:text-base flex items-center gap-1.5">
                {item.title}
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--pw-primary)]/20 text-[var(--pw-primary)] uppercase tracking-wider">
                  ประกาศ
                </span>
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-[var(--pw-ink)]/80 whitespace-pre-line leading-relaxed">
                {item.message}
              </p>
            </div>
            <button
              onClick={() => handleDismiss(item.announcementId)}
              aria-label="ปิดประกาศ"
              className="absolute top-2.5 right-2.5 p-1 rounded-md text-[var(--pw-ink)]/50 hover:text-[var(--pw-ink)] hover:bg-[var(--pw-surface)]/40 transition-colors"
            >
              <X className="size-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
