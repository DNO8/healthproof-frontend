"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AnalyzeDocumentResponse,
  analyzeDocument,
  type ScenarioKey,
} from "@/actions/prevent-ia/analyze-document";
import { isAuthSuccess } from "@/lib/auth/with-auth";

const CACHE_KEY = "hp_prevent_ia_analysis";
const CACHE_ERROR_KEY = "hp_prevent_ia_analysis_error";
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedAnalysis {
  scenario: ScenarioKey;
  data: AnalyzeDocumentResponse;
  ts: number;
}

function getCached(scenario: ScenarioKey): AnalyzeDocumentResponse | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedAnalysis;
    if (parsed.scenario !== scenario) return null;
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setCache(scenario: ScenarioKey, data: AnalyzeDocumentResponse) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        scenario,
        data,
        ts: Date.now(),
      } satisfies CachedAnalysis),
    );
  } catch {
    /* ignore */
  }
}

export function usePreventIaAnalysis(scenario: ScenarioKey) {
  const [data, setData] = useState<AnalyzeDocumentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const refetch = useCallback(async () => {
    const cached = getCached(scenario);
    if (cached) {
      setData(cached);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const lastErr = sessionStorage.getItem(CACHE_ERROR_KEY);
      if (lastErr && Date.now() - Number.parseInt(lastErr, 10) < 30_000) {
        console.warn("[usePreventIaAnalysis] In error cooldown, skipping");
        setLoading(false);
        return;
      }
    } catch {
      /* ignore */
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    setLoading(true);
    setError(null);
    try {
      const response = await analyzeDocument({ scenario });
      if (isAuthSuccess(response)) {
        setData(response.data);
        setCache(scenario, response.data);
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
      console.error("[usePreventIaAnalysis]", err);
      setError("No se pudo analizar el escenario.");
      try {
        sessionStorage.setItem(CACHE_ERROR_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [scenario]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
