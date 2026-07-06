"use client";

import { PHI_PLACEHOLDER } from "./phi-placeholders";
import type { DetectedEntity, PhiMap } from "./types";

const RUT_WITH_DOTS = /\b\d{1,2}(?:\.\d{3}){2}-[\dkK]\b/g;
const RUT_PLAIN = /\b\d{7,8}-[\dkK]\b/g;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE =
  /\+?\b(?:56\s?)?(?:9\s?\d{4}\s?\d{4}|\d{2}\s?\d{4}\s?\d{4}|2\s?\d{4}\s?\d{4})\b/g;
const DATE_YYYY_MM_DD = /\b\d{4}-\d{2}-\d{2}\b/g;
const DATE_DD_MM_YYYY = /\b\d{2}[/\-.]\d{2}[/\-.]\d{4}\b/g;

const NAME_LABELS = [
  "paciente",
  "nombre",
  "paciente:",
  "nombre:",
  "sr.",
  "sra.",
  "srta.",
  "señor",
  "señora",
];

export interface PhiDetectorOptions {
  /** Extract address, phone, email. Default true. */
  extractContact?: boolean;
  /** Extract birth date. Default true. */
  extractBirthDate?: boolean;
  /** Number of lines considered header at the top of the document. */
  headerLines?: number;
}

/**
 * Detects PHI entities in a medical document text.
 *
 * The detector is designed to run entirely in the browser. It returns a list of
 * detected entities and a normalized PHI map. The returned entities are ordered by
 * length (longest first) so consumers can safely replace them without overlapping.
 */
export function detectPhi(
  text: string,
  options: PhiDetectorOptions = {},
): {
  entities: DetectedEntity[];
  phiMap: PhiMap;
} {
  const {
    extractContact = true,
    extractBirthDate = true,
    headerLines = 25,
  } = options;
  const entities: DetectedEntity[] = [];
  const seen = new Set<string>();

  const addEntity = (entity: DetectedEntity) => {
    const key = `${entity.placeholder}:${entity.normalized ?? entity.original}`;
    if (seen.has(key)) return;
    seen.add(key);
    entities.push(entity);
  };

  // 1. RUT — prefer the first valid RUT in the header or near a patient label
  const rutMatches = Array.from(
    text.matchAll(
      new RegExp(`${RUT_WITH_DOTS.source}|${RUT_PLAIN.source}`, "g"),
    ),
  );
  const headerRuts = rutMatches.filter(
    (m) =>
      (m.index ?? 0) < text.split("\n").slice(0, headerLines).join("\n").length,
  );
  const patientRut =
    headerRuts.find((m) => isNearPatientLabel(text, m.index ?? 0)) ??
    rutMatches.find((m) => isNearPatientLabel(text, m.index ?? 0)) ??
    headerRuts[0] ??
    rutMatches[0];

  if (patientRut) {
    const raw = patientRut[0];
    const normalized = normalizeRut(raw);
    if (isValidRut(normalized)) {
      addEntity({
        placeholder: PHI_PLACEHOLDER.RUT,
        original: raw,
        normalized,
        context: extractContext(text, patientRut.index ?? 0),
        confidence: 0.98,
      });
    }
  }

  // 2. Name (patient)
  const nameEntity = detectPatientName(text, headerLines);
  if (nameEntity) {
    addEntity(nameEntity);
  }

  // 3. Birth date
  if (extractBirthDate) {
    const birthDate = detectBirthDate(text);
    if (birthDate) {
      addEntity({
        placeholder: PHI_PLACEHOLDER.BIRTH_DATE,
        original: birthDate.raw,
        normalized: birthDate.normalized,
        context: birthDate.context,
        confidence: birthDate.confidence,
      });
    }
  }

  // 4. Contact info (header only, and only near patient/contact labels)
  if (extractContact) {
    const headerText = text.split("\n").slice(0, headerLines).join("\n");

    for (const match of headerText.matchAll(EMAIL)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (!isNearLabel(headerText, start, CONTACT_LABELS, 40, end)) continue;
      addEntity({
        placeholder: PHI_PLACEHOLDER.EMAIL,
        original: match[0],
        context: extractContext(headerText, start),
        confidence: 0.95,
      });
    }

    for (const match of headerText.matchAll(PHONE)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (!isNearLabel(headerText, start, CONTACT_LABELS, 40, end)) continue;
      addEntity({
        placeholder: PHI_PLACEHOLDER.PHONE,
        original: match[0],
        context: extractContext(headerText, start),
        confidence: 0.85,
      });
    }

    const address = detectAddress(headerText);
    if (address) {
      const addressEnd = address.index + address.raw.length;
      if (
        isNearLabel(headerText, address.index, CONTACT_LABELS, 40, addressEnd)
      ) {
        addEntity({
          placeholder: PHI_PLACEHOLDER.ADDRESS,
          original: address.raw,
          context: address.context,
          confidence: 0.6,
        });
      }
    }
  }

  // Sort by length (longest first) to avoid partial replacements
  entities.sort((a, b) => b.original.length - a.original.length);

  const phiMap: PhiMap = {};
  for (const entity of entities) {
    phiMap[entity.placeholder] = entity.original;
  }

  return { entities, phiMap };
}

export function normalizeRut(rut: string): string {
  return rut.replace(/\./g, "").replace(/\s/g, "").toLowerCase();
}

