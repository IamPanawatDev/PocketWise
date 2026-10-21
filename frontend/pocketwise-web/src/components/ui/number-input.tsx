"use client";

import * as React from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export interface NumberInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  stepper?: boolean;
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
}

function getPrecision(val: number | string | undefined): number {
  if (val === undefined || val === null || val === "" || val === "any") return 0;
  const str = String(val);
  const dot = str.indexOf(".");
  return dot >= 0 ? str.length - dot - 1 : 0;
}

function calculateNextValue(
  currentStr: string,
  stepProp: number | string | undefined,
  direction: "up" | "down",
  minProp?: number | string,
  maxProp?: number | string
): string {
  const stepNum =
    stepProp === undefined || stepProp === "any"
      ? 1
      : typeof stepProp === "number"
      ? stepProp
      : parseFloat(String(stepProp)) || 1;

  const precision = Math.max(getPrecision(stepProp), getPrecision(currentStr));
  const minNum =
    minProp !== undefined && minProp !== ""
      ? typeof minProp === "number"
        ? minProp
        : parseFloat(String(minProp))
      : -Infinity;
  const maxNum =
    maxProp !== undefined && maxProp !== ""
      ? typeof maxProp === "number"
        ? maxProp
        : parseFloat(String(maxProp))
      : Infinity;

  const currentNum = currentStr === "" ? 0 : parseFloat(currentStr);
  const safeCurrent = isNaN(currentNum) ? (minNum !== -Infinity ? minNum : 0) : currentNum;

  const rawNext = direction === "up" ? safeCurrent + stepNum : safeCurrent - stepNum;
  const clamped = Math.min(maxNum, Math.max(minNum, rawNext));

  return precision > 0 ? clamped.toFixed(precision) : Math.round(clamped).toString();
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      className,
      step = 1,
      min,
      max,
      disabled,
      stepper = true,
      prefixNode,
      suffixNode,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const holdTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const repeatTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    const setRefs = React.useCallback(
      (element: HTMLInputElement | null) => {
        inputRef.current = element;
        if (typeof ref === "function") {
          ref(element);
        } else if (ref) {
          (ref as React.MutableRefObject<HTMLInputElement | null>).current = element;
        }
      },
      [ref]
    );

    const triggerValueChange = React.useCallback(
      (direction: "up" | "down") => {
        const input = inputRef.current;
        if (!input || disabled) return;

        const nextVal = calculateNextValue(input.value, step, direction, min, max);

        const nativeSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;

        if (nativeSetter) {
          nativeSetter.call(input, nextVal);
        } else {
          input.value = nextVal;
        }

        const tracker = (input as unknown as { _valueTracker?: { setValue: (v: string) => void } })
          ._valueTracker;
        if (tracker) {
          tracker.setValue("");
        }

        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      },
      [disabled, max, min, step]
    );

    const stopHold = React.useCallback(() => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (repeatTimerRef.current) {
        clearInterval(repeatTimerRef.current);
        repeatTimerRef.current = null;
      }
    }, []);

    const startHold = React.useCallback(
      (direction: "up" | "down") => {
        if (disabled) return;
        triggerValueChange(direction);
        stopHold();
        holdTimerRef.current = setTimeout(() => {
          repeatTimerRef.current = setInterval(() => {
            triggerValueChange(direction);
          }, 75);
        }, 320);
      },
      [disabled, stopHold, triggerValueChange]
    );

    React.useEffect(() => {
      return () => stopHold();
    }, [stopHold]);

    return (
      <div className="relative flex w-full items-center">
        {prefixNode && (
          <div className="pointer-events-none absolute left-3 flex items-center text-sm text-[var(--pw-ink)]/50">
            {prefixNode}
          </div>
        )}

        <input
          ref={setRefs}
          type="number"
          step={step}
          min={min}
          max={max}
          disabled={disabled}
          data-slot="number-input"
          className={cn(
            "h-11 w-full min-w-0 rounded-[var(--pw-rounded-sm)] border border-[var(--pw-input-border)] bg-[var(--pw-input-surface)] px-4 py-2 text-base text-[var(--pw-ink)] transition-colors outline-none placeholder:text-[var(--pw-ink)]/55 focus-visible:border-[var(--pw-primary)] focus-visible:ring-2 focus-visible:ring-[var(--pw-primary)]/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--pw-magenta)] aria-invalid:ring-2 aria-invalid:ring-[var(--pw-magenta)]/30 md:text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            prefixNode ? "pl-9" : undefined,
            stepper || suffixNode ? "pr-10" : undefined,
            className
          )}
          {...props}
        />

        {suffixNode && !stepper && (
          <div className="pointer-events-none absolute right-3 flex items-center text-sm text-[var(--pw-ink)]/50">
            {suffixNode}
          </div>
        )}

        {stepper && (
          <div
            className={cn(
              "absolute right-1 top-1 bottom-1 flex w-7 flex-col overflow-hidden rounded-r-[calc(var(--pw-rounded-sm)-4px)] border-l border-[var(--pw-input-border)]/25 bg-[var(--pw-input-surface)]",
              disabled && "opacity-40 pointer-events-none"
            )}
          >
            <button
              type="button"
              tabIndex={-1}
              aria-label="เพิ่มค่า"
              disabled={disabled}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                startHold("up");
              }}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={() => startHold("up")}
              onTouchEnd={stopHold}
              className="flex h-1/2 w-full items-center justify-center border-b border-[var(--pw-input-border)]/20 text-[var(--pw-ink)]/60 transition-colors hover:bg-[var(--pw-primary)]/20 hover:text-[var(--pw-ink)] active:bg-[var(--pw-primary)]/35 focus:outline-none"
            >
              <ChevronUp className="size-3.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="ลดค่า"
              disabled={disabled}
              onMouseDown={(e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                startHold("down");
              }}
              onMouseUp={stopHold}
              onMouseLeave={stopHold}
              onTouchStart={() => startHold("down")}
              onTouchEnd={stopHold}
              className="flex h-1/2 w-full items-center justify-center text-[var(--pw-ink)]/60 transition-colors hover:bg-[var(--pw-primary)]/20 hover:text-[var(--pw-ink)] active:bg-[var(--pw-primary)]/35 focus:outline-none"
            >
              <ChevronDown className="size-3.5 stroke-[2.5]" />
            </button>
          </div>
        )}
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";
