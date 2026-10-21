"use client";

import { useEffect, useState } from "react";
import { animate } from "motion/react";
import { formatCurrency } from "@/lib/utils";

interface AnimatedNumberProps {
  value: number;
  currencyCode?: string;
  className?: string;
  prefix?: string;
  duration?: number;
}

export function AnimatedNumber({
  value,
  currencyCode = "THB",
  className,
  prefix = "",
  duration = 0.65,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isNaN(value)) {
      setDisplayValue(0);
      return;
    }

    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // easeOutExpo
      onUpdate: (latest) => setDisplayValue(latest),
    });

    return () => controls.stop();
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {formatCurrency(displayValue, currencyCode)}
    </span>
  );
}
