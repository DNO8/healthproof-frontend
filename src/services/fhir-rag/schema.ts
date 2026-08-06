import { z } from "zod";

export interface ExtractedExam {
  rawName: string;
  value?: string | null;
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

export interface ObstetricMeasurement {
  name: string;
  value?: string | null;
  unit?: string | null;
  gestationalAgeWeeks?: number | null;
  loincCode?: string | null;
  confidence: number;
}

export interface ObstetricReport {
  patient: {
    name?: string | null;
    rut?: string | null;
    birthDate?: string | null;
  };
  issuer?: {
    name?: string | null;
    date?: string | null;
  };
  gestationalAgeWeeks?: number | null;
  gestationalAgeDays?: number | null;
  amnioticFluidIndex?: string | null;
  placenta?: string | null;
  observations?: string | null;
  measurements: ObstetricMeasurement[];
}

export interface ImagingMeasurement {
  name: string;
  value?: string | null;
  unit?: string | null;
  laterality?: "left" | "right" | "bilateral" | "unspecified" | null;
  region?: string | null;
  bodySiteSnomed?: string | null;
  loincCode?: string | null;
  confidence: number;
}

export interface ImagingReport {
  patient: {
    name?: string | null;
    rut?: string | null;
    birthDate?: string | null;
  };
  issuer?: {
    name?: string | null;
    date?: string | null;
    identifier?: string | null;
  };
  studyType?: string | null;
  procedureLoinc?: string | null;
  indication?: string | null;
  technique?: string | null;
  findings?: string | null;
  impression?: string | null;
  measurements: ImagingMeasurement[];
}

export type DocumentCategory =
  | "lab"
  | "obstetric-ultrasound"
  | "abdominal-ultrasound"
  | "other";

export interface DocumentType {
  type: DocumentCategory;
  confidence: number;
  reason: string;
}

export interface SuggestionOption {
  code: string;
  system: string;
  display: string;
}

export interface SuggestionField {
  field: string;
  type: "choice" | "text";
  options?: SuggestionOption[];
}

export interface AuditSuggestions {
  [field: string]: SuggestionField;
}

export type FhirResource = {
  resourceType:
    | "DiagnosticReport"
    | "Observation"
    | "DocumentReference"
    | "Patient"
    | "Practitioner"
    | "Organization";
  [key: string]: unknown;
};

export interface FhirBundle {
  resourceType: "Bundle";
  type: "collection";
  entry: Array<{ fullUrl?: string; resource: FhirResource }>;
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
  value: z.string().nullable().optional(),
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

export const documentTypeSchema = z.object({
  type: z.enum([
    "lab",
    "obstetric-ultrasound",
    "abdominal-ultrasound",
    "other",
  ]),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
});

export const suggestionOptionSchema = z.object({
  code: z.string().min(1),
  system: z.string().min(1),
  display: z.string().min(1),
});

export const suggestionFieldSchema = z.object({
  field: z.string().min(1),
  type: z.enum(["choice", "text"]),
  options: z.array(suggestionOptionSchema).optional(),
});

export const auditSuggestionsSchema = z.record(suggestionFieldSchema);

export const obstetricMeasurementSchema = z.object({
  name: z.string().min(1),
  value: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  gestationalAgeWeeks: z.number().nullable().optional(),
  loincCode: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
});

export const obstetricReportSchema = z.object({
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
  gestationalAgeWeeks: z.number().nullable().optional(),
  gestationalAgeDays: z.number().nullable().optional(),
  amnioticFluidIndex: z.string().nullable().optional(),
  placenta: z.string().nullable().optional(),
  observations: z.string().nullable().optional(),
  measurements: z.array(obstetricMeasurementSchema),
});

export const imagingMeasurementSchema = z.object({
  name: z.string().min(1),
  value: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  laterality: z
    .enum(["left", "right", "bilateral", "unspecified"])
    .nullable()
    .optional(),
  region: z.string().nullable().optional(),
  bodySiteSnomed: z.string().nullable().optional(),
  loincCode: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
});

export const imagingReportSchema = z.object({
  patient: z.object({
    name: z.string().nullable().optional(),
    rut: z.string().nullable().optional(),
    birthDate: z.string().nullable().optional(),
  }),
  issuer: z
    .object({
      name: z.string().nullable().optional(),
      date: z.string().nullable().optional(),
      identifier: z.string().nullable().optional(),
    })
    .optional(),
  studyType: z.string().nullable().optional(),
  procedureLoinc: z.string().nullable().optional(),
  indication: z.string().nullable().optional(),
  technique: z.string().nullable().optional(),
  findings: z.string().nullable().optional(),
  impression: z.string().nullable().optional(),
  measurements: z.array(imagingMeasurementSchema),
});

export const fhirResourceSchema = z
  .object({
    resourceType: z.enum([
      "DiagnosticReport",
      "Observation",
      "DocumentReference",
      "Patient",
      "Practitioner",
      "Organization",
    ]),
  })
  .passthrough();

export const fhirBundleSchema = z.object({
  resourceType: z.literal("Bundle"),
  type: z.enum(["collection"]),
  entry: z.array(
    z.object({
      fullUrl: z.string().optional(),
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
