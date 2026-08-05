/**
 * Rangos de referencia clínicos, indexados por código LOINC.
 *
 * MVP: hardcodeado con umbrales clínicos reales y reconocidos (ADA para
 * glicemia, NCEP ATP III para LDL) — nunca umbrales inventados.
 *
 * Reemplazo futuro: sustituir esta tabla por `retrieveContextForCategories()`
 * (`src/services/fhir-rag/embed.ts`), ya implementado en este repo, cuando
 * haya `OPENAI_API_KEY` + Supabase reales disponibles — no antes, para no
 * bloquear la demo por falta de credenciales.
 */

export type Band = "normal" | "borderline" | "high" | "veryHigh";

export interface BandDefinition {
  band: Band;
  label: string;
  /** Límite inferior inclusivo (sin límite si se omite). */
  min?: number;
  /** Límite superior exclusivo (sin límite si se omite). */
  max?: number;
  /** Cuánto castiga el Health Score estar en esta banda (0 = no penaliza). */
  scorePenalty: number;
}

export interface ReferenceRangeConfig {
  loincCode: string;
  examType: string;
  unit: string;
  bands: BandDefinition[];
}

export const REFERENCE_RANGES: Record<string, ReferenceRangeConfig> = {
  // Glicemia en ayunas — criterio ADA (American Diabetes Association)
  "1558-6": {
    loincCode: "1558-6",
    examType: "Glicemia en ayunas",
    unit: "mg/dL",
    bands: [
      { band: "normal", label: "normal", max: 100, scorePenalty: 0 },
      {
        band: "borderline",
        label: "prediabetes (glicemia alterada en ayunas)",
        min: 100,
        max: 126,
        scorePenalty: 10,
      },
      {
        band: "high",
        label: "rango diabetes",
        min: 126,
        scorePenalty: 18,
      },
    ],
  },
  // Colesterol LDL — criterio NCEP ATP III
  "13457-7": {
    loincCode: "13457-7",
    examType: "Colesterol LDL",
    unit: "mg/dL",
    bands: [
      { band: "normal", label: "óptimo", max: 100, scorePenalty: 0 },
      {
        band: "normal",
        label: "casi óptimo",
        min: 100,
        max: 130,
        scorePenalty: 8,
      },
      {
        band: "borderline",
        label: "límite alto",
        min: 130,
        max: 160,
        scorePenalty: 20,
      },
      { band: "high", label: "alto", min: 160, max: 190, scorePenalty: 35 },
      { band: "veryHigh", label: "muy alto", min: 190, scorePenalty: 47 },
    ],
  },
};

export function getReferenceRange(
  loincCode: string,
): ReferenceRangeConfig | undefined {
  return REFERENCE_RANGES[loincCode];
}

export function classifyValue(
  loincCode: string,
  value: number,
): BandDefinition {
  const config = getReferenceRange(loincCode);
  if (!config) {
    // Sin rango conocido: no inventamos umbral, tratamos como normal pero
    // el resumen clínico debe reflejar esta limitación (ver agent.ts).
    return {
      band: "normal",
      label: "sin rango de referencia",
      scorePenalty: 0,
    };
  }
  const match = config.bands.find((b) => {
    const aboveMin = b.min === undefined || value >= b.min;
    const belowMax = b.max === undefined || value < b.max;
    return aboveMin && belowMax;
  });
  return match ?? config.bands[config.bands.length - 1];
}
