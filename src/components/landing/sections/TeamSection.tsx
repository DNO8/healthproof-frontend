"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { TEAM_MEMBERS } from "@/components/landing/constants";
import { ScrollReveal, SectionTitle } from "@/components/ui";

export function TeamSection() {
  const t = useTranslations("team");

  return (
    <ScrollReveal y={50} duration={0.8}>
      <div className="neu-shell border border-white/70 p-6 sm:p-10">
        <SectionTitle eyebrow={t("eyebrow")} title={t("title")} />

        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-relaxed text-slate-600 sm:text-base">
          {t("description")}{" "}
          <strong className="text-slate-800">{t("descriptionBold")}</strong>
        </p>

        <div className="mx-auto mt-8 grid max-w-3xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TEAM_MEMBERS.map((member) => (
            <a
              className="neu-surface flex flex-col items-center p-5 text-center transition-shadow hover:shadow-lg"
              href={member.linkedin}
              key={member.name}
              rel="noopener noreferrer"
              target="_blank"
            >
              <div className="relative h-20 w-20 overflow-hidden rounded-full border-2 border-white/80 shadow-md">
                <Image
                  alt={member.name}
                  className="object-cover"
                  fill
                  sizes="80px"
                  src={member.photo}
                />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-slate-800">
                {member.name}
              </h3>
              <p className="text-xs font-medium text-slate-500">
                {member.role}
              </p>
              <div className="mt-3 flex items-center justify-center gap-3">
                {member.icons.map((icon) => {
                  const size = member.icons.length === 1 ? 60 : 28;
                  return (
                    <Image
                      alt="project"
                      className="rounded-md"
                      height={size}
                      key={icon}
                      src={icon}
                      width={size}
                    />
                  );
                })}
              </div>
            </a>
          ))}
        </div>
      </div>
    </ScrollReveal>
  );
}
