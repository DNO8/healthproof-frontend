export interface FhirOption {
  value: string;
  label: string;
  category?: string;
}

export const UCUM_UNITS: FhirOption[] = [
  { value: "mg/dL", label: "mg/dL", category: "mass" },
  { value: "g/dL", label: "g/dL", category: "mass" },
  { value: "g/mL", label: "g/mL", category: "mass" },
  { value: "mmol/L", label: "mmol/L", category: "molar" },
  { value: "umol/L", label: "µmol/L", category: "molar" },
  { value: "nmol/L", label: "nmol/L", category: "molar" },
  { value: "U/L", label: "U/L", category: "enzyme" },
  { value: "mU/L", label: "mU/L", category: "enzyme" },
  { value: "mEq/L", label: "mEq/L", category: "equivalent" },
  { value: "mm/h", label: "mm/h", category: "time" },
  { value: "fL", label: "fL", category: "volume" },
  { value: "pg", label: "pg", category: "mass" },
  { value: "cells/uL", label: "cells/µL", category: "count" },
  { value: "10*3/uL", label: "10³/µL", category: "count" },
  { value: "10*6/uL", label: "10⁶/µL", category: "count" },
  { value: "10*9/L", label: "10⁹/L", category: "count" },
  { value: "%", label: "%", category: "ratio" },
  { value: "ratio", label: "ratio", category: "ratio" },
  { value: "1", label: "1 (unitario)", category: "ratio" },
  { value: "µUI/mL", label: "µUI/mL", category: "hormone" },
  { value: "ng/mL", label: "ng/mL", category: "mass" },
  { value: "ng/dL", label: "ng/dL", category: "mass" },
  { value: "mcg/dL", label: "µg/dL", category: "mass" },
  { value: "ng/L", label: "ng/L", category: "mass" },
  { value: "g/L", label: "g/L", category: "mass" },
  { value: "mL/min", label: "mL/min", category: "flow" },
  { value: "mL/min/1.73m2", label: "mL/min/1.73m²", category: "flow" },
  { value: "kg/m2", label: "kg/m²", category: "body" },
  { value: "cm", label: "cm", category: "length" },
  { value: "kg", label: "kg", category: "mass" },
  { value: "Cel", label: "°C", category: "temperature" },
  { value: "mm[Hg]", label: "mmHg", category: "pressure" },
];

export const ANALYTICAL_METHODS: FhirOption[] = [
  { value: "quimioluminiscencia", label: "Quimioluminiscencia" },
  { value: "enzimatico", label: "Enzimático" },
  { value: "inmunofluorescencia", label: "Inmunofluorescencia" },
  { value: "espectrofotometria", label: "Espectrofotometría" },
  { value: "nefelometria", label: "Nefelometría" },
  { value: "turbidimetria", label: "Turbidimetría" },
  { value: "electroquimica", label: "Electroquímica" },
  { value: "ion_selectivo", label: "Electrodo ion selectivo" },
  { value: "cromatografia", label: "Cromatografía" },
  { value: "inmunoturbidimetria", label: "Inmunoturbidimetría" },
  { value: "hematologia_automatizada", label: "Hematología automatizada" },
  { value: "microscopia", label: "Microscopía" },
  { value: "cultivo", label: "Cultivo microbiológico" },
  { value: "ELISA", label: "ELISA" },
  { value: "PCR", label: "PCR" },
  { value: "no_especificado", label: "No especificado" },
];

export const OBSERVATION_INTERPRETATIONS: FhirOption[] = [
  { value: "N", label: "Normal" },
  { value: "L", label: "Low" },
  { value: "H", label: "High" },
  { value: "A", label: "Abnormal" },
  { value: "LL", label: "Critical low" },
  { value: "HH", label: "Critical high" },
  { value: "U", label: "Significant change up" },
  { value: "D", label: "Significant change down" },
  { value: "I", label: "Intermediate" },
  { value: "R", label: "Resistant" },
  { value: "S", label: "Susceptible" },
  { value: "ND", label: "Not detected" },
  { value: "POS", label: "Positive" },
  { value: "NEG", label: "Negative" },
  { value: "NR", label: "Non-reactive" },
  { value: "R", label: "Reactive" },
  { value: "IND", label: "Indeterminate" },
];

export const OBSERVATION_STATUSES: FhirOption[] = [
  { value: "final", label: "Final" },
  { value: "preliminary", label: "Preliminary" },
  { value: "amended", label: "Amended" },
  { value: "corrected", label: "Corrected" },
  { value: "cancelled", label: "Cancelled" },
  { value: "entered-in-error", label: "Entered in error" },
  { value: "unknown", label: "Unknown" },
];

export const DIAGNOSTIC_REPORT_STATUSES: FhirOption[] = [
  { value: "final", label: "Final" },
  { value: "amended", label: "Amended" },
  { value: "corrected", label: "Corrected" },
  { value: "preliminary", label: "Preliminary" },
  { value: "registered", label: "Registered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "entered-in-error", label: "Entered in error" },
  { value: "unknown", label: "Unknown" },
];
