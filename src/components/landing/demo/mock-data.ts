export const MOCK_CLINICAL_TEXT_EN = `Patient: Ana Garcia
DOB: 1990-03-15
Physician: Dr. Silva
Exam: Complete Blood Count
Date: 2026-05-25

RESULTS:
Hemoglobin: 14.2 g/dL (Ref: 12-16)
WBC: 7,500 /uL (Ref: 4,500-11,000)
RBC: 4.8 million/uL (Ref: 4.2-5.4)
Platelets: 250,000 /uL (Ref: 150,000-450,000)
Hematocrit: 42% (Ref: 36-48%)
MCV: 88 fL (Ref: 80-100)
MCH: 29 pg (Ref: 27-33)

CONCLUSION: All values within normal range.`;

export const MOCK_CLINICAL_TEXT_ES = `Paciente: Ana Garcia
Fecha nac.: 1990-03-15
Medico: Dr. Silva
Examen: Hemograma completo
Fecha: 2026-05-25

RESULTADOS:
Hemoglobina: 14.2 g/dL (Ref: 12-16)
Leucocitos: 7,500 /uL (Ref: 4,500-11,000)
Eritrocitos: 4.8 millon/uL (Ref: 4.2-5.4)
Plaquetas: 250,000 /uL (Ref: 150,000-450,000)
Hematocrito: 42% (Ref: 36-48%)
VCM: 88 fL (Ref: 80-100)
HCM: 29 pg (Ref: 27-33)

CONCLUSION: Todos los valores dentro del rango normal.`;

export function generateMockHash(): string {
  return `0x${crypto.randomUUID().replace(/-/g, "").slice(0, 40)}`;
}

const blockBase = Math.floor(28000 + Math.random() * 2000);
const blockRef = { current: blockBase };

export function getNextBlockNumber(): number {
  blockRef.current += 1;
  return blockRef.current;
}

export function resetBlockCounter(): void {
  blockRef.current = Math.floor(28000 + Math.random() * 2000);
}

export const DEMO_PATIENTS = [
  { id: "P001", name: "Ana Garcia", wallet: "0xA1b...3c4d" },
  { id: "P002", name: "Carlos Ruiz", wallet: "0xB2c...4d5e" },
  { id: "P003", name: "Maria Lopez", wallet: "0xC3d...5e6f" },
];

export const DEMO_LABS = [
  { id: "L001", name: "Lab Central", wallet: "0xD4e...6f7a" },
  { id: "L002", name: "BioScan Labs", wallet: "0xE5f...7a8b" },
  { id: "L003", name: "MediTest", wallet: "0xF6a...8b9c" },
];

export const DEMO_EXAM_TYPE = "Complete Blood Count";
export const DEMO_ORDER_ID = "ORD-7462";
export const DEMO_FILE_NAME = "result_cbc.pdf";
