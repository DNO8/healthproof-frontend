"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, Check, Clock, FileText } from "lucide-react";
import { ScrollReveal, SectionTitle } from "@/components/ui";

export function TechTraceabilitySection() {
  const t = useTranslations("techSections");
  const [activeBlock, setActiveBlock] = useState<number | null>(null);

  const blocks = [
    {
      id: 0,
      time: "10:00",
      title: t("traceOrderCreated"),
      actor: t("actorDoctor"),
      icon: <FileText className="h-4 w-4 text-sky-500" />,
      hash: "0xA1b2...3c4d",
    },
    {
      id: 1,
      time: "10:15",
      title: t("tracePermissionGranted"),
      actor: t("actorPatient"),
      icon: <Check className="h-4 w-4 text-emerald-500" />,
      hash: "0xB2c3...4d5e",
    },
    {
      id: 2,
      time: "11:30",
      title: t("traceResultUploaded"),
      actor: t("actorLab"),
      icon: <FileText className="h-4 w-4 text-indigo-500" />,
      hash: "0xC3d4...5e6f",
    },
    {
      id: 3,
      time: "11:35",
      title: t("traceAccessed"),
      actor: t("actorPatient"),
      icon: <Activity className="h-4 w-4 text-emerald-500" />,
      hash: "0xD4e5...6f7a",
    },
    {
      id: 4,
      time: "12:00",
      title: t("traceShared"),
      actor: t("actorDoctor"),
      icon: <Check className="h-4 w-4 text-sky-500" />,
      hash: "0xE5f6...7a8b",
    },
  ];

  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <ScrollReveal y={50} duration={0.8}>
        <div className="neu-shell border border-white/70 p-6 sm:p-10">
          <SectionTitle
            eyebrow={t("traceabilityBadge")}
            title={t("traceabilityTitle")}
            subtitle={t("traceabilityDesc")}
            centered
          />

          <div className="mx-auto mt-10 max-w-2xl">
            <div className="rounded-3xl border border-white/60 bg-(--hp-bg) p-6 shadow-(--hp-shadow-inset) sm:p-8">
              {/* Timeline header */}
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-700">
                  <Clock className="h-5 w-5" />
                  <span className="text-sm font-semibold">{t("auditTrail")}</span>
                </div>
                <span className="text-xs text-slate-400">{t("immutable")}</span>
              </div>

              {/* Timeline */}
              <div className="relative space-y-4">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-2 h-[calc(100%-16px)] w-0.5 bg-slate-200" />

                {blocks.map((block) => {
                  const isActive = activeBlock === block.id;
                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => setActiveBlock(isActive ? null : block.id)}
                      className={`relative flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                        isActive
                          ? "border-sky-200 bg-sky-50/50"
                          : "border-transparent bg-white/40 hover:bg-white/70"
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition ${
                        isActive ? "border-sky-300 bg-white" : "border-slate-200 bg-slate-50"
                      }`}>
                        {block.icon}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">{block.time}</span>
                          <span className="text-xs text-slate-500">· {block.actor}</span>
                        </div>
                        <p className="mt-0.5 text-sm font-medium text-slate-700">{block.title}</p>

                        {isActive && (
                          <div className="mt-2 rounded-xl bg-white/70 px-3 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                              {t("txHashLabel")}
                            </p>
                            <p className="font-mono text-xs text-slate-600">{block.hash}</p>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
