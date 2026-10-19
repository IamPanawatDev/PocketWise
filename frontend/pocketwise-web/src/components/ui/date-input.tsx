"use client";

import { useState } from "react";
import { CalendarDays, Clock3 } from "lucide-react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  clearable?: boolean;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
};

const calendarMonths = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat("th-TH", { calendar: "gregory", month: "long" }).format(
    new Date(2020, index, 1),
  ),
);
const calendarYears = Array.from({ length: 201 }, (_, index) => 1900 + index);

function parseCalendarDate(value?: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return undefined;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(0);
  date.setFullYear(year, month, day);
  date.setHours(12, 0, 0, 0);
  return date.getFullYear() === year &&
    date.getMonth() === month &&
    date.getDate() === day
    ? date
    : undefined;
}

function toCalendarDateValue(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCalendarDate(date: Date): string {
  return new Intl.DateTimeFormat("th-TH", {
    calendar: "gregory",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function CalendarField({
  id,
  value,
  onChange,
  disabled,
  className,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
  clearable = false,
  onBlur,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseCalendarDate(value);
  const [month, setMonth] = useState(() => {
    const initial = selected ?? new Date(2020, 0, 1, 12);
    return new Date(initial.getFullYear(), initial.getMonth(), 1, 12);
  });

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          const initial = selected ?? new Date();
          setMonth(new Date(initial.getFullYear(), initial.getMonth(), 1, 12));
        }
        setOpen(nextOpen);
      }}
    >
      <PopoverPrimitive.Trigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={ariaLabel}
          aria-invalid={ariaInvalid}
          aria-haspopup="dialog"
          aria-expanded={open}
          onBlur={onBlur}
          className={cn(
            "h-11 w-full justify-between border-2 !border-[var(--pw-input-border)] bg-[var(--pw-input-surface)] px-4 text-left font-normal text-[var(--pw-ink)] hover:bg-[var(--pw-input-surface)] aria-invalid:!border-[var(--pw-magenta)] aria-invalid:ring-2 aria-invalid:ring-[var(--pw-magenta)]/30",
            !selected && "text-[var(--pw-ink)]/55",
            className,
          )}
        >
          <span className="truncate">
            {selected ? formatCalendarDate(selected) : "เลือกวันที่"}
          </span>
          <CalendarDays className="size-4 shrink-0 text-[var(--pw-ink)]/70" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="start"
          sideOffset={4}
          className="z-50 rounded-[var(--pw-rounded-sm)] border border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] p-2 text-[var(--pw-ink)] shadow-lg outline-none"
        >
          <div className="mb-2 grid grid-cols-[minmax(0,1fr)_7rem] gap-2">
            <Select
              value={String(month.getMonth())}
              onValueChange={(value) =>
                setMonth(new Date(month.getFullYear(), Number(value), 1, 12))
              }
            >
              <SelectTrigger aria-label="เลือกเดือน" className="h-9 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {calendarMonths.map((monthName, index) => (
                  <SelectItem key={monthName} value={String(index)}>
                    {monthName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(month.getFullYear())}
              onValueChange={(value) =>
                setMonth(new Date(Number(value), month.getMonth(), 1, 12))
              }
            >
              <SelectTrigger aria-label="เลือกปี" className="h-9 px-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {calendarYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            startMonth={new Date(1900, 0)}
            endMonth={new Date(2100, 11)}
            selected={selected}
            onSelect={(date) => {
              if (date) {
                onChange(toCalendarDateValue(date));
                setOpen(false);
              }
            }}
          />
          {clearable && value && (
            <div className="border-t border-[var(--pw-hairline)] pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                ล้างวันที่
              </Button>
            </div>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function DateInput(props: DatePickerProps) {
  return <CalendarField {...props} clearable />;
}

function TimePicker({
  value,
  onChange,
  disabled,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [selectedHour, selectedMinute] = value.split(":");
  const hour = selectedHour || "00";
  const minute = selectedMinute || "00";
  const hours = Array.from({ length: 24 }, (_, index) =>
    index.toString().padStart(2, "0"),
  );
  const minutes = Array.from({ length: 60 }, (_, index) =>
    index.toString().padStart(2, "0"),
  );

  const updateTime = (nextHour: string, nextMinute: string) =>
    onChange(`${nextHour}:${nextMinute}`);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label="เลือกเวลา"
          aria-haspopup="dialog"
          aria-expanded={open}
          className="h-11 w-full justify-between border-2 !border-[var(--pw-input-border)] bg-[var(--pw-input-surface)] px-3 text-left font-normal text-[var(--pw-ink)] hover:bg-[var(--pw-input-surface)]"
        >
          <span className={cn(!value && "text-[var(--pw-ink)]/55")}>
            {value || "เลือกเวลา"}
          </span>
          <Clock3 className="size-4 shrink-0 text-[var(--pw-link)]" aria-hidden="true" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="end"
          sideOffset={4}
          className="z-50 w-64 rounded-[var(--pw-rounded-sm)] border border-[var(--pw-input-border)] bg-[var(--pw-surface-indigo)] p-3 text-[var(--pw-ink)] shadow-lg outline-none"
        >
          <div className="mb-2 text-sm font-semibold">เลือกเวลา</div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="min-w-0">
              <label
                htmlFor={`${id ?? "time"}-hour`}
                className="mb-1 block text-xs text-[var(--pw-ink)]/70"
              >
                ชั่วโมง
              </label>
              <Select
                value={hour}
                onValueChange={(nextHour) => updateTime(nextHour, minute)}
              >
                <SelectTrigger id={`${id ?? "time"}-hour`} aria-label="ชั่วโมง">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[60]" align="start">
                  {hours.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <span className="pt-5 text-lg font-semibold" aria-hidden="true">
              :
            </span>
            <div className="min-w-0">
              <label
                htmlFor={`${id ?? "time"}-minute`}
                className="mb-1 block text-xs text-[var(--pw-ink)]/70"
              >
                นาที
              </label>
              <Select
                value={minute}
                onValueChange={(nextMinute) => updateTime(hour, nextMinute)}
              >
                <SelectTrigger id={`${id ?? "time"}-minute`} aria-label="นาที">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[60]" align="end">
                  {minutes.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export function DateTimeInput({
  id,
  value = "",
  onChange,
  disabled,
  className,
  onBlur,
}: DatePickerProps) {
  const [dateValue, timeValue = ""] = value.split("T");

  return (
    <div className={cn("flex min-w-0 gap-2", className)}>
      <CalendarField
        id={id}
        value={dateValue}
        disabled={disabled}
        onBlur={onBlur}
        aria-label="เลือกวันที่"
        className="min-w-0 flex-1"
        onChange={(date) => onChange(`${date}T${timeValue || "00:00"}`)}
      />
      <div className="w-32 shrink-0">
        <TimePicker
          id={id ? `${id}-time` : undefined}
          value={timeValue}
          disabled={disabled || !dateValue}
          onChange={(time) => {
            if (dateValue) onChange(`${dateValue}T${time}`);
          }}
        />
      </div>
    </div>
  );
}
