export const OBSERVATION_MUST_SUPPORT = [
  "status",
  "code",
  "subject",
  "effectiveDateTime",
  "bodySite",
  "referenceRange",
  "interpretation",
];

// Only one of these value representations is required, so they are counted as a single group.
export const OBSERVATION_VALUE_ALTERNATIVES = [
  "valueQuantity",
  "valueString",
  "valueCodeableConcept",
  "dataAbsentReason",
];

export const DIAGNOSTIC_REPORT_MUST_SUPPORT = [
  "status",
  "code",
  "category",
  "subject",
  "effectiveDateTime",
  "issued",
  "performer",
  "result",
];

export const PATIENT_MUST_SUPPORT = ["identifier", "name", "birthDate"];

export const PRACTITIONER_MUST_SUPPORT = ["name"];

export const ORGANIZATION_MUST_SUPPORT = ["name"];

export const DOCUMENT_REFERENCE_MUST_SUPPORT = [
  "status",
  "docStatus",
  "type",
  "category",
  "subject",
  "content",
];

export function isMustSupportFilled(
  resource: Record<string, unknown>,
  field: string,
): boolean {
  const value = resource[field];
  if (value === undefined || value === null) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  if (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value).length === 0
  )
    return false;
  return true;
}

function getMustSupportFields(resourceType: string): string[] {
  switch (resourceType) {
    case "Observation":
      return OBSERVATION_MUST_SUPPORT;
    case "DiagnosticReport":
      return DIAGNOSTIC_REPORT_MUST_SUPPORT;
    case "Patient":
      return PATIENT_MUST_SUPPORT;
    case "Practitioner":
      return PRACTITIONER_MUST_SUPPORT;
    case "Organization":
      return ORGANIZATION_MUST_SUPPORT;
    case "DocumentReference":
      return DOCUMENT_REFERENCE_MUST_SUPPORT;
    default:
      return [];
  }
}

export function countMustSupport(bundle: {
  entry?: Array<{ resource: Record<string, unknown> }>;
}): {
  total: number;
  filled: number;
} {
  let total = 0;
  let filled = 0;
  for (const entry of bundle.entry ?? []) {
    const resource = entry.resource;
    const fields = getMustSupportFields(resource.resourceType as string);
    for (const field of fields) {
      total++;
      if (isMustSupportFilled(resource, field)) filled++;
    }
    if (resource.resourceType === "Observation") {
      total++;
      const hasValue = OBSERVATION_VALUE_ALTERNATIVES.some((field) =>
        isMustSupportFilled(resource, field),
      );
      if (hasValue) filled++;
    }
  }
  return { total, filled };
}
