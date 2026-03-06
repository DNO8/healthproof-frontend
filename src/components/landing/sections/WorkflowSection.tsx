"use client";

import Image from "next/image";
import { useRef, useLayoutEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { WORKFLOW_STEPS } from "@/components/landing/constants";
import { SectionTitle } from "@/components/ui";

gsap.registerPlugin(ScrollTrigger);

export function WorkflowSection() {
  const pinRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  useLayoutEffect(() => {
    const el = pinRef.current;
    if (!el) return;

    const totalSteps = WORKFLOW_STEPS.length;

    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 15%",
      end: `+=${totalSteps * 50}%`,
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        const idx = Math.min(
          Math.floor(self.progress * totalSteps),
          totalSteps - 1,
        );
        setActiveStep(idx);
      },
    });

    return () => st.kill();
  }, []);

  const current = WORKFLOW_STEPS[activeStep];

  return (
    <div ref={pinRef} className="neu-shell border border-white/70 p-6 sm:p-10">
      <SectionTitle
        eyebrow="How It Works"
        title="Verification without exposing medical data"
      />

      <div className="mx-auto mt-8 flex max-w-5xl flex-col items-center gap-8 lg:flex-row lg:items-start lg:gap-12">
        {/* Image */}
        <div className="relative aspect-4/3 w-full max-w-md overflow-hidden rounded-2xl lg:w-1/2">
          {WORKFLOW_STEPS.map((step, i) => (
            <div
              className="absolute inset-0 transition-opacity duration-700 ease-in-out"
              key={step.step}
              style={{ opacity: i === activeStep ? 1 : 0 }}
            >
              <Image
                alt={step.title}
                className="rounded-2xl object-cover"
                fill
                priority={i === 0}
                sizes="(max-width: 768px) 100vw, 50vw"
                src={step.image}
              />
            </div>
          ))}
        </div>

        {/* Text content */}
        <div className="flex w-full flex-col lg:w-1/2 lg:pt-4">
          {/* Step indicator dots */}
          <div className="mb-6 flex items-center gap-2">
            {WORKFLOW_STEPS.map((step, i) => (
              <div
                className="h-2 rounded-full transition-all duration-500"
                key={step.step}
                style={{
                  width: i === activeStep ? 32 : 8,
                  backgroundColor:
                    i === activeStep
                      ? "var(--hp-primary)"
                      : "var(--hp-muted-bg, #cbd5e1)",
                }}
              />
            ))}
            <span className="ml-2 text-xs font-medium text-slate-400">
              {current.step}/{WORKFLOW_STEPS.length}
            </span>
          </div>

          {/* Active step content */}
          <div
            className="transition-opacity duration-500 ease-in-out"
            key={activeStep}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--hp-primary-soft)">
                <span className="text-sm font-bold text-sky-700">
                  {current.step}
                </span>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 sm:text-2xl">
                {current.title}
              </h3>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
              {current.description}
            </p>
          </div>

          {/* Bottom tagline */}
          <div className="mt-8 border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500">
              The patient does not share data.
            </p>
            <p className="mt-0.5 text-sm font-semibold text-slate-700">
              The patient shares{" "}
              <span className="text-sky-600">permissions</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
