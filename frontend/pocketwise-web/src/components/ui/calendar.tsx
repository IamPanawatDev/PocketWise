"use client";

import { DayPicker, type DayPickerProps } from "react-day-picker";
import { cn } from "@/lib/utils";

const calendarClassNames: NonNullable<DayPickerProps["classNames"]> = {
  root: "relative flex flex-col gap-3",
  months: "flex",
  month:
    "grid w-fit grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] gap-x-2 gap-y-3",
  month_caption: "col-start-2 row-start-1 flex h-9 items-center justify-center",
  caption_label: "text-sm font-semibold text-[var(--pw-ink)]",
  nav: "pointer-events-none absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between",
  button_previous:
    "pointer-events-auto col-start-1 row-start-1 inline-flex size-9 cursor-pointer items-center justify-center rounded-[var(--pw-rounded-xs)] border border-[var(--pw-hairline)] text-[var(--pw-ink)] hover:bg-[var(--pw-primary)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pw-primary)]",
  button_next:
    "pointer-events-auto col-start-3 row-start-1 inline-flex size-9 cursor-pointer items-center justify-center rounded-[var(--pw-rounded-xs)] border border-[var(--pw-hairline)] text-[var(--pw-ink)] hover:bg-[var(--pw-primary)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pw-primary)]",
  chevron: "size-4 fill-none stroke-current",
  month_grid: "col-span-3 row-start-2 w-full border-collapse",
  weekdays: "flex",
  weekday: "flex-1 py-2 text-center text-xs font-medium text-[var(--pw-ink)]/65",
  week: "mt-1 flex w-full",
  day: "flex flex-1 items-center justify-center p-0",
  day_button:
    "inline-flex size-9 cursor-pointer items-center justify-center rounded-[var(--pw-rounded-xs)] text-sm text-[var(--pw-ink)] hover:bg-[var(--pw-primary)]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pw-primary)]",
  selected: "rounded-[var(--pw-rounded-xs)] bg-[var(--pw-primary)] text-[var(--pw-on-primary)]",
  today: "font-bold text-[var(--pw-link)]",
  outside: "text-[var(--pw-ink)]/30",
  disabled: "cursor-not-allowed text-[var(--pw-ink)]/30",
  hidden: "invisible",
};

function getCalendarFormatters(): NonNullable<DayPickerProps["formatters"]> {
  return {
    formatCaption: (month) =>
      new Intl.DateTimeFormat("th-TH", {
        calendar: "gregory",
        month: "long",
        year: "numeric",
      }).format(month),
    formatWeekdayName: (date) =>
      new Intl.DateTimeFormat("th-TH", { weekday: "short" }).format(date),
  };
}

function Calendar({
  className,
  classNames,
  formatters,
  ...props
}: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays
      weekStartsOn={0}
      navLayout="around"
      className={cn("w-fit", className)}
      classNames={{ ...calendarClassNames, ...classNames }}
      formatters={{ ...getCalendarFormatters(), ...formatters }}
      {...props}
    />
  );
}

export { Calendar };
