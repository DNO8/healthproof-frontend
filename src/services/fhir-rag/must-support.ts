export const OBSERVATION_MUST_SUPPORT = [
  "status",
  "code",
  "subject",
  "effectiveDateTime",
  "valueQuantity",
  "valueString",
  "valueCodeableConcept",
  "dataAbsentReason",
  "referenceRange",
  "interpretation",
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
    const fields =
      resource.resourceType === "Observation"
        ? OBSERVATION_MUST_SUPPORT
        : resource.resourceType === "DiagnosticReport"
          ? DIAGNOSTIC_REPORT_MUST_SUPPORT
          : [];
    for (const field of fields) {
      total++;
      if (isMustSupportFilled(resource, field)) filled++;
    }
  }
  return { total, filled };
}
