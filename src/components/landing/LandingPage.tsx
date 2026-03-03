"use client";

import { useState } from "react";
import { SectionDivider } from "@/components/ui";
import {
  BeforeAfterSection,
  FinalCtaSection,
  HeroCarouselSection,
  StorytellingSection,
  TestimonialsSection,
  TrustSignalsSection,
} from "./sections";

export function LandingPage() {
  const [verified, setVerified] = useState(false);

  return (
    <main className="relative overflow-hidden bg-(--hp-bg)">
      <HeroCarouselSection
        onVerify={() => setVerified(true)}
        verified={verified}
      />

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-8 lg:px-12">
        <TrustSignalsSection verified={verified} />

        <SectionDivider label="Storytelling del producto" />
        <StorytellingSection />

        <SectionDivider label="Antes vs Después" />
        <BeforeAfterSection />

        <SectionDivider label="Prueba social" />
        <TestimonialsSection />

        <FinalCtaSection />
      </section>
    </main>
  );
}
