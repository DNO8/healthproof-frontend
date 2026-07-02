import { z } from "zod";

export interface ExtractedExam {
  rawName: string;
  value: string;
  unit?: string | null;
  refRange?: string | null;
  method?: string | null;
  confidence: number;
}

export interface ExtractedDoc {
  patient: {
    name?: string | null;
    rut?: string | null;
    birthDate?: string | null;
  };
  issuer?: {
    name?: string | null;
    date?: string | null;
  };
  exams: ExtractedExam[];
}

export interface LoincMapping {
  rawName: string;
  loincCode?: string | null;
  display?: string | null;
  confirmed: boolean;
}

export interface MissingField {
  examIndex: number;
  field: string;
  reason: string;
}

export interface AuditReport {
  mappings: LoincMapping[];
  missing: MissingField[];
  warnings: string[];
  mustSupportTotal: number;
  mustSupportFilled: number;
}

export interface LabFilledFields {
  [key: string]: string;
}

export type FhirResource = {
  resourceType: "DiagnosticReport" | "Observation";
  [key: string]: unknown;
};

export interface FhirBundle {
  resourceType: "Bundle";
  type: "collection";
  entry: Array<{ resource: FhirResource }>;
}

export interface GenerateResult {
  bundle: FhirBundle;
  compliance: {
    score: number;
    mustSupportTotal: number;
    mustSupportFilled: number;
    guiaVersion: "CL-Core-1.8.4_CLIPS-0.2.0";
  };
}

export interface HybridUploadResult {
  fileHash: string;
  ipfs: { cid: string };
  iv: string;
  encryptedKeys: Record<string, { data: string; iv: string }>;
  uploaderPublicKey: string;
}

export interface HybridRecipient {
  wallet: string;
  publicKeyJwk: string;
}

export interface ManualExamRow {
  id?: string;
  rawName: string;
  value: string;
  unit?: string;
  refRange?: string;
  method?: string;
}

export interface ManualHeader {
  patientName?: string;
  patientRut?: string;
  patientBirthDate?: string;
  issuerName?: string;
  issuedDate?: string;
}

export const RUT_SYSTEM = "https://www.registrocivil.cl/run";
export const FHIR_GUIDE_VERSION = "CL-Core-1.8.4_CLIPS-0.2.0" as const;

export function isValidUuidV4(value: string): boolean {
  const re =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(value);
}

export const extractedExamSchema = z.object({
  rawName: z.string().min(1),
  value: z.string().min(1),
  unit: z.string().nullable().optional(),
  refRange: z.string().nullable().optional(),
  method: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
});

export const extractedDocSchema = z.object({
  patient: z.object({
    name: z.string().nullable().optional(),
    rut: z.string().nullable().optional(),
    birthDate: z.string().nullable().optional(),
  }),
  issuer: z
    .object({
      name: z.string().nullable().optional(),
      date: z.string().nullable().optional(),
    })
    .optional(),
  exams: z.array(extractedExamSchema),
});

export const loincMappingSchema = z.object({
  rawName: z.string().min(1),
  loincCode: z.string().nullable().optional(),
  display: z.string().nullable().optional(),
  confirmed: z.boolean(),
});

export const missingFieldSchema = z.object({
  examIndex: z.number().int().nonnegative(),
  field: z.string().min(1),
  reason: z.string().min(1),
});

export const auditReportSchema = z.object({
  mappings: z.array(loincMappingSchema),
  missing: z.array(missingFieldSchema),
  warnings: z.array(z.string()),
  mustSupportTotal: z.number().int().nonnegative().default(0),
  mustSupportFilled: z.number().int().nonnegative().default(0),
});

export const fhirResourceSchema = z
  .object({
    resourceType: z.enum(["DiagnosticReport", "Observation"]),
  })
  .passthrough();

export const fhirBundleSchema = z.object({
  resourceType: z.literal("Bundle"),
  type: z.enum(["collection"]),
  entry: z.array(
    z.object({
      resource: fhirResourceSchema,
    }),
  ),
});

export const generateResultSchema = z.object({
  bundle: fhirBundleSchema,
  compliance: z
    .object({
      score: z.number().min(0).max(1),
      mustSupportTotal: z.number().int().nonnegative(),
      mustSupportFilled: z.number().int().nonnegative(),
      guiaVersion: z.literal("CL-Core-1.8.4_CLIPS-0.2.0"),
    })
    .optional(),
});

export function isValidChileanRut(rut: string): boolean {
  const cleaned = rut.replace(/[.]/g, "").replace(/\s/g, "").toLowerCase();
  if (!/^\d{1,8}-[\dk]$/.test(cleaned)) return false;
  const [body, dv] = cleaned.split("-");
  let sum = 0;
  let multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const expected = 11 - (sum % 11);
  const expectedDv =
    expected === 11 ? "0" : expected === 10 ? "k" : String(expected);
  return dv === expectedDv;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}
