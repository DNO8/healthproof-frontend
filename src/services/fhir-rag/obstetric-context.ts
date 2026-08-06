import { OBSTETRIC_LOINC_SUBSET } from "./loinc-subset";

export function getObstetricContext(): string {
  const lines = OBSTETRIC_LOINC_SUBSET.map(
    (entry) => `- ${entry.code}: ${entry.spanishDisplay || entry.display}`,
  );
  return `Subset LOINC obstétrico (selección):\n${lines.join("\n")}`;
}

export function getObstetricMeasurementNames(): string[] {
  return OBSTETRIC_LOINC_SUBSET.flatMap((entry) => entry.aliases);
}
