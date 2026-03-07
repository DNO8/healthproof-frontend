"use client";

import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTranslations } from "next-intl";
import { FileSliderDrawer } from "@/components/cards/file-slider";
import type { FileSliderItem } from "@/components/cards/file-slider";
import { ScrollReveal, SectionTitle } from "@/components/ui";

gsap.registerPlugin(ScrollTrigger);

function AnimatedHeadline({ text }: { text: string }) {
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
      {text.split(" ").map((word, i) => {
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
  const t = useTranslations("useCases");
  const cases = t.raw("cases") as Array<{
    title: string;
    description: string;
    benefits: string[];
  }>;
  const tabLabels = t.raw("tabLabels") as Record<string, string>;

  const sliderItems: FileSliderItem[] = cases.map((uc) => ({
    id: uc.title.toLowerCase().replace(/\s+/g, "-"),
    title: uc.title,
    description: uc.description,
    tabLabel: tabLabels[uc.title] ?? "USE",
  }));

  return (
    <div>
      <ScrollReveal y={40} duration={0.6}>
        <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />
      </ScrollReveal>

      <div className="mt-8 flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center lg:gap-32">
        <div className="order-1 lg:order-2">
          <AnimatedHeadline text={t("splitText")} />
        </div>

        <ScrollReveal className="order-2 lg:order-1" y={50} duration={0.8}>
          <FileSliderDrawer
            cardWidth={{ base: 380, sm: 440 }}
            items={sliderItems}
          />
        </ScrollReveal>
      </div>
    </div>
  );
}
