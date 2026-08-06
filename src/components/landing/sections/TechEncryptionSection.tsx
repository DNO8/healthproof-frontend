"use client";

import { ArrowRight, KeyRound, Lock, Unlock, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ScrollReveal, SectionTitle } from "@/components/ui";

export function TechEncryptionSection() {
  const t = useTranslations("techSections");
  const [stage, setStage] = useState<
    "idle" | "keygen" | "encrypt" | "transmit" | "decrypt"
  >("idle");

  const stages: { key: typeof stage; label: string }[] = [
    { key: "keygen", label: t("stageKeygen") },
    { key: "encrypt", label: t("stageEncrypt") },
    { key: "transmit", label: t("stageTransmit") },
    { key: "decrypt", label: t("stageDecrypt") },
  ];

  const currentIdx = stages.findIndex((s) => s.key === stage);

  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <ScrollReveal y={50} duration={0.8}>
        <div className="neu-shell border border-white/70 p-6 sm:p-10">
          <SectionTitle
            eyebrow={t("encryptionBadge")}
            title={t("encryptionTitle")}
            subtitle={t("encryptionDesc")}
            centered
          />

          <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-white/60 bg-(--hp-bg) p-6 shadow-(--hp-shadow-inset) sm:p-8">
            {/* Visualization */}
            <div className="mb-6 flex items-center justify-between gap-2">
              {/* Sender */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition ${
                    currentIdx >= 0
                      ? "border-sky-300 bg-sky-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <Users className="h-6 w-6 text-sky-500" />
                </div>
                <span className="text-xs font-medium text-slate-600">
                  {t("sender")}
                </span>
              </div>

              {/* Arrow + Key */}
              <div className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full items-center gap-1">
                  <div
                    className={`h-1 flex-1 rounded-full transition ${currentIdx >= 1 ? "bg-emerald-400" : "bg-slate-200"}`}
                  />
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                      currentIdx >= 1
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div
                    className={`h-1 flex-1 rounded-full transition ${currentIdx >= 2 ? "bg-emerald-400" : "bg-slate-200"}`}
                  />
                </div>
                <span className="text-[10px] text-slate-400">
                  {currentIdx === 0
                    ? t("generateKey")
                    : currentIdx >= 1
                      ? t("sessionKeyActive")
                      : ""}
                </span>
              </div>

              {/* Receiver */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition ${
                    currentIdx >= 3
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <Users className="h-6 w-6 text-emerald-500" />
                </div>
                <span className="text-xs font-medium text-slate-600">
                  {t("receiver")}
                </span>
              </div>
            </div>

            {/* Stage content */}
            <div className="mb-6 min-h-[140px] rounded-2xl border border-(--hp-border) bg-white/60 p-4">
              {stage === "idle" && (
                <div className="flex h-full flex-col items-center justify-center gap-2 py-4 text-center">
                  <Lock className="h-8 w-8 text-slate-300" />
                  <p className="text-sm text-slate-500">
                    {t("encryptionIdle")}
                  </p>
                </div>
              )}
              {stage === "keygen" && (
                <div className="space-y-2 py-2">
                  <p className="text-sm font-medium text-slate-700">
                    {t("keygenTitle")}
                  </p>
                  <div className="flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-mono text-sky-700">
                    <KeyRound className="h-4 w-4 shrink-0" />
                    <span className="break-all">
                      e: 0xA3B5...9F2D · d: [non-extractable]
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{t("keygenDesc")}</p>
                </div>
              )}
              {stage === "encrypt" && (
                <div className="space-y-2 py-2">
                  <p className="text-sm font-medium text-slate-700">
                    {t("encryptTitle")}
                  </p>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
                    <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="font-mono text-xs text-slate-600 break-all">
                      U2FsdGVkX1+7J8v2...9aB3cD4eF5gH6iJ7kL8mN9oP0qR1sT2uV3wX4yZ5
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{t("encryptDesc")}</p>
                </div>
              )}
              {stage === "transmit" && (
                <div className="space-y-2 py-2">
                  <p className="text-sm font-medium text-slate-700">
                    {t("transmitTitle")}
                  </p>
                  <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                    <ArrowRight className="h-4 w-4 shrink-0" />
                    <span>{t("transmitDesc")}</span>
                  </div>
                </div>
              )}
              {stage === "decrypt" && (
                <div className="space-y-2 py-2">
                  <p className="text-sm font-medium text-slate-700">
                    {t("decryptTitle")}
                  </p>
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    <Unlock className="h-4 w-4 shrink-0" />
                    <span>{t("decryptDesc")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {stages.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStage(s.key)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                    stage === s.key
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
              {stage !== "idle" && (
                <button
                  type="button"
                  onClick={() => setStage("idle")}
                  className="ml-auto rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-500 hover:bg-slate-200"
                >
                  {t("reset")}
                </button>
              )}
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
