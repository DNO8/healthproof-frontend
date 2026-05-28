"use client";

import { useTranslations } from "next-intl";
import { ScrollReveal, SectionDivider } from "@/components/ui";
import {
  BeforeAfterSection,
  DemoVideoSection,
  FinalCtaSection,
  HeroCarouselSection,
  Icd11Section,
  RegulatoryUrgencySection,
  SolutionSection,
  TeamSection,
  TechDecentralizedNetworkSection,
  TechEncryptionSection,
  TechTraceabilitySection,
  TechnologySection,
  UseCasesSection,
  WorkflowSection,
} from "./sections";

export function LandingPage() {
  const t = useTranslations("sectionDividers");

  return (
    <main className="relative overflow-hidden bg-(--hp-bg)">
      {/* §1 Hero */}
      <HeroCarouselSection />

      <section className="mx-auto w-full max-w-7xl space-y-12 px-4 pb-20 pt-12 sm:px-8 lg:px-12">
        {/* §2 The Solution */}
        <SolutionSection />

        {/* §3 Why This Matters Now */}
        <ScrollReveal y={30} duration={0.5}>
          <SectionDivider label={t("regulatoryUrgency")} />
        </ScrollReveal>
        <RegulatoryUrgencySection />

        {/* §4 Use Cases */}
        <ScrollReveal y={30} duration={0.5}>
          <SectionDivider label={t("useCases")} />
        </ScrollReveal>
        <UseCasesSection />

        {/* §5 How It Works */}
        <ScrollReveal y={30} duration={0.5}>
          <SectionDivider label={t("howItWorks")} />
        </ScrollReveal>
        <WorkflowSection />

        {/* §5.5 Demo Video */}
        <ScrollReveal y={30} duration={0.5}>
          <SectionDivider label={t("demoVideo")} />
        </ScrollReveal>
        <DemoVideoSection />

        {/* §6 Technology */}
        <ScrollReveal y={30} duration={0.5}>
          <SectionDivider label={t("technology")} />
        </ScrollReveal>
        <TechnologySection />

        {/* §6.1 Decentralized Network */}
        <TechDecentralizedNetworkSection />

        {/* §6.2 Encryption */}
        <TechEncryptionSection />

        {/* §6.3 Traceability */}
        <TechTraceabilitySection />

        {/* §10 Team */}
        <ScrollReveal y={30} duration={0.5}>
          <SectionDivider label={t("team")} />
        </ScrollReveal>
        <TeamSection />

        {/* §7 ICD-11 */}
        <ScrollReveal y={30} duration={0.5}>
          <SectionDivider label={t("icd11")} />
        </ScrollReveal>
        <Icd11Section />

        {/* §8 Before / After */}
        <ScrollReveal y={30} duration={0.5}>
          <SectionDivider label={t("beforeAfter")} />
        </ScrollReveal>
        <ScrollReveal y={50} duration={0.8}>
          <BeforeAfterSection />
        </ScrollReveal>

        {/* §9 Final CTA */}
        <ScrollReveal y={80} duration={1}>
          <FinalCtaSection />
        </ScrollReveal>
      </section>
    </main>
  );
}
