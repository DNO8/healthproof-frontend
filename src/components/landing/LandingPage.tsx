"use client";

import { useState } from "react";
import { ScrollReveal, SectionDivider, SectionTitle } from "@/components/ui";
import { FileSlider } from "@/components/cards/file-slider";
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
        <ScrollReveal y={40} duration={0.7}>
          <TrustSignalsSection verified={verified} />
        </ScrollReveal>

        <ScrollReveal y={30} duration={0.5}>
          <SectionDivider label="Storytelling del producto" />
        </ScrollReveal>
        <StorytellingSection />

        <ScrollReveal y={30} duration={0.5}>
          <SectionDivider label="Antes vs Después" />
        </ScrollReveal>
        <ScrollReveal y={50} duration={0.8}>
          <BeforeAfterSection />
        </ScrollReveal>

        <ScrollReveal y={30} duration={0.5}>
          <SectionDivider label="Documentos verificables" />
        </ScrollReveal>
        <ScrollReveal y={60} duration={0.9}>
          <section className="py-12">
            <SectionTitle
              eyebrow="Documentos"
              subtitle="Cada examen, orden o resultado queda registrado como evidencia verificable e inmutable."
              title="Archivos médicos on-chain"
            />
            <div className="mt-16">
              <FileSlider />
            </div>
          </section>
        </ScrollReveal>

        <ScrollReveal y={30} duration={0.5}>
          <SectionDivider label="Prueba social" />
        </ScrollReveal>
        <ScrollReveal y={50} duration={0.8}>
          <TestimonialsSection />
        </ScrollReveal>

        <ScrollReveal y={80} duration={1}>
          <FinalCtaSection />
        </ScrollReveal>
      </section>
    </main>
  );
}
