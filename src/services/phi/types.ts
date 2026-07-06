import type { PHI_PLACEHOLDER } from "./phi-placeholders";

export type PhiMap = Partial<
  Record<(typeof PHI_PLACEHOLDER)[keyof typeof PHI_PLACEHOLDER], string>
>;

export interface DetectedEntity {
  placeholder: (typeof PHI_PLACEHOLDER)[keyof typeof PHI_PLACEHOLDER];
  original: string;
  /** Normalized form, e.g. RUT without dots. */
  normalized?: string;
  /** Source line or context, useful for debugging. */
  context?: string;
  /** Confidence 0-1. */
  confidence: number;
}

export interface RedactedTextResult {
  originalText: string;
  redactedText: string;
  phiMap: PhiMap;
  entities: DetectedEntity[];
}

export interface ReassemblyResult {
  bundle: unknown;
  replaced: string[];
  missing: string[];
}
