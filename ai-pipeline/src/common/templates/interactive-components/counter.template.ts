/**
 * Returns a complete React animated counter component as a TSX source string.
 * Uses requestAnimationFrame for smooth number counting animation.
 */
export function getCounterTemplate(): string {
  return `'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface CounterProps {
  /** Starting value (default: 0). */
  start?: number;
  /** Target / ending value. */
  end: number;
  /** Animation duration in ms (default: 2000). */
  duration?: number;
  /** Text shown before the number. */
  prefix?: string;
  /** Text shown after the number. */
  suffix?: string;
  /** Number of decimal places (default: 0). */
  decimals?: number;
  /** Thousands separator (default: ','). */
  separator?: string;
  /** If true, animation starts only when element is in viewport (default: true). */
  animateOnScroll?: boolean;
  className?: string;
}

export default function Counter({
  start = 0,
  end,
  duration = 2000,
  prefix = '',
  suffix = '',
  decimals = 0,
  separator = ',',
  animateOnScroll = true,
  className = '',
}: CounterProps) {
  const [displayValue, setDisplayValue] = useState(start);
  const [hasStarted, setHasStarted] = useState(!animateOnScroll);
  const ref = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number | null>(null);

  // IntersectionObserver trigger
  useEffect(() => {
    if (!animateOnScroll || hasStarted) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [animateOnScroll, hasStarted]);

  // Animate the counter
  useEffect(() => {
    if (!hasStarted) return;

    const startTime = performance.now();
    const diff = end - start;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + diff * eased);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [hasStarted, start, end, duration]);

  const formatNumber = useCallback(
    (value: number): string => {
      const fixed = value.toFixed(decimals);
      if (!separator) return fixed;

      const [intPart, decPart] = fixed.split('.');
      const withSeparator = intPart.replace(/\\B(?=(\\d{3})+(?!\\d))/g, separator);
      return decPart !== undefined ? \`\${withSeparator}.\${decPart}\` : withSeparator;
    },
    [decimals, separator],
  );

  return (
    <span ref={ref} className={\`counter \${className}\`.trim()}>
      {prefix}
      {formatNumber(displayValue)}
      {suffix}
    </span>
  );
}
`;
}
