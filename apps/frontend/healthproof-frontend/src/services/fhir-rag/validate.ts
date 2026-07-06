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
  const resourceIds = new Set<string>();
  const references: { source: string; ref: string }[] = [];

  for (const [index, entry] of (b.entry ?? []).entries()) {
    const fullUrl = entry.fullUrl;
    const resource = entry.resource;
    if (!resource || typeof resource !== "object") {
      errors.push(`Entry ${index} has no resource`);
      continue;
    }
    const resourceType = resource.resourceType as string;
    if (typeof resource.id === "string") resourceIds.add(resource.id);
    if (typeof fullUrl === "string" && fullUrl.startsWith("urn:uuid:")) {
      resourceIds.add(fullUrl.replace("urn:uuid:", ""));
    }

    if (resourceType === "DiagnosticReport") {
      hasDiagnosticReport = true;
      if (!resource.status) errors.push(`DiagnosticReport missing status`);
      if (!resource.code) errors.push(`DiagnosticReport missing code`);
      if (!resource.subject) errors.push(`DiagnosticReport missing subject`);
      if (!resource.result) errors.push(`DiagnosticReport missing result`);
      collectReferences(resource, index, references);
    } else if (resourceType === "Observation") {
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
      collectReferences(resource, index, references);
    } else if (resourceType === "Patient") {
      if (!resource.identifier && !resource.name) {
        errors.push(`Patient missing identifier or name`);
      }
      collectReferences(resource, index, references);
    } else if (
      resourceType === "Practitioner" ||
      resourceType === "Organization"
    ) {
      if (!resource.name) errors.push(`${resourceType} missing name`);
    } else if (resourceType === "DocumentReference") {
      collectReferences(resource, index, references);
    } else if (!resourceType) {
      errors.push(`Entry ${index} missing resourceType`);
    }
  }

  for (const { source, ref } of references) {
    if (ref.startsWith("urn:uuid:")) {
      const id = ref.replace("urn:uuid:", "");
      if (!resourceIds.has(id)) {
        errors.push(
          `${source}: reference ${ref} does not resolve to a bundle entry`,
        );
      }
    } else if (ref.startsWith("#")) {
      // Internal contained references are allowed but not verified here.
    }
    // External references are allowed without validation.
  }

  if (!hasDiagnosticReport)
    errors.push("Bundle must contain a DiagnosticReport");
  if (!hasObservation)
    errors.push("Bundle must contain at least one Observation");

  return { valid: errors.length === 0, errors };
}

function collectReferences(
  resource: Record<string, unknown>,
  index: number,
  refs: Array<{ source: string; ref: string }>,
): void {
  const resourceType = resource.resourceType as string;
  const source = `${resourceType}[${index}]`;
  const referenceFields = ["subject", "performer", "result", "context"];
  for (const field of referenceFields) {
    const value = resource[field];
    if (!value) continue;
    if (typeof value === "string") {
      refs.push({ source, ref: value });
    } else if (typeof value === "object" && value !== null) {
      const refValue = (value as Record<string, unknown>).reference;
      if (typeof refValue === "string") {
        refs.push({ source, ref: refValue });
      }
      if (Array.isArray(refValue)) {
        for (const item of refValue) {
          if (typeof item === "string") refs.push({ source, ref: item });
          else if (typeof item === "object" && item !== null) {
            const nested = (item as Record<string, unknown>).reference;
            if (typeof nested === "string") refs.push({ source, ref: nested });
          }
        }
      }
    }
  }
}
