import { describe, expect, it } from "vitest";
import { detectPhi } from "./detector";
import { PHI_PLACEHOLDER } from "./phi-placeholders";
import { reassemblePhiInBundle } from "./reassembler";
import { redactFromMap, redactPhi } from "./redactor";

const sampleDocument = `
Laboratorio Clínico Chile
Paciente: Juan Pérez García
RUT: 12.345.678-5
Fecha de nacimiento: 15/03/1985
Dirección: Av. Siempre Viva 742
Email: juan.perez@email.com
Teléfono: +56 9 1234 5678

Hemograma completo
Glucosa: 95 mg/dL
`;

describe("PHI detection", () => {
  it("detects patient RUT, name, birth date, email, phone and address", () => {
    const { phiMap } = detectPhi(sampleDocument);
    expect(phiMap[PHI_PLACEHOLDER.RUT]).toBe("12.345.678-5");
    expect(phiMap[PHI_PLACEHOLDER.NAME]).toBe("Juan Pérez García");
    expect(phiMap[PHI_PLACEHOLDER.BIRTH_DATE]).toBe("15/03/1985");
    expect(phiMap[PHI_PLACEHOLDER.EMAIL]).toBe("juan.perez@email.com");
    expect(phiMap[PHI_PLACEHOLDER.PHONE]).toBe("+56 9 1234 5678");
    expect(phiMap[PHI_PLACEHOLDER.ADDRESS]).toBe("Av. Siempre Viva 742");
  });

  it("prefers the patient RUT when both patient and lab RUTs are present", () => {
    const text = `
Lab RUT: 76.123.456-0
Paciente: Ana López
RUT Paciente: 9.876.543-3
`;
    const { phiMap } = detectPhi(text);
    expect(phiMap[PHI_PLACEHOLDER.RUT]).toBe("9.876.543-3");
  });

  it("does not detect birth date without a label", () => {
    const text = `
Exámenes realizados el 15/03/2024
Glucosa: 90 mg/dL
`;
    const { phiMap } = detectPhi(text);
    expect(phiMap[PHI_PLACEHOLDER.BIRTH_DATE]).toBeUndefined();
  });

  it("does not detect a lab email as patient email without a contact label", () => {
    const text = `
Laboratorio Clínico Chile
contacto@laboratorio.cl
Paciente: Pedro Soto
`;
    const { phiMap } = detectPhi(text);
    expect(phiMap[PHI_PLACEHOLDER.EMAIL]).toBeUndefined();
  });
});

describe("PHI redaction", () => {
  it("replaces PHI with stable placeholders", () => {
    const { redactedText } = redactPhi(sampleDocument);
    expect(redactedText).toContain(PHI_PLACEHOLDER.RUT);
    expect(redactedText).toContain(PHI_PLACEHOLDER.NAME);
    expect(redactedText).toContain(PHI_PLACEHOLDER.BIRTH_DATE);
    expect(redactedText).not.toContain("12.345.678-5");
    expect(redactedText).not.toContain("Juan Pérez García");
    expect(redactedText).not.toContain("15/03/1985");
  });

  it("redactFromMap uses the correct placeholder", () => {
    const phiMap = {
      [PHI_PLACEHOLDER.NAME]: "Juan Pérez",
    };
    const redacted = redactFromMap("El paciente es Juan Pérez", phiMap);
    expect(redacted).toContain(PHI_PLACEHOLDER.NAME);
    expect(redacted).not.toContain("Juan Pérez");
  });
});

describe("PHI reassembly", () => {
  it("reinserts original values into a FHIR bundle", () => {
    const phiMap = {
      [PHI_PLACEHOLDER.RUT]: "12.345.678-9",
      [PHI_PLACEHOLDER.NAME]: "Juan Pérez",
    };
    const bundle = {
      resourceType: "Bundle",
      entry: [
        {
          resource: {
            resourceType: "Patient",
            identifier: [{ value: PHI_PLACEHOLDER.RUT }],
            name: [{ text: PHI_PLACEHOLDER.NAME }],
          },
        },
      ],
    };
    const { bundle: reassembled, missing } = reassemblePhiInBundle(
      bundle,
      phiMap,
    );
    const patient = (reassembled as typeof bundle).entry[0].resource;
    expect(patient.identifier[0].value).toBe("12.345.678-9");
    expect(patient.name[0].text).toBe("Juan Pérez");
    expect(missing).toHaveLength(0);
  });

  it("reports missing placeholders", () => {
    const bundle = {
      resourceType: "Bundle",
      entry: [
        {
          resource: {
            name: [{ text: PHI_PLACEHOLDER.NAME }],
          },
        },
      ],
    };
    const { missing } = reassemblePhiInBundle(bundle, {});
    expect(missing).toContain(PHI_PLACEHOLDER.NAME);
  });
});
