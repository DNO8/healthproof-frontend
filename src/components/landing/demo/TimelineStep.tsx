"use client";

import {
  Check,
  FileText,
  FlaskConical,
  Share2,
  Shield,
  Stethoscope,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { generateMockHash, getNextBlockNumber } from "./mock-data";

interface TimelineStepProps {
  onComplete: () => void;
}

export function TimelineStep({ onComplete }: TimelineStepProps) {
  const t = useTranslations("demoFlow");

  useEffect(() => {
    onComplete();
  }, [onComplete]);

  const events = [
    {
      icon: <Stethoscope className="h-4 w-4 text-sky-500" />,
      title: t("timelineOrderCreated"),
      actor: t("doctorRole"),
      hash: generateMockHash(),
      block: getNextBlockNumber(),
    },
    {
      icon: <FlaskConical className="h-4 w-4 text-indigo-500" />,
      title: t("timelineResultUploaded"),
      actor: t("labRole"),
      hash: generateMockHash(),
      block: getNextBlockNumber(),
    },
    {
      icon: <Shield className="h-4 w-4 text-emerald-500" />,
      title: t("timelinePatientViewed"),
      actor: t("patientRole"),
      hash: generateMockHash(),
      block: getNextBlockNumber(),
    },
    {
      icon: <Share2 className="h-4 w-4 text-sky-500" />,
      title: t("timelineShared"),
      actor: t("patientRole"),
      hash: generateMockHash(),
      block: getNextBlockNumber(),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-800">
        <FileText className="h-5 w-5" />
        <h3 className="text-sm font-semibold">{t("timelineTitle")}</h3>
      </div>

      <p className="text-sm text-slate-600">{t("timelineDesc")}</p>

      <div className="space-y-3">
        {events.map((ev, i) => (
          <div
            key={ev.title}
            className="relative flex gap-3 rounded-2xl border border-(--hp-border) bg-(--hp-layer) p-4"
          >
            <div className="flex flex-col items-center gap-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                {ev.icon}
              </div>
              {i < events.length - 1 && (
                <div className="w-0.5 flex-1 bg-slate-200" />
              )}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-slate-700">{ev.title}</p>
              <p className="text-xs text-slate-400">{ev.actor}</p>
              <div className="mt-1 space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {t("txHashLabel")}
                </p>
                <p className="font-mono text-[10px] text-slate-600">
                  {ev.hash}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {t("blockLabel")}
                </p>
                <p className="font-mono text-[10px] text-slate-600">
                  #{ev.block}
                </p>
              </div>
            </div>
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
              <Check className="h-3 w-3 text-emerald-600" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
