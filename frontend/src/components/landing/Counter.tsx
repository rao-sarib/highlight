"use client";

import { useEffect, useRef, useState } from "react";

interface CounterProps {
  /** Final value to count up to. */
  value: number;
  /** Text appended after the number (e.g. "+", "%", "x"). */
  suffix?: string;
  /** Text shown before the number. */
  prefix?: string;
  /** Animation length in ms. */
  duration?: number;
  /** Decimal places to render. */
  decimals?: number;
  className?: string;
}

export default function Counter({
  value,
  suffix = "",
  prefix = "",
  duration = 1600,
  decimals = 0,
  className,
}: CounterProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [display, setDisplay] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            const tick = (now: number) => {
              const progress = Math.min((now - start) / duration, 1);
              // easeOutExpo for a snappy, premium settle
              const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
              setDisplay(value * eased);
              if (progress < 1) requestAnimationFrame(tick);
              else setDisplay(value);
            };
            requestAnimationFrame(tick);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
