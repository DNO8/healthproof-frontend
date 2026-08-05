"use server";

/**
 * Ranking 0-100 de pacientes mock (más riesgo primero) — vista doctor/certifier.
 *
 * El filtrado de rol (solo doctor/certifier pueden ver esta tabla) se hace en
 * la página (`dashboard/prevent-ia/page.tsx`) vía `useOnChainRole`, con el
 * mismo nivel de rigor que el resto de las vistas del dashboard: esta acción
 * solo exige autenticación (`withAuth`), no valida el rol on-chain del
 * llamante.
 *
 * `patients-db.json` es demo (ver `src/services/prevent-ia/mock/README.md`).
 * Al conectar datos reales, se reemplaza por una consulta a documentos
 * descifrados del paciente/red, no por una tabla estática.
 */
import type { AuthContext } from "@/lib/auth/with-auth";
import { withAuth } from "@/lib/auth/with-auth";
import {
  getRankedPatients,
  type RankedPatient,
} from "@/services/prevent-ia/patients";

type GetPatientRankingParams = Record<string, never>;

export interface GetPatientRankingResponse {
  patients: RankedPatient[];
}

async function getPatientRankingHandler(
  _data: GetPatientRankingParams,
  _auth: AuthContext,
): Promise<GetPatientRankingResponse> {
  const patients = await getRankedPatients();
  return { patients };
}

export const getPatientRanking = withAuth(getPatientRankingHandler, {
  rateLimit: { windowMs: 60000, maxRequests: 20 },
});
