import "server-only";

import type { FhirBundle } from "./schema";

export function validateFhirBundle(bundle: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!bundle || typeof bundle !== "object") {
    errors.push("Bundle is not an object");
    return { valid: false, errors };
  }

  const b = bundle as FhirBundle;
  if (b.resourceType !== "Bundle")
    errors.push("Missing or invalid resourceType");
  if (b.type !== "collection") errors.push("Bundle type must be 'collection'");
  if (!Array.isArray(b.entry) || b.entry.length === 0)
    errors.push("Bundle must contain at least one entry");

  let hasDiagnosticReport = false;
  let hasObservation = false;

  for (const [index, entry] of (b.entry ?? []).entries()) {
    const resource = entry.resource;
    if (!resource || typeof resource !== "object") {
      errors.push(`Entry ${index} has no resource`);
      continue;
    }
    if (resource.resourceType === "DiagnosticReport") {
      hasDiagnosticReport = true;
      if (!resource.status) errors.push(`DiagnosticReport missing status`);
      if (!resource.code) errors.push(`DiagnosticReport missing code`);
      if (!resource.subject) errors.push(`DiagnosticReport missing subject`);
      if (!resource.result) errors.push(`DiagnosticReport missing result`);
    }
    if (resource.resourceType === "Observation") {
      hasObservation = true;
      if (!resource.status) errors.push(`Observation missing status`);
      if (!resource.code) errors.push(`Observation missing code`);
      if (!resource.subject) errors.push(`Observation missing subject`);
      if (!resource.effectiveDateTime && !resource.dataAbsentReason) {
        errors.push(`Observation missing effectiveDateTime/dataAbsentReason`);
      }
      if (
        !resource.valueQuantity &&
        !resource.valueString &&
        !resource.valueCodeableConcept &&
        !resource.dataAbsentReason
      ) {
        errors.push(`Observation missing value[x] or dataAbsentReason`);
      }
    }
  }

  if (!hasDiagnosticReport)
    errors.push("Bundle must contain a DiagnosticReport");
  if (!hasObservation)
    errors.push("Bundle must contain at least one Observation");

  return { valid: errors.length === 0, errors };
}
