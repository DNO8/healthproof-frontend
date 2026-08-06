import "server-only";

import { logger } from "@/lib/logger";
import { ABDOMINAL_ULTRASOUND_LOINC_SUBSET } from "./imaging-loinc-subset";
import {
  ApiLoincProvider,
  CachedLoincProvider,
  LocalLoincProvider,
} from "./loinc-api";
import type { LoincEntry, LoincSearchResult } from "./types";

const apiProvider = new CachedLoincProvider(new ApiLoincProvider());

export interface ImagingSuggestion {
  code: string;
  system: string;
  display: string;
}

export async function buildImagingSuggestions(
  rawName: string,
  proposedLoinc?: string | null,
): Promise<{ options: ImagingSuggestion[]; apiFailed: boolean }> {
  const options = new Map<string, ImagingSuggestion>();
  let apiFailed = false;

  // Always include local subset matches first.
  const localMatches = await new LocalLoincProvider(
    ABDOMINAL_ULTRASOUND_LOINC_SUBSET,
  ).search(rawName, { limit: 4, language: "es" });
  for (const entry of localMatches) {
    options.set(entry.code, toSuggestion(entry));
  }

  // Query the LOINC API directly; if it fails, keep the local subset and flag it.
  const queries = [rawName, proposedLoinc].filter(
    (q): q is string => typeof q === "string" && q.trim().length > 0,
  );

  for (const query of queries) {
    try {
      const entries = await apiProvider.search(query, {
        limit: 4,
        language: "es",
      });
      for (const entry of entries) {
        options.set(entry.code, toSuggestion(entry));
      }
    } catch (err) {
      apiFailed = true;
      logger.warn(
        { query, error: err instanceof Error ? err.message : String(err) },
        "buildImagingSuggestions: LOINC API failed, using local subset",
      );
    }
  }

  return { options: Array.from(options.values()), apiFailed };
}

function toSuggestion(entry: LoincEntry): ImagingSuggestion {
  return {
    code: entry.code,
    system: "http://loinc.org",
    display: entry.spanishDisplay || entry.display || entry.code,
  };
}

export type { LoincSearchResult };
