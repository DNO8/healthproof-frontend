"use server";

import { type AuthContext, withAuth } from "@/lib/auth/with-auth";
import { logger } from "@/lib/logger";
import { ABDOMINAL_ULTRASOUND_LOINC_SUBSET } from "@/services/loinc/imaging-loinc-subset";
import {
  CHILE_LOINC_SUBSET,
  OBSTETRIC_LOINC_SUBSET,
} from "@/services/fhir-rag/loinc-subset";
import {
  ApiLoincProvider,
  CachedLoincProvider,
  LocalLoincProvider,
} from "@/services/loinc/loinc-api";
import type { LoincSearchResult } from "@/services/loinc/types";

interface SearchLoincData {
  query: string;
  sessionId: string;
  _privyToken?: string;
}

const apiProvider = new CachedLoincProvider(new ApiLoincProvider());
const localProvider = new LocalLoincProvider([
  ...CHILE_LOINC_SUBSET,
  ...OBSTETRIC_LOINC_SUBSET,
  ...ABDOMINAL_ULTRASOUND_LOINC_SUBSET,
]);

export const searchLoincCodes = withAuth(
  async (
    data: SearchLoincData,
    auth: AuthContext,
  ): Promise<LoincSearchResult | { error: string }> => {
    const { query, sessionId } = data;
    logger.info(
      { sessionId, actor: auth.wallet.toLowerCase(), query },
      "searchLoincCodes started",
    );

    if (typeof query !== "string" || query.trim().length === 0) {
      return { error: "EmptyPayload" };
    }

    let apiResults: Awaited<ReturnType<typeof apiProvider.search>> = [];
    try {
      apiResults = await apiProvider.search(query, {
        limit: 8,
        language: "es",
      });
    } catch (err) {
      logger.warn(
        {
          sessionId,
          query,
          error: err instanceof Error ? err.message : String(err),
        },
        "searchLoincCodes API failed, falling back to local subset",
      );
    }

    if (apiResults.length > 0) {
      return { results: apiResults, apiFailed: false };
    }

    // Fallback: local subset search when API fails or returns empty
    const localResults = await localProvider.search(query, {
      limit: 8,
      language: "es",
    });
    return { results: localResults, apiFailed: apiResults.length === 0 };
  },
  {
    rateLimit: { windowMs: 60000, maxRequests: 30 },
  },
);
