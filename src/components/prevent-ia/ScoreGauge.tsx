"use client";

import { useTranslations } from "next-intl";
import { useAnimatedNumber } from "@/hooks/ui/useAnimatedNumber";
import type { RiskLevel } from "@/services/prevent-ia/types";
import { RISK_BADGE_CLASS, RISK_STROKE_COLOR } from "./risk-styles";

interface ScoreGaugeProps {
  score: number;
  riskLevel: RiskLevel;
}

const RADIUS = 80;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreGauge({ score, riskLevel }: ScoreGaugeProps) {
  const t = useTranslations("dashboard.preventIa");
  const animatedScore = useAnimatedNumber(score);
  const color = RISK_STROKE_COLOR[riskLevel];
  const offset = CIRCUMFERENCE * (1 - animatedScore / 100);

  return (
    <div className="neu-shell flex flex-col items-center gap-3 border border-white/70 p-6">
      <div className="relative h-44 w-44">
        <svg
          viewBox="0 0 200 200"
          className="h-full w-full -rotate-90"
          role="img"
          aria-label={t("healthScore")}
        >
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke="var(--hp-border)"
            strokeWidth={16}
          />
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={16}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{
              transition:
                "stroke-dashoffset 900ms ease-out, stroke 700ms ease-out",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums" style={{ color }}>
            {animatedScore}
          </span>
          <span className="text-xs text-slate-400">{t("healthScore")}</span>
        </div>
      </div>
      <span
        className={`rounded-full px-4 py-1 text-sm font-semibold ${RISK_BADGE_CLASS[riskLevel]}`}
      >
        {t(`riskLevel.${riskLevel}`)}
      </span>
    </div>
  );
}
