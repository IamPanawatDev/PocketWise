"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring } from "motion/react";
import { formatCurrency } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  currency?: string;
  currencyCode?: string;
  className?: string;
  prefix?: string;
}

export function AnimatedNumber({
  value,
  currency = "THB",
  currencyCode,
  className,
  prefix = "",
}: AnimatedNumberProps) {
  const effectiveCurrency = currencyCode ?? currency;
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 70, damping: 18 });
  const spanRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    motionVal.set(value);
  }, [value, motionVal]);

  useEffect(() => {
    return spring.on("change", (latest) => {
      if (spanRef.current) {
        spanRef.current.textContent = `${prefix}${formatCurrency(latest, effectiveCurrency)}`;
      }
    });
  }, [spring, effectiveCurrency, prefix]);

  return (
    <span ref={spanRef} className={className}>
      {`${prefix}${formatCurrency(value, effectiveCurrency)}`}
    </span>
  );
}