export function isValidRut(rut: string): boolean {
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

const PATIENT_LABELS = [
  "paciente",
  "rut",
  "run",
  "rut paciente",
  "run paciente",
  "paciente:",
  "rut:",
  "run:",
];

const CONTACT_LABELS = [
  "email",
  "correo",
  "e-mail",
  "teléfono",
  "telefono",
  "fono",
  "celular",
  "móvil",
  "movil",
  "dirección",
  "direccion",
  "domicilio",
  "contacto",
  "contacto:",
  "email:",
  "correo:",
  "tel:",
  "dir:",
];

function isNearLabel(
  text: string,
  index: number,
  labels: string[],
  radius = 40,
  matchEnd?: number,
): boolean {
  const end = matchEnd ?? index;
  const before = text.slice(Math.max(0, index - radius), index).toLowerCase();
  const after = text
    .slice(end, Math.min(text.length, end + radius))
    .toLowerCase();
  return labels.some(
    (label) => before.includes(label) || after.includes(label),
  );
}

const NON_PATIENT_LABELS = [
  "lab",
  "laboratorio",
  "laboratorio:",
  "emisor",
  "emisor:",
  "issuer",
  "clínica",
  "clinica",
  "clínica:",
  "clinica:",
  "medico",
  "médico",
  "doctor",
  "prestador",
];

function isNearPatientLabel(text: string, index: number, radius = 40): boolean {
  const context = extractContext(text, index, radius).toLowerCase();
  const hasPatientLabel = PATIENT_LABELS.some((label) =>
    context.includes(label),
  );
  const hasNonPatientLabel = NON_PATIENT_LABELS.some((label) =>
    context.includes(label),
  );
  return hasPatientLabel && !hasNonPatientLabel;
}

function detectPatientName(
  text: string,
  headerLines: number,
): DetectedEntity | null {
  const lines = text.split("\n");
  const header = lines.slice(0, headerLines);

  // Strategy 1: label-based
  for (const line of header) {
    const lower = line.toLowerCase();
    for (const label of NAME_LABELS) {
      const index = lower.indexOf(label);
      if (index === -1) continue;
      const after = line
        .slice(index + label.length)
        .replace(/[:-]/, "")
        .trim();
      const name = cleanName(after);
      if (name && name.split(/\s+/).length >= 2) {
        return {
          placeholder: PHI_PLACEHOLDER.NAME,
          original: name,
          context: line,
          confidence: 0.85,
        };
      }
    }
  }

  // Strategy 2: top-center heuristic: look for a line with 2-4 capitalized words
  for (const line of header) {
    const cleaned = line.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]/g, "").trim();
    const words = cleaned.split(/\s+/).filter((w) => w.length >= 2);
    if (
      words.length >= 2 &&
      words.length <= 5 &&
      words.every((w) => /^[A-ZÁÉÍÓÚÑÜ]/.test(w))
    ) {
      const name = words.join(" ");
      if (name.length > 7) {
        return {
          placeholder: PHI_PLACEHOLDER.NAME,
          original: name,
          context: line,
          confidence: 0.55,
        };
      }
    }
  }

  return null;
}

function cleanName(raw: string): string | null {
  const cleaned = raw.replace(/\d+/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length < 5) return null;
  return cleaned;
}

function detectBirthDate(text: string): {
  raw: string;
  normalized: string;
  context: string;
  confidence: number;
} | null {
  const lines = text.split("\n");
  const header = lines.slice(0, 30).join("\n");
  const birthLabels = [
    "fecha de nacimiento",
    "nacimiento",
    "f. nac.",
    "nac.",
    "fecha nacimiento",
  ];

  // Look for a date near a label
  for (const label of birthLabels) {
    const index = header.toLowerCase().indexOf(label);
    if (index === -1) continue;
    const window = header.slice(index, index + 80);
    const date = findFirstDate(window);
    if (date) {
      return {
        raw: date.raw,
        normalized: date.normalized,
        context: window.split("\n")[0] ?? window,
        confidence: 0.9,
      };
    }
  }

  // No fallback: birth date should only be detected when explicitly labeled.
  return null;
}

function findFirstDate(
  text: string,
): { raw: string; normalized: string } | null {
  for (const match of text.matchAll(DATE_DD_MM_YYYY)) {
    const normalized = normalizeDate(match[0]);
    if (normalized) return { raw: match[0], normalized };
  }
  for (const match of text.matchAll(DATE_YYYY_MM_DD)) {
    return { raw: match[0], normalized: match[0] };
  }
  return null;
}

function normalizeDate(raw: string): string | null {
  const parts = raw.split(/[/\-.]/);
  if (parts.length !== 3) return null;
  if (parts[0].length === 4) return raw;
  const [day, month, year] = parts;
  return `${year}-${month}-${day}`;
}

function detectAddress(text: string): {
  raw: string;
  context: string;
  index: number;
} | null {
  const lines = text.split("\n");
  let globalOffset = 0;
  const addressLabels = [
    "dirección",
    "direccion",
    "domicilio",
    "dirección:",
    "direccion:",
    "domicilio:",
  ];
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const label of addressLabels) {
      const labelIndex = lower.indexOf(label);
      if (labelIndex === -1) continue;
      const after = line
        .slice(labelIndex + label.length)
        .replace(/[:-]/, "")
        .trim();
      if (after.length > 8 && /\d/.test(after)) {
        return {
          raw: after,
          context: line,
          index: globalOffset + labelIndex,
        };
      }
    }
    globalOffset += line.length + 1; // +1 for newline
  }
  return null;
}

function extractContext(text: string, index: number, radius = 60): string {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}
