"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ScoreTimelinePoint } from "@/services/prevent-ia/health-score-engine";
import { RISK_STROKE_COLOR } from "./risk-styles";

interface LongitudinalComparisonChartProps {
  points: ScoreTimelinePoint[];
}

const WIDTH = 480;
const HEIGHT = 190;
const PADDING_X = 24;
const PADDING_Y = 20;
const LABEL_Y_OFFSET = 18;

function formatShortDate(date: string | null, locale: string): string {
  if (!date) return "";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(parsed);
}

/**
 * Serie longitudinal de Health Score: un punto por EMPA (control) de este
 * paciente, terminando en el EMPA actual recién registrado en HealthProof
 * Layer 1 — el ciclo "Nuevo EMPA → Comparación Longitudinal" del flujo de
 * Prevent IA.
 */
export function LongitudinalComparisonChart({
  points,
}: LongitudinalComparisonChartProps) {
  const t = useTranslations("dashboard.preventIa.longitudinal");
  const locale = useLocale();

  if (points.length < 2) {
    return (
      <div className="neu-surface p-6">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t("title")}
        </h3>
        <p className="text-sm text-slate-400">{t("empty")}</p>
      </div>
    );
  }

  const usableWidth = WIDTH - PADDING_X * 2;
  const usableHeight = HEIGHT - PADDING_Y * 2 - LABEL_Y_OFFSET;
  const stepX = usableWidth / (points.length - 1);

  const coords = points.map((point) => point);
  const xFor = (index: number) => PADDING_X + stepX * index;
  const yFor = (score: number) => PADDING_Y + usableHeight * (1 - score / 100);

  const linePath = coords
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.healthScore)}`)
    .join(" ");

  return (
    <div className="neu-surface p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-sky-600">
          {t("title")}
        </h3>
        <span className="text-xs text-slate-400">
          {t("subtitle", { count: points.length })}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-44 w-full"
        role="img"
        aria-label={t("title")}
      >
        {[0, 25, 50, 75, 100].map((tick) => (
          <line
            key={tick}
            x1={PADDING_X}
            x2={WIDTH - PADDING_X}
            y1={yFor(tick)}
            y2={yFor(tick)}
            stroke="var(--hp-border)"
            strokeWidth={1}
          />
        ))}

        <path d={linePath} fill="none" stroke="#94a3b8" strokeWidth={2} />

        {coords.map((point, i) => {
          const cx = xFor(i);
          const cy = yFor(point.healthScore);
          return (
            <g key={point.date ?? "current"}>
              <circle
                cx={cx}
                cy={cy}
                r={point.isCurrent ? 7 : 5}
                fill={RISK_STROKE_COLOR[point.riskLevel]}
                stroke="var(--hp-bg)"
                strokeWidth={2}
              />
              <text
                x={cx}
                y={cy - 12}
                textAnchor="middle"
                fontSize={10}
                fontWeight={point.isCurrent ? 700 : 400}
                fill="#475569"
              >
                {point.healthScore}
              </text>
              <text
                x={cx}
                y={HEIGHT - 4}
                textAnchor="middle"
                fontSize={9}
                fill="#94a3b8"
              >
                {point.isCurrent
                  ? t("current")
                  : formatShortDate(point.date, locale)}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-2 text-center text-xs text-slate-400">
        {t("currentLabel")}
      </p>
    </div>
  );
}
