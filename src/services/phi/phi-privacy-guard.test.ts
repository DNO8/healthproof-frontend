import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { PHI_PLACEHOLDER } from "./phi-placeholders";
import { checkForPhiLeak } from "./phi-privacy-guard";

describe("PHI privacy guard", () => {
  it("detects real RUTs in payloads", () => {
    const result = checkForPhiLeak("El paciente tiene RUT 12.345.678-5");
    expect(result.safe).toBe(false);
    expect(result.leaked).toContain("12.345.678-5");
  });

  it("detects real emails in payloads", () => {
    const result = checkForPhiLeak("Contacto: juan@email.com");
    expect(result.safe).toBe(false);
    expect(result.leaked).toContain("juan@email.com");
  });

  it("ignores PHI placeholders", () => {
    const result = checkForPhiLeak(
      `Paciente: ${PHI_PLACEHOLDER.NAME}, RUT: ${PHI_PLACEHOLDER.RUT}`,
    );
    expect(result.safe).toBe(true);
  });

  it("detects RUTs in nested objects", () => {
    const result = checkForPhiLeak({
      patient: { rut: "9.876.543-3" },
      exams: [],
    });
    expect(result.safe).toBe(false);
    expect(result.leaked).toContain("9.876.543-3");
  });
});
