export * from "./date-utils";
const THAILAND_TIME_ZONE = "Asia/Bangkok";
const THAILAND_OFFSET = "+07:00";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function getReadableTextColor(backgroundColor: string | null): string {
  const match = backgroundColor?.match(/^#?([0-9a-f]{6})$/i);
  if (!match) return "#ffffff";

  const channels = [0, 2, 4].map((offset) => {
    const value = Number.parseInt(match[1].slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  const contrast = (foreground: number) =>
    (Math.max(luminance, foreground) + 0.05) / (Math.min(luminance, foreground) + 0.05);

  return contrast(1) >= contrast(0) ? "#ffffff" : "#000000";
}

export function formatCurrency(amount: number, currencyCode = "THB"): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: THAILAND_TIME_ZONE,
    calendar: "gregory",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("th-TH", {
    timeZone: THAILAND_TIME_ZONE,
    calendar: "gregory",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function toThailandDateInputValue(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: THAILAND_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function toThailandDateTimeInputValue(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
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

export function isGregorianDateInput(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const currentYear = new Date().getFullYear();
  const equivalentGregorianYear = year - 543;
  // Reject a modern Thai Buddhist year that would otherwise look like a valid far-future Gregorian year.
  if (
    year > currentYear &&
    equivalentGregorianYear >= 1900 &&
    equivalentGregorianYear <= currentYear
  ) {
    return false;
  }

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

export function isThailandDateTimeInput(value: string): boolean {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match || !isGregorianDateInput(match[1])) return false;

  const hour = Number(match[2]);
  const minute = Number(match[3]);
  return hour <= 23 && minute <= 59;
}

export function thailandDateTimeInputToUtcIso(value: string): string {
  if (!isThailandDateTimeInput(value)) {
    throw new RangeError("วันที่และเวลาไทยไม่ถูกต้อง");
  }

  const date = new Date(`${value}:00${THAILAND_OFFSET}`);
  if (
    Number.isNaN(date.getTime()) ||
    toThailandDateTimeInputValue(date) !== value
  ) {
    throw new RangeError("วันที่และเวลาไทยไม่ถูกต้อง");
  }

  return date.toISOString();
}

export function thailandDateBoundaryToUtcIso(value: string, endOfDay = false): string {
  if (!isGregorianDateInput(value)) {
    throw new RangeError("วันที่ไทยไม่ถูกต้อง");
  }

  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  const date = new Date(`${value}T${time}${THAILAND_OFFSET}`);
  if (
    Number.isNaN(date.getTime()) ||
    toThailandDateInputValue(date) !== value
  ) {
    throw new RangeError("วันที่ไทยไม่ถูกต้อง");
  }

  return date.toISOString();
}

export function getCurrentThailandMonthFilter(now: Date): {
  fromDate: string;
  toDate: string;
} {
  const today = toThailandDateInputValue(now);
  const [year, month] = today.split("-");
  const firstDayOfMonth = `${year}-${month}-01`;

  return {
    fromDate: thailandDateBoundaryToUtcIso(firstDayOfMonth),
    toDate: thailandDateBoundaryToUtcIso(today, true),
  };
}

export function formatPhoneNumber(val: string): string {
  const digits = val.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 2) return digits;
  if (digits.startsWith("02")) {
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5, 9)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}
