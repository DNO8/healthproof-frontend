"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Map } from "lucide-react";
import { requestTourStart } from "@/lib/onboarding/tour-events";

interface TourTriggerProps {
  role: string;
  userId: string;
  onboardingCompletedAt: string | null;
}

export function TourTrigger({ role, userId, onboardingCompletedAt }: TourTriggerProps) {
  const t = useTranslations("onboardingTour");
  const router = useRouter();
  const isFirstTime = !onboardingCompletedAt;

  function handleClick() {
    requestTourStart();
    router.push("/dashboard/overview");
  }

  return (
    <div className="neu-surface mt-6 rounded-2xl border border-white/70 p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <Map className="h-5 w-5 text-sky-600" />
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{t("profile.cardTitle")}</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {isFirstTime
              ? t("profile.cardDescriptionFirst")
              : t("profile.cardDescriptionRepeat")}
          </p>
        </div>
      </div>
      <button
        className="mt-4 rounded-xl border border-white/60 bg-(--hp-primary) px-5 py-2 text-sm font-medium text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft)"
        onClick={handleClick}
        type="button"
      >
        {isFirstTime ? t("profile.startButton") : t("profile.replayButton")}
      </button>
    </div>
  );
}
