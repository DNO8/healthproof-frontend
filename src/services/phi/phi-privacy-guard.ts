import "server-only";

import { PHI_PLACEHOLDER } from "./phi-placeholders";

export interface PhiLeakCheckResult {
  safe: boolean;
  leaked: string[];
}

const RUT_WITH_DOTS = /\b\d{1,2}(?:\.\d{3}){2}-[\dkK]\b/g;
const RUT_PLAIN = /\b\d{7,8}-[\dkK]\b/g;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

function normalizeRut(rut: string): string {
  return rut.replace(/\./g, "").replace(/\s/g, "").toLowerCase();
}

function isValidRut(rut: string): boolean {
  const normalized = normalizeRut(rut);
  const match = normalized.match(/^(\d+)-([\dk])$/);
  if (!match) return false;
  const body = match[1];
  const verifier = match[2];
  if (body.length < 7 || body.length > 8) return false;

  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = sum % 11;
  const expectedDigit = 11 - remainder;
  let expectedVerifier: string;
  if (expectedDigit === 11) expectedVerifier = "0";
  else if (expectedDigit === 10) expectedVerifier = "k";
  else expectedVerifier = String(expectedDigit);

  return verifier === expectedVerifier;
}

/**
 * Checks whether a payload contains real PHI (not placeholders). This is a
 * defense-in-depth validation that runs server-side before sending data to AI.
 *
 * It currently checks for Chilean RUTs and emails. Phone numbers and addresses
 * are deliberately omitted because they are too prone to false positives with
 * clinical values.
 */
export function checkForPhiLeak(payload: unknown): PhiLeakCheckResult {
  const text = typeof payload === "string" ? payload : JSON.stringify(payload);
  const leaked = new Set<string>();

  const placeholderValues = Object.values(PHI_PLACEHOLDER);
  const stripped = text.replace(
    new RegExp(
      placeholderValues
        .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|"),
      "g",
    ),
    "",
  );

  const rutCandidates = [
    ...(stripped.match(RUT_WITH_DOTS) ?? []),
    ...(stripped.match(RUT_PLAIN) ?? []),
  ];
  for (const candidate of rutCandidates) {
    if (isValidRut(normalizeRut(candidate))) {
      leaked.add(candidate);
    }
  }

  const emails = stripped.match(EMAIL) ?? [];
  for (const email of emails) {
    leaked.add(email);
  }

  return { safe: leaked.size === 0, leaked: Array.from(leaked) };
}
