"use client";

import type { ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  y?: number;
  x?: number;
  delay?: number;
  duration?: number;
  stagger?: number;
  start?: string;
};

export function ScrollReveal({
  children,
  className,
  y,
  x,
  delay,
  duration,
  stagger,
  start,
}: ScrollRevealProps) {
  const ref = useScrollReveal<HTMLDivElement>({
    y,
    x,
    delay,
    duration,
    stagger,
    start,
  });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
