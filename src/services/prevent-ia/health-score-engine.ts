/**
 * Motor de Health Score — reglas explícitas y configurables, nunca un modelo
 * de caja negra: cada punto restado se puede explicar en una frase.
 *
 *   1. Identificar el examen y su valor.
 *   2. Comparar contra el rango de referencia clínico (`reference-ranges.ts`).
 *   3. Comparar contra el historial del mismo paciente (tendencia, no solo
 *      valor puntual).
 *   4. Calcular el Health Score (0-100) con una razón trazable.
 */
import {
  type BandDefinition,
  classifyValue,
  getReferenceRange,
} from "./reference-ranges";
import type { ClinicalResult, PatientHistoryEntry, RiskLevel } from "./types";

/** Penalización fija por "vigilancia": cualquier alza vs. el control previo, sin importar la magnitud. */
const TREND_UP_PENALTY = 5;
/** Penalización extra cuando el alza es sostenida en 2+ controles consecutivos, no un solo salto. */
const SUSTAINED_TREND_PENALTY = 5;

export interface HealthScoreBreakdown {
  healthScore: number;
  riskLevel: RiskLevel;
  band: BandDefinition;
  bandPenalty: number;
  trendPenalty: number;
  sustainedTrend: boolean;
  trendDirection: "up" | "down" | "stable" | "sin_historial";
  lastComparableValue: number | null;
  percentChangeVsLast: number | null;
  scoreExplanation: string;
  historyMissing: boolean;
}

/** Un punto de la serie histórica: un EMPA (control) de este paciente. */
export interface ScoreTimelinePoint {
  /** ISO date del control, o `null` para el EMPA actual (recién registrado en HealthProof Layer 1). */
  date: string | null;
  value: number;
  unit: string;
  healthScore: number;
  riskLevel: RiskLevel;
  isCurrent: boolean;
}

function sortHistoryAscending(
  history: PatientHistoryEntry[],
): PatientHistoryEntry[] {
  return [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
}

/** ¿La secuencia (historial + valor actual) sube en cada paso consecutivo? */
function isSustainedUptrend(
  historyAsc: PatientHistoryEntry[],
  currentValue: number,
): boolean {
  if (historyAsc.length < 2) return false;
  const values = [...historyAsc.map((h) => h.value), currentValue];
  for (let i = 1; i < values.length; i++) {
    if (values[i] <= values[i - 1]) return false;
  }
  return true;
}

function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 85) return "bajo";
  if (score >= 60) return "moderado";
  return "alto";
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function calculateHealthScore(
  current: ClinicalResult,
  history: PatientHistoryEntry[],
): HealthScoreBreakdown {
  const historyMissing = history.length === 0;
  const band = classifyValue(current.loincCode, current.value);
  const referenceRange = getReferenceRange(current.loincCode);
  const bandPenalty = band.scorePenalty;

  const historyAsc = sortHistoryAscending(history);
  const lastComparable = historyAsc[historyAsc.length - 1] ?? null;

  let trendDirection: HealthScoreBreakdown["trendDirection"] = "sin_historial";
  let trendPenalty = 0;
  let sustainedTrend = false;
  let percentChangeVsLast: number | null = null;

  if (lastComparable) {
    percentChangeVsLast = round1(
      ((current.value - lastComparable.value) / lastComparable.value) * 100,
    );
    if (current.value > lastComparable.value) {
      trendDirection = "up";
      trendPenalty += TREND_UP_PENALTY;
      sustainedTrend = isSustainedUptrend(historyAsc, current.value);
      if (sustainedTrend) trendPenalty += SUSTAINED_TREND_PENALTY;
    } else if (current.value < lastComparable.value) {
      trendDirection = "down";
    } else {
      trendDirection = "stable";
    }
  }

  const rawScore = 100 - bandPenalty - trendPenalty;
  const healthScore = Math.max(0, Math.min(100, Math.round(rawScore)));
  const riskLevel = riskLevelFromScore(healthScore);

  const scoreExplanation = buildScoreExplanation({
    examType: current.examType,
    unit: current.unit,
    value: current.value,
    bandLabel: band.label,
    bandPenalty,
    trendDirection,
    trendPenalty,
    sustainedTrend,
    lastComparable,
    percentChangeVsLast,
    historyMissing,
    hasReferenceRange: Boolean(referenceRange),
    priorControlsCount: historyAsc.length,
  });

  return {
    healthScore,
    riskLevel,
    band,
    bandPenalty,
    trendPenalty,
    sustainedTrend,
    trendDirection,
    lastComparableValue: lastComparable?.value ?? null,
    percentChangeVsLast,
    scoreExplanation,
    historyMissing,
  };
}

