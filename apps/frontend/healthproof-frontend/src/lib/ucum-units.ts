/**
 * UCUM unit normalization.
 * Shared between client and server.
 */

const UCUM_UNIT_MAP: Record<string, string> = {
  mm: "mm",
  "mm.": "mm",
  cm: "cm",
  "cm.": "cm",
  ml: "mL",
  mL: "mL",
  "ml.": "mL",
  "mL.": "mL",
  g: "g",
  "g.": "g",
  grams: "g",
  gr: "g",
  grs: "g",
  kg: "kg",
  "kg.": "kg",
  mg: "mg",
  "mg.": "mg",
  cm2: "cm2",
  "cm²": "cm2",
  cm3: "cm3",
  "cm³": "cm3",
};

export function toUcum(unit: string): string | null {
  if (!unit) return null;
  const normalized = unit.trim().toLowerCase().replace(/\s+/g, "");
  const mapped = UCUM_UNIT_MAP[normalized] ?? UCUM_UNIT_MAP[unit.trim()];
  return mapped ?? null;
}

export function normalizeUcumForDisplay(unit: string): string {
  const ucum = toUcum(unit);
  return ucum ?? unit.trim();
}
