"use client";

import { detectPhi } from "./detector";
import type { PHI_PLACEHOLDER } from "./phi-placeholders";
import type { PhiMap, RedactedTextResult } from "./types";

export interface RedactorOptions {
  /** If true, only redacts the entities listed in these placeholder keys. */
  include?: Array<(typeof PHI_PLACEHOLDER)[keyof typeof PHI_PLACEHOLDER]>;
  /** If true, skips redaction of these placeholder keys. */
  exclude?: Array<(typeof PHI_PLACEHOLDER)[keyof typeof PHI_PLACEHOLDER]>;
}

/**
 * Redacts PHI from medical document text by replacing detected values with
 * placeholders.
 *
 * The returned `phiMap` is ordered by placeholder type. Consumers should keep it
 * in memory only and reinsert values into the FHIR bundle locally before
 * publication.
 */
export function redactPhi(
  text: string,
  options: RedactorOptions = {},
): RedactedTextResult {
  const { entities, phiMap } = detectPhi(text);
  const includeSet = options.include ? new Set(options.include) : null;
  const excludeSet = options.exclude ? new Set(options.exclude) : null;

  let redactedText = text;

  for (const entity of entities) {
    if (includeSet && !includeSet.has(entity.placeholder)) continue;
    if (excludeSet?.has(entity.placeholder)) continue;

    // Escape special regex characters in the original value
    const escaped = entity.original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "g");
    redactedText = redactedText.replace(regex, entity.placeholder);
  }

  return {
    originalText: text,
    redactedText,
    phiMap,
    entities,
  };
}

/**
 * Redacts only the known values from an existing PhiMap. Useful when the caller
 * already has a map and wants to redact a second piece of text (e.g. after user
 * edits) without re-running detection.
 */
export function redactFromMap(text: string, phiMap: PhiMap): string {
  let redactedText = text;
  const entries = Object.entries(phiMap).filter(
    ([, value]) => value && value.length > 0,
  ) as Array<[string, string]>;
  // Sort by value length descending to avoid partial replacements
  entries.sort(([, a], [, b]) => b.length - a.length);

  for (const [placeholder, original] of entries) {
    const escaped = original.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "g");
    redactedText = redactedText.replace(regex, placeholder);
  }

  return redactedText;
}

/**
 * Returns a new PhiMap that only contains the entries requested by the caller.
 */
export function filterPhiMap(
  phiMap: PhiMap,
  keys: Array<(typeof PHI_PLACEHOLDER)[keyof typeof PHI_PLACEHOLDER]>,
): PhiMap {
  const result: PhiMap = {};
  for (const key of keys) {
    const value = phiMap[key];
    if (value) result[key] = value;
  }
  return result;
}
