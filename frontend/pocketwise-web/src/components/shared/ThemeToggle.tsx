"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useUserSettings, useUpdateUserSettings } from "@/features/settings/hooks/useSettings";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { data: settings } = useUserSettings();
  const updateSettings = useUpdateUserSettings();
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const active = (document.documentElement.dataset.theme as "dark" | "light") ||
        (localStorage.getItem("pocketwise-theme") as "dark" | "light") ||
        settings?.theme ||
        "dark";
      setCurrentTheme(active);
    }
  }, [settings?.theme]);

  const toggleTheme = () => {
    const nextTheme: "dark" | "light" = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    try {
      localStorage.setItem("pocketwise-theme", nextTheme);
    } catch {}

    if (settings) {
      updateSettings.mutate({
        ...settings,
        theme: nextTheme,
      });
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "relative flex size-9 items-center justify-center rounded-xl border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/80 text-[var(--pw-ink)] backdrop-blur-md transition-all hover:bg-[var(--pw-surface-onyx)] hover:scale-105 active:scale-95 cursor-pointer shadow-xs",
        className
      )}
      aria-label={currentTheme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
      title={currentTheme === "dark" ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด"}
    >
      {currentTheme === "dark" ? (
        <Sun className="size-4.5 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="size-4.5 text-sky-500 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
