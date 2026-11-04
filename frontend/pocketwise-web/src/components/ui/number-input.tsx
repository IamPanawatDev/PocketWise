"use client";

import * as React from "react";
import { Calculator, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { evaluateMathExpression, isMathExpression } from "@/lib/math-parser";

export interface NumberInputProps
  extends Omit<React.ComponentProps<"input">, "type"> {
  stepper?: boolean;
  prefixNode?: React.ReactNode;
  suffixNode?: React.ReactNode;
  enableQuickMath?: boolean;
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
      enableQuickMath = false,
      prefixNode,
      suffixNode,
      placeholder = "0",
      onChange,
      onKeyDown,
      onBlur,
      ...props
    },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const holdTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const repeatTimerRef = React.useRef<NodeJS.Timeout | null>(null);
    const [mathPreview, setMathPreview] = React.useState<number | null>(null);
    const [keyboardMode, setKeyboardMode] = React.useState<"decimal" | "text">("decimal");

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

        const handleInsertOperator = React.useCallback(
      (operator: string) => {
        const input = inputRef.current;
        if (!input || disabled) return;

        const start = input.selectionStart ?? input.value.length;
        const end = input.selectionEnd ?? input.value.length;
        const prevVal = input.value || "";
        const nextVal = prevVal.substring(0, start) + operator + prevVal.substring(end);

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

        const newPos = start + operator.length;
        input.setSelectionRange(newPos, newPos);
        input.focus();

        if (isMathExpression(nextVal)) {
          const evaluated = evaluateMathExpression(nextVal);
          setMathPreview(evaluated);
        } else {
          setMathPreview(null);
        }
      },
      [disabled]
    );

    const applyMathResult = React.useCallback((computedVal: number) => {
      const input = inputRef.current;
      if (!input || disabled) return;

      const strVal = String(computedVal);
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value"
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(input, strVal);
      } else {
        input.value = strVal;
      }

      const tracker = (input as unknown as { _valueTracker?: { setValue: (v: string) => void } })
        ._valueTracker;
      if (tracker) {
        tracker.setValue("");
      }

      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      setMathPreview(null);
    }, [disabled]);

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

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (enableQuickMath) {
        const val = e.target.value;
        if (isMathExpression(val)) {
          const evaluated = evaluateMathExpression(val);
          setMathPreview(evaluated);
        } else {
          setMathPreview(null);
        }
      }
      onChange?.(e);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (enableQuickMath && (e.key === "Enter" || e.key === "=")) {
        if (mathPreview !== null) {
          e.preventDefault();
          applyMathResult(mathPreview);
          return;
        }
      }
      onKeyDown?.(e);
    };

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (enableQuickMath && mathPreview !== null) {
        applyMathResult(mathPreview);
      }
      onBlur?.(e);
    };

    return (
      <div className="w-full space-y-1.5">
        <div className="relative flex w-full items-center">
          {prefixNode && (
            <div className="pointer-events-none absolute left-3 flex items-center text-sm text-[var(--pw-ink)]/50">
              {prefixNode}
            </div>
          )}

          <input
            ref={setRefs}
            type={enableQuickMath ? "text" : "number"}
            inputMode={props.inputMode ?? (enableQuickMath ? keyboardMode : step && String(step).includes(".") ? "decimal" : "numeric")}
            placeholder={placeholder}
            step={step}
            min={min}
            max={max}
            disabled={disabled}
            data-slot="number-input"
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            className={cn(
              "h-11 w-full min-w-0 rounded-[var(--pw-rounded-sm)] border border-[var(--pw-input-border)] bg-[var(--pw-input-surface)] px-4 py-2 text-base text-[var(--pw-ink)] transition-colors outline-none placeholder:text-[var(--pw-ink)]/55 focus-visible:border-[var(--pw-primary)] focus-visible:ring-2 focus-visible:ring-[var(--pw-primary)]/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--pw-magenta)] aria-invalid:ring-2 aria-invalid:ring-[var(--pw-magenta)]/30 md:text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
              prefixNode ? "pl-9" : undefined,
              stepper || suffixNode || mathPreview !== null ? "pr-24 sm:pr-28" : undefined,
              className
            )}
            {...props}
          />

          {/* Quick Math Live Calculated Result Badge */}
          {mathPreview !== null && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => applyMathResult(mathPreview)}
              className="absolute right-9 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[var(--pw-primary)] text-white shadow-md hover:bg-[var(--pw-primary)]/90 active:scale-95 transition-all cursor-pointer"
              title="คลิกหรือกด Enter เพื่อคำนวณยอดเงิน"
            >
              <Calculator className="size-3" />
              <span>= {mathPreview}฿</span>
            </button>
          )}

          {suffixNode && !stepper && mathPreview === null && (
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

        {/* Quick Math Operator Accessory Toolbar for Mobile & Desktop */}
        {enableQuickMath && (
          <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto text-xs">
            <span className="text-[10px] text-[var(--pw-ink)]/50 shrink-0 flex items-center gap-1 mr-0.5 select-none">
              <Calculator className="size-3 text-[var(--pw-primary)]" />
              <span>สูตร:</span>
            </span>
            {["+", "-", "*", "/", "(", ")"].map((op) => (
              <button
                key={op}
                type="button"
                tabIndex={-1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleInsertOperator(op);
                }}
                className="size-7 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-surface-indigo)]/90 text-sm font-semibold font-mono text-[var(--pw-ink)] hover:bg-[var(--pw-primary)]/20 hover:border-[var(--pw-primary)]/40 active:scale-90 transition-all flex items-center justify-center shrink-0 cursor-pointer shadow-xs select-none"
                aria-label={`ใส่เครื่องหมาย ${op}`}
              >
                {op === "*" ? "×" : op === "/" ? "÷" : op}
              </button>
            ))}

            {/* Keyboard Mode Switcher: 123 vs Text */}
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                setKeyboardMode((m) => (m === "decimal" ? "text" : "decimal"));
              }}
              className="h-7 px-2 rounded-lg border border-[var(--pw-hairline)] bg-[var(--pw-canvas)] text-[10px] font-medium text-[var(--pw-ink)]/70 hover:text-[var(--pw-ink)] active:scale-95 transition-all shrink-0 cursor-pointer select-none ml-1"
              title="สลับแป้นพิมพ์ตัวเลข / ข้อความ"
            >
              {keyboardMode === "decimal" ? "แป้น 123" : "แป้นข้อความ"}
            </button>
          </div>
        )}
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";
