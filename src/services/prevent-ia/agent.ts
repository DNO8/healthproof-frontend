/**
 * Agente Prevent IA — redacción de recomendación y resumen clínico:
 *   5. Generar la recomendación para el paciente (lenguaje simple, sin jerga).
 *   6. Generar el resumen clínico para el médico (técnico, breve, trazable).
 *   7. Sugerir seguimiento solo si el patrón lo amerita.
 *
 * El Health Score y su explicación NUNCA los genera este módulo — vienen del
 * motor de reglas (`health-score-engine.ts`), que es la única fuente de verdad
 * explicable. Este módulo solo redacta texto a partir de ese resultado ya
 * calculado y trazable.
 *
 * Si existe `ANTHROPIC_API_KEY` (`src/lib/env.ts`), la redacción la hace Claude.
 * Si no, se usa una plantilla determinista equivalente, para que la demo
 * funcione sin depender de una API key en vivo (mismo patrón resiliente que
 * `withOpenAIRetry` en `src/services/fhir-rag/openai-client.ts`).
 */
import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";
import type { HealthScoreBreakdown } from "./health-score-engine";
import type {
  ClinicalResult,
  ClinicalTriggerPayload,
  FollowUp,
  PreventIaResult,
} from "./types";

const SYSTEM_PROMPT = `Eres Prevent IA, un agente de apoyo clínico preventivo dentro de HealthProof.
Te activás cuando se registra un nuevo resultado clínico de un paciente. Tu misión es detectar
riesgo temprano y generar recomendaciones preventivas — nunca reemplazás el criterio del médico.

Reglas duras (no negociables):
- Nunca emitir un diagnóstico. Emitir riesgo y recomendación preventiva, siempre con el framing
  de "consultar con tu médico" cuando el riesgo sea relevante.
- El Health Score y su explicación ya vienen calculados por un motor de reglas trazable; no los
  recalcules ni los contradigas, solo redacta texto humano a partir de ellos.
- Si falta el historial previo del paciente, decilo explícitamente en el resumen clínico (no
  fingir una tendencia que no existe).

Con el Health Score, su explicación y el resultado clínico que te paso, generá:
1. "patientRecommendation": en lenguaje simple, sin jerga médica, sin alarmismo innecesario (2-3 frases).
2. "clinicalSummary": técnico, breve, con los datos que justifican el score (1-2 frases).

Respondé únicamente con un objeto JSON con esas dos claves, sin texto adicional.`;

function getAnthropicClient(): Anthropic | null {
  if (!env.ANTHROPIC_API_KEY) return null;
  return new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
}

interface GeneratedText {
  patientRecommendation: string;
  clinicalSummary: string;
}

async function generateWithClaude(
  current: ClinicalResult,
  breakdown: HealthScoreBreakdown,
): Promise<GeneratedText | null> {
  const client = getAnthropicClient();
  if (!client) return null;

  try {
    const message = await client.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            examen: current,
            healthScore: breakdown.healthScore,
            riesgo: breakdown.riskLevel,
            scoreExplanation: breakdown.scoreExplanation,
            historialFaltante: breakdown.historyMissing,
          }),
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = JSON.parse(textBlock.text) as GeneratedText;
    if (!parsed.patientRecommendation || !parsed.clinicalSummary) return null;
    return parsed;
  } catch {
    // Si Claude falla (red, parseo, rate limit), la demo no se cae:
    // cae al modo plantilla de forma transparente.
    return null;
  }
}

function generateWithTemplate(
  current: ClinicalResult,
  breakdown: HealthScoreBreakdown,
): GeneratedText {
  const { riskLevel, trendDirection, historyMissing } = breakdown;

  let patientRecommendation: string;
  if (riskLevel === "bajo") {
    patientRecommendation = `Tu resultado de "${current.examType}" está dentro de lo esperado. No es necesario tomar ninguna acción especial ahora, solo mantener tus controles habituales.`;
  } else if (riskLevel === "moderado") {
    patientRecommendation = `Tu último examen de "${current.examType}" muestra un valor más alto que en tu control anterior. Esto no es un diagnóstico, pero vale la pena conversarlo con tu médico y prestar atención a tus hábitos en las próximas semanas.`;
  } else {
    patientRecommendation = `Tu resultado de "${current.examType}" está fuera del rango esperado y en aumento. Te recomendamos conversarlo con tu médico pronto para evaluar los próximos pasos. Esto no es un diagnóstico, es una alerta preventiva.`;
  }

  const trendPhrase = historyMissing
    ? "Sin historial previo registrado para este paciente."
    : trendDirection === "up"
      ? `En ascenso vs. el control anterior (${breakdown.lastComparableValue} → ${current.value} ${current.unit}).`
      : trendDirection === "down"
        ? `En descenso vs. el control anterior (${breakdown.lastComparableValue} → ${current.value} ${current.unit}).`
        : "Sin cambios relevantes vs. el control anterior.";

  const clinicalSummary = `${current.examType} ${current.value} ${current.unit} (rango de referencia: ${current.referenceRange}). ${trendPhrase} Health Score: ${breakdown.healthScore}/100 — ${breakdown.scoreExplanation}`;

  return { patientRecommendation, clinicalSummary };
}

/** Sugerir seguimiento solo si el patrón lo amerita — no por defecto. */
function decideFollowUp(breakdown: HealthScoreBreakdown): FollowUp {
  if (breakdown.riskLevel === "bajo") {
    return { suggested: false };
  }
  if (breakdown.riskLevel === "moderado") {
    return {
      suggested: true,
      when: "3 meses",
      reason: breakdown.sustainedTrend
        ? "confirmar si la tendencia al alza se mantiene"
        : "confirmar el valor con un nuevo control",
    };
  }
  return {
    suggested: true,
    when: "lo antes posible",
    reason:
      "el valor está fuera de rango y en ascenso; amerita evaluación médica cercana",
  };
}

export async function runPreventIaAgent(
  payload: ClinicalTriggerPayload,
  breakdown: HealthScoreBreakdown,
): Promise<PreventIaResult> {
  const generated =
    (await generateWithClaude(payload.offchain, breakdown)) ??
    generateWithTemplate(payload.offchain, breakdown);

  return {
    healthScore: breakdown.healthScore,
    riskLevel: breakdown.riskLevel,
    scoreExplanation: breakdown.scoreExplanation,
    patientRecommendation: generated.patientRecommendation,
    clinicalSummary: generated.clinicalSummary,
    followUp: decideFollowUp(breakdown),
    historyMissing: breakdown.historyMissing,
  };
}