function buildScoreExplanation(args: {
  examType: string;
  unit: string;
  value: number;
  bandLabel: string;
  bandPenalty: number;
  trendDirection: HealthScoreBreakdown["trendDirection"];
  trendPenalty: number;
  sustainedTrend: boolean;
  lastComparable: PatientHistoryEntry | null;
  percentChangeVsLast: number | null;
  historyMissing: boolean;
  hasReferenceRange: boolean;
  priorControlsCount: number;
}): string {
  const parts: string[] = [];

  if (args.bandPenalty === 0) {
    parts.push(
      `${args.examType} dentro de rango (${args.value} ${args.unit}, ${args.bandLabel})`,
    );
  } else {
    parts.push(
      `${args.examType} en rango "${args.bandLabel}" (${args.value} ${args.unit}, -${args.bandPenalty} pts)`,
    );
  }

  if (args.historyMissing) {
    parts.push("sin historial previo registrado para evaluar tendencia");
  } else if (
    args.trendDirection === "up" &&
    args.lastComparable &&
    args.percentChangeVsLast !== null
  ) {
    const trendNote = args.sustainedTrend
      ? `tendencia sostenida al alza en ${args.priorControlsCount} controles previos (-${args.trendPenalty} pts)`
      : `en ascenso vs. el control anterior (-${args.trendPenalty} pts)`;
    parts.push(
      `subió de ${args.lastComparable.value} a ${args.value} ${args.unit} (${
        args.percentChangeVsLast > 0 ? "+" : ""
      }${args.percentChangeVsLast}%), ${trendNote}`,
    );
  } else if (args.trendDirection === "down") {
    parts.push(
      `bajó vs. el control anterior (${args.lastComparable?.value} → ${args.value} ${args.unit})`,
    );
  } else if (args.trendDirection === "stable") {
    parts.push("sin cambio vs. el control anterior");
  }

  if (!args.hasReferenceRange) {
    parts.push(
      "(sin rango de referencia configurado para este código LOINC — no se aplicó penalización por rango)",
    );
  }

  return `${capitalize(parts.join("; "))}.`;
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);
}

/**
 * Reconstruye la serie longitudinal de Health Score de este paciente: un
 * punto por cada EMPA (control) previo + el EMPA actual (recién registrado
 * en HealthProof Layer 1). Cada punto histórico se calcula con solo la
 * información disponible hasta ese momento (nunca "ve" el futuro), para que
 * la comparación longitudinal sea trazable EMPA a EMPA, igual que el score
 * puntual.
 */
export function buildScoreTimeline(
  current: ClinicalResult,
  history: PatientHistoryEntry[],
  currentDate: string | null = null,
): ScoreTimelinePoint[] {
  const historyAsc = sortHistoryAscending(history);

  const historicalPoints: ScoreTimelinePoint[] = historyAsc.map(
    (point, index) => {
      const priorHistory = historyAsc.slice(0, index);
      const pointAsResult: ClinicalResult = {
        ...current,
        value: point.value,
        unit: point.unit,
      };
      const breakdown = calculateHealthScore(pointAsResult, priorHistory);
      return {
        date: point.date,
        value: point.value,
        unit: point.unit,
        healthScore: breakdown.healthScore,
        riskLevel: breakdown.riskLevel,
        isCurrent: false,
      };
    },
  );

  const currentBreakdown = calculateHealthScore(current, history);
  const currentPoint: ScoreTimelinePoint = {
    date: currentDate,
    value: current.value,
    unit: current.unit,
    healthScore: currentBreakdown.healthScore,
    riskLevel: currentBreakdown.riskLevel,
    isCurrent: true,
  };

  return [...historicalPoints, currentPoint];
}
