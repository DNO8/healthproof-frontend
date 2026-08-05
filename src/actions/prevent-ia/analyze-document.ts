"use server";

/**
 * Corre el ciclo completo de Prevent IA (motor de Health Score + agente) sobre
 * un escenario mock con el shape exacto del trigger real (`DocumentRegistered`
 * en `MedicalDocumentRegistry`, ver `src/services/prevent-ia/types.ts`).
 *
 * Limitación de fondo: el contenido clínico se cifra en el cliente antes de
 * subirse (`document_secrets`, sin PHI en claro en servidor) — un server action
 * no puede hoy leer los valores clínicos de un documento real recién subido.
 * Por eso esta acción corre sobre escenarios mock con forma real en vez de
 * sobre un documento real; conectar el trigger real requiere primero decidir
 * dónde corre el análisis (cliente, justo después del descifrado, o con una
 * identidad propia de Prevent IA como grantee de `PermissionManager`).
 */
import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";
import { runPreventIaAgent } from "@/services/prevent-ia/agent";
import { calculateHealthScore } from "@/services/prevent-ia/health-score-engine";
import mockScenarios from "@/services/prevent-ia/mock/mock-clinical-results.json";
import type {
  ClinicalResult,
  ClinicalTriggerPayload,
  PatientHistoryEntry,
  PreventIaResult,
} from "@/services/prevent-ia/types";

export type ScenarioKey =
  | "escenario_riesgo_bajo"
  | "escenario_riesgo_en_ascenso"
  | "escenario_riesgo_alto";

const DEFAULT_SCENARIO: ScenarioKey = "escenario_riesgo_bajo";

const SCENARIOS = mockScenarios as unknown as Record<
  ScenarioKey,
  ClinicalTriggerPayload
>;

interface AnalyzeDocumentParams {
  scenario?: ScenarioKey;
}

export interface AnalyzeDocumentResponse {
  scenario: ScenarioKey;
  current: ClinicalResult;
  history: PatientHistoryEntry[];
  result: PreventIaResult;
}

async function analyzeDocumentHandler(
  data: AnalyzeDocumentParams,
  _auth: AuthContext,
): Promise<AnalyzeDocumentResponse> {
  const scenarioKey =
    data.scenario && SCENARIOS[data.scenario]
      ? data.scenario
      : DEFAULT_SCENARIO;
  const payload = SCENARIOS[scenarioKey];

  const breakdown = calculateHealthScore(
    payload.offchain,
    payload.historialPrevio,
  );
  const result = await runPreventIaAgent(payload, breakdown);

  return {
    scenario: scenarioKey,
    current: payload.offchain,
    history: payload.historialPrevio,
    result,
  };
}

export const analyzeDocument = withAuth(analyzeDocumentHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
