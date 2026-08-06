/**
 * Carga la "base de datos" mock de pacientes (`mock/patients-db.json`) y calcula,
 * para cada uno, su Health Score + notificación preventiva — reusando el mismo
 * motor de reglas y agente que el resto de la demo (una sola fuente de verdad).
 *
 * Universo de datos: ficticio, con una distribución de riesgo inspirada en
 * series públicas DEIS/MINSAL (ver `mock/README.md`) — no son microdatos
 * reales de ninguna persona.
 */
import "server-only";

import { runPreventIaAgent } from "./agent";
import { calculateHealthScore } from "./health-score-engine";
import patientsDb from "./mock/patients-db.json";
import type {
  ClinicalResult,
  PatientHistoryEntry,
  PreventIaResult,
} from "./types";

export interface PatientRecord {
  patientId: string;
  nombre: string;
  edad: number;
  sexo: "F" | "M";
  comuna: string;
  offchain: ClinicalResult;
  historialPrevio: PatientHistoryEntry[];
}

export interface RankedPatient extends PatientRecord {
  result: PreventIaResult;
}

const PATIENTS = (patientsDb as { pacientes: PatientRecord[] }).pacientes;

/** Ranking 0-100: el paciente con menor Health Score (más riesgo) va primero. */
export async function getRankedPatients(): Promise<RankedPatient[]> {
  const ranked = await Promise.all(
    PATIENTS.map(async (patient) => {
      const breakdown = calculateHealthScore(
        patient.offchain,
        patient.historialPrevio,
      );
      const result = await runPreventIaAgent(
        {
          onchain: {
            documentId: patient.patientId,
            patient: patient.patientId,
            issuer: "0xMockLab",
            institution: "0xMockInstitucion",
            documentType: "LAB_RESULT",
            clinicalHash: "0xmock",
            episodeId: "0xmock",
            cid: "mock://cid",
            standard: "LOINC",
            classification: "PREVENTIVO",
            createdAt: String(Date.now()),
          },
          offchain: patient.offchain,
          historialPrevio: patient.historialPrevio,
        },
        breakdown,
      );
      return { ...patient, result };
    }),
  );

  return ranked.sort((a, b) => a.result.healthScore - b.result.healthScore);
}
