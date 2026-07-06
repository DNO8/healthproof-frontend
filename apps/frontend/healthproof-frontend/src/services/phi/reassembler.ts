"use client";

import { PHI_PLACEHOLDER } from "./phi-placeholders";
import type { PhiMap, ReassemblyResult } from "./types";

/**
 * Reinserts original PHI values into a FHIR bundle by replacing placeholders.
 *
 * The function walks the bundle recursively. It returns the new bundle, the list
 * of placeholder keys that were replaced, and the list of placeholders that were
 * not found in the provided PhiMap (so the UI can warn the user).
 *
 * This function is intentionally pure and does not mutate the input.
 */
export function reassemblePhiInBundle(
  bundle: unknown,
  phiMap: PhiMap,
): ReassemblyResult {
  const replaced = new Set<string>();
  const missing = new Set<string>();
  const placeholderValues = Object.values(PHI_PLACEHOLDER);

  const replacer = (value: unknown): unknown => {
    if (typeof value === "string") {
      let result = value;
      for (const placeholder of placeholderValues) {
        if (!result.includes(placeholder)) continue;
        const original = phiMap[placeholder];
        if (original) {
          result = result.replaceAll(placeholder, original);
          replaced.add(placeholder);
        } else {
          missing.add(placeholder);
        }
      }
      return result;
    }

    if (Array.isArray(value)) {
      return value.map(replacer);
    }

    if (value !== null && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = replacer(val);
      }
      return result;
    }

    return value;
  };

  return {
    bundle: replacer(bundle),
    replaced: Array.from(replaced),
    missing: Array.from(missing),
  };
}

/**
 * Returns a list of placeholders that are present in the bundle but not in the
 * PhiMap. Useful to show a warning before publishing.
 */
export function findMissingPhiPlaceholders(
  bundle: unknown,
  phiMap: PhiMap,
): string[] {
  const result = reassemblePhiInBundle(bundle, phiMap);
  return result.missing;
}
