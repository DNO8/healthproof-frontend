"use client";

import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { FileSliderDrawer } from "@/components/cards/file-slider";
import type { FileSliderItem } from "@/components/cards/file-slider";
import { USE_CASES } from "@/components/landing/constants";
import { ScrollReveal, SectionTitle } from "@/components/ui";

gsap.registerPlugin(ScrollTrigger);

const TAB_LABELS: Record<string, string> = {
  "Medical Centers": "MCR",
  Laboratories: "LAB",
  Patients: "PAT",
};

const USE_CASE_SLIDER_ITEMS: FileSliderItem[] = USE_CASES.map((uc) => ({
  id: uc.title.toLowerCase().replace(/\s+/g, "-"),
  title: uc.title,
  description: uc.description,
  tabLabel: TAB_LABELS[uc.title] ?? "USE",
}));

const SPLIT_TEXT = "HealthProof makes it possible in three simple steps!";

function AnimatedHeadline() {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const words = el.querySelectorAll<HTMLSpanElement>(".split-word");

    gsap.set(words, { opacity: 0, y: 40 });

    gsap.to(words, {
      opacity: 1,
      y: 0,
      duration: 0.6,
      ease: "power3.out",
      stagger: 0.08,
      scrollTrigger: {
        trigger: el,
        start: "top 80%",
        toggleActions: "play none none none",
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex max-w-lg flex-wrap items-baseline gap-x-4 gap-y-2 lg:pt-16"
    >
      {SPLIT_TEXT.split(" ").map((word, i) => {
        const key = `w${i}-${word}`;
        return (
          <span
            className="split-word text-5xl font-bold tracking-tight text-slate-800 sm:text-6xl"
            key={key}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}

export function UseCasesSection() {
  return (
    <div>
      <ScrollReveal y={40} duration={0.6}>
        <SectionTitle
          eyebrow="Use Cases"
          title="Clinical workflows built on verifiable evidence"
        />
      </ScrollReveal>

      <div className="mt-8 flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center lg:gap-32">
        <div className="order-1 lg:order-2">
          <AnimatedHeadline />
        </div>

        <ScrollReveal className="order-2 lg:order-1" y={50} duration={0.8}>
          <FileSliderDrawer
            cardWidth={{ base: 380, sm: 440 }}
            items={USE_CASE_SLIDER_ITEMS}
          />
        </ScrollReveal>
      </div>
    </div>
  );
}
