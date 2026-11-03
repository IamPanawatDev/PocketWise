/**
 * PocketWise Central Date & Time Display Helper
 * 
 * Rules:
 * 1. ALWAYS display year in Gregorian calendar (ค.ศ. e.g. 2026), NEVER Buddhist era (พ.ศ. 2569).
 * 2. ALWAYS format time in Thailand TimeZone (Asia/Bangkok, UTC+7).
 * 3. Use this helper across ALL pages and components instead of raw toLocaleDateString/toLocaleString.
 */

export const THAILAND_TIME_ZONE = "Asia/Bangkok";

export type DateValue = string | number | Date | null | undefined;

function parseDate(value: DateValue): Date | null {
  if (!value) return null;
  const d = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Format date for display: "31 ต.ค. 2026"
 */
export function formatDisplayDate(value: DateValue, fallback = "-"): string {
  const date = parseDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat("th-TH", {
    timeZone: THAILAND_TIME_ZONE,
    calendar: "gregory",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

/**
 * Format date and time for display: "31 ต.ค. 2026 03:22 น."
 */
export function formatDisplayDateTime(value: DateValue, fallback = "-"): string {
  const date = parseDate(value);
  if (!date) return fallback;

  const formatted = new Intl.DateTimeFormat("th-TH", {
    timeZone: THAILAND_TIME_ZONE,
    calendar: "gregory",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);

  return `${formatted} น.`;
}

/**
 * Format time only: "03:22 น."
 */
export function formatDisplayTime(value: DateValue, fallback = "-"): string {
  const date = parseDate(value);
  if (!date) return fallback;

  const formatted = new Intl.DateTimeFormat("th-TH", {
    timeZone: THAILAND_TIME_ZONE,
    calendar: "gregory",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);

  return `${formatted} น.`;
}

/**
 * Format relative time (e.g. "5 นาทีที่แล้ว", "เมื่อวานนี้")
 */
export function formatRelativeTime(value: DateValue, fallback = "-"): string {
  const date = parseDate(value);
  if (!date) return fallback;

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return "เมื่อสักครู่";
  if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
  if (diffDays === 1) return "เมื่อวานนี้";
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`;

  return formatDisplayDate(date, fallback);
}

/**
 * Format ISO datetime for inputs (YYYY-MM-DDTHH:mm) in Bangkok time
 */
export function toThailandDateTimeInputValue(value: DateValue): string {
  const date = parseDate(value);
  if (!date) return "";

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: THAILAND_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export interface MonthOption {
  value: string; // "YYYY-MM"
  label: string; // "พฤศจิกายน 2026"
  from: string;  // "YYYY-MM-01"
  to: string;    // "YYYY-MM-30"
}

/**
 * Generate month options for Month Picker (Thai month name + Gregorian year)
 */
export function getRecentMonthOptions(pastCount = 24, futureCount = 1): MonthOption[] {
  const options: MonthOption[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const thaiMonthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  for (let i = futureCount; i >= -pastCount; i--) {
    const d = new Date(currentYear, currentMonth + i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const monthStr = String(m + 1).padStart(2, "0");
    const value = y + "-" + monthStr;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const isCurrent = i === 0;

    options.push({
      value: value,
      label: thaiMonthNames[m] + " " + y + (isCurrent ? " (เดือนนี้)" : ""),
      from: y + "-" + monthStr + "-01",
      to: y + "-" + monthStr + "-" + String(lastDay).padStart(2, "0"),
    });
  }

  return options;
}
