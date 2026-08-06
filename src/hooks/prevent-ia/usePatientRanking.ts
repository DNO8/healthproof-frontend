"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPatientRanking } from "@/actions/prevent-ia/get-patient-ranking";
import { isAuthSuccess } from "@/lib/auth/with-auth";
import type { RankedPatient } from "@/services/prevent-ia/patients";

const CACHE_KEY = "hp_prevent_ia_ranking";
const CACHE_ERROR_KEY = "hp_prevent_ia_ranking_error";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedRanking {
  patients: RankedPatient[];
  ts: number;
}

function getCached(): RankedPatient[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRanking;
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.patients;
  } catch {
    return null;
  }
}

function setCache(patients: RankedPatient[]) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ patients, ts: Date.now() } satisfies CachedRanking),
    );
  } catch {
    /* ignore */
  }
}

/** Solo se debe habilitar (`enabled: true`) para roles doctor/certifier — ver `dashboard/prevent-ia/page.tsx`. */
export function usePatientRanking(enabled: boolean) {
  const [patients, setPatients] = useState<RankedPatient[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);
  const fetchedRef = useRef(false);

  const refetch = useCallback(async () => {
    if (!enabled) {
      setPatients([]);
      setLoading(false);
      return;
    }

    const cached = getCached();
    if (cached) {
      setPatients(cached);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const lastErr = sessionStorage.getItem(CACHE_ERROR_KEY);
      if (lastErr && Date.now() - Number.parseInt(lastErr, 10) < 30_000) {
        console.warn("[usePatientRanking] In error cooldown, skipping");
        setLoading(false);
        return;
      }
    } catch {
      /* ignore */
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;
    fetchedRef.current = true;

    setLoading(true);
    setError(null);
    try {
      const response = await getPatientRanking({});
      if (isAuthSuccess(response)) {
        setPatients(response.data.patients);
        setCache(response.data.patients);
        try {
          sessionStorage.removeItem(CACHE_ERROR_KEY);
        } catch {
          /* ignore */
        }
      } else {
        setError(response.error);
        try {
          sessionStorage.setItem(CACHE_ERROR_KEY, String(Date.now()));
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      console.error("[usePatientRanking]", err);
      setError("No se pudo cargar el ranking de pacientes.");
      try {
        sessionStorage.setItem(CACHE_ERROR_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { patients, loading, error, refetch };
}
