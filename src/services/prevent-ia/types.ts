/**
 * Tipos del dominio de Prevent IA.
 *
 * `OnChainMedicalDocument` replica campo a campo el struct real `MedicalDocument`
 * de `MedicalDocumentRegistry.sol` (HealthProof, branch `prevent_ia`), para que
 * mover este código al repo real sea un port directo, no un rediseño.
 *
 *   struct MedicalDocument {
 *     address patient;
 *     address issuer;
 *     address institution;
 *     bytes32 documentType;
 *     bytes32 clinicalHash;
 *     bytes32 episodeId;
 *     string cid;
 *     bytes32 standard;
 *     bytes32 classification;
 *     uint64 createdAt;
 *   }
 *
 * En el mock, los campos `bytes32`/`address` viajan como string (hex simulado)
 * en vez de tipos on-chain reales — es la única adaptación necesaria para
 * poder invocar el agente sin un cliente Web3.
 */
export interface OnChainMedicalDocument {
  documentId: string;
  patient: string;
  issuer: string;
  institution: string;
  documentType: string;
  clinicalHash: string;
  episodeId: string;
  cid: string;
  standard: string;
  classification: string;
  createdAt: string;
}

/** Contenido clínico off-chain (hoy cifrado en Supabase/IPFS; en claro en el mock). */
export interface ClinicalResult {
  examType: string;
  loincCode: string;
  value: number;
  unit: string;
  referenceRange: string;
}

export interface PatientHistoryEntry {
  date: string;
  value: number;
  unit: string;
}

/** Nivel de riesgo derivado del Health Score — solo para presentación en la UI. */
export type RiskLevel = "bajo" | "moderado" | "alto";

/** Payload que recibe el agente — misma forma que un escenario de `mock/mock-clinical-results.json`. */
export interface ClinicalTriggerPayload {
  onchain: OnChainMedicalDocument;
  offchain: ClinicalResult;
  historialPrevio: PatientHistoryEntry[];
}

/** Seguimiento sugerido — opcional, no por defecto. */
export interface FollowUp {
  suggested: boolean;
  when?: string;
  reason?: string;
}

/** Salida del agente. */
export interface PreventIaResult {
  healthScore: number;
  riskLevel: RiskLevel;
  scoreExplanation: string;
  patientRecommendation: string;
  clinicalSummary: string;
  followUp: FollowUp;
  historyMissing: boolean;
}
