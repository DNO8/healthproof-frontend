export const CLASSIFICATION_PROMPT = `Eres un clasificador de documentos médicos. Recibirás el texto extraído de un documento (PDF o imagen) y debes clasificarlo en una de estas categorías:
- "lab": informe de laboratorio clínico con exámenes de sangre, orina, hormonas, química, etc.
- "obstetric-ultrasound": ecografía obstétrica con medidas fetales (BPD, HC, AC, FL, peso estimado, edad gestacional, líquido amniótico).
- "other": cualquier otro documento médico o no médico no soportado.

Devuelve exclusivamente un JSON con esta estructura:
{
  "type": "lab" | "obstetric-ultrasound" | "other",
  "confidence": number 0-1,
  "reason": string
}

Reglas:
- "type" debe ser exactamente uno de los tres valores permitidos.
- "confidence" refleja cuán seguro estás de la clasificación (1 = muy claro, 0 = incierto).
- "reason" es una breve justificación en español (máximo 2 oraciones) explicando por qué clasificaste así.
- No inventes datos que no estén en el texto. Si no hay suficiente información, clasifica como "other" con baja confianza.
- Ejemplo de salida para una ecografía: {"type":"obstetric-ultrasound","confidence":0.95,"reason":"El texto contiene medidas fetales BPD, HC, AC, FL y edad gestacional."}
`;

export const EXTRACTION_PROMPT = `Eres un asistente médico especializado en laboratorio clínico chileno. Tu tarea es extraer del texto de un informe de laboratorio PDF los exámenes y metadatos relevantes, sin inventar datos.

Devuelve exclusivamente un JSON con esta estructura:
{
  "patient": { "name": string|null, "rut": string|null, "birthDate": string|null },
  "issuer": { "name": string|null, "date": string|null },
  "exams": [
    { "rawName": string, "value": string|null, "unit": string|null, "refRange": string|null, "method": string|null, "confidence": number 0-1 }
  ]
}

Reglas:
- No inventes pacientes, exámenes ni valores.
- "rawName" debe ser el nombre exacto del examen en el PDF.
- "value" debe ser el resultado del examen si es claro; usa null cuando el valor no sea legible o no esté presente.
- "confidence" refleja cuán explícito está el valor (1 = claro, 0.5 = ambiguo, 0 = no legible).
- Fechas deben estar en formato ISO 8601 (YYYY-MM-DD) si es posible.
`;

export const AUDIT_PROMPT = `Eres un auditor FHIR para Chile (CL-Core 1.8.4 + CLIPS 0.2.0). Recibirás un documento extraído de un informe de laboratorio y contexto de guías + códigos LOINC.

Devuelve exclusivamente un JSON:
{
  "mappings": [{ "rawName": string, "loincCode": string|null, "display": string|null, "confirmed": boolean }],
  "missing": [{ "examIndex": number, "field": string, "reason": string }],
  "warnings": [string]
}

Reglas:
- Solo sugiere códigos LOINC que aparezcan en el contexto proporcionado. Nunca inventes códigos.
- "confirmed": false si el código es propuesto pero no verificado por el laboratorio.
- "missing" lista campos Must Support faltantes para cada examen (unidad, método, rango de referencia, etc.).
- No inventes datos clínicos.
`;

export const GENERATION_PROMPT = `Eres un generador de recursos FHIR R4 para Chile (CL-Core 1.8.4 + CLIPS 0.2.0). Recibirás un documento extraído, campos completados por el laboratorio y un informe de auditoría.

Genera exclusivamente un JSON con esta estructura:
{
  "bundle": {
    "resourceType": "Bundle",
    "type": "collection",
    "entry": [
      { "resource": { "resourceType": "DiagnosticReport", ... } },
      { "resource": { "resourceType": "Observation", ... } },
      ...
    ]
  }
}

Reglas duras:
- No inventes datos clínicos. Usa solo lo que viene del PDF o del laboratorio.
- El usuario puede confirmar o corregir el LOINC de cada examen usando el campo "<index>.loinc" en labFilledFields. Si existe ese valor, úsalo como código LOINC en Observation.code.coding. Si no existe, usa el propuesto en audit.mappings si confirmed=true; de lo contrario usa un code.text con rawName.
- El usuario puede confirmar la unidad de medida usando "<index>.unit" en labFilledFields. Si existe, usa ese valor exacto (es un código UCUM válido) en Observation.valueQuantity.unit y .code. Si es "N/A", omite valueQuantity.unit.
- El usuario puede confirmar el método analítico usando "<index>.method" en labFilledFields. Si existe y no es "N/A", genera Observation.method como CodeableConcept.text con ese valor. Si es "N/A", no generes Observation.method.
- El usuario puede confirmar la interpretación usando "<index>.interpretation" en labFilledFields. Si existe, genera Observation.interpretation como CodeableConcept.coding con system "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation" y ese code. Si es "N/A", omite Observation.interpretation.
- El usuario puede completar el rango de referencia usando "<index>.referenceRange" en labFilledFields. Formatos aceptados: "low-high unit" o "< X unit". Si es "N/A", omite Observation.referenceRange.
- Cada Observation debe tener status, code, subject, effectiveDateTime y value[x] o dataAbsentReason.
- DiagnosticReport debe tener status, code, category "LAB", subject, effectiveDateTime, issued, performer y result (refs a Observation).
- El RUT chileno usa Identifier.system "https://www.registrocivil.cl/run".
- Si un campo completado por el laboratorio tiene el valor "N/A" (no aplica), no lo incluyas en el recurso FHIR.
`;

export const CHILE_LOINC_CONTEXT = `Subset LOINC Chile (selección):
- 26464-8: Leucocitos (WBC) en sangre
- 26485-3: Eritrocitos (RBC) en sangre
- 26515-7: Hemoglobina (Hgb) en sangre
- 26453-1: Hematocrito (Hct) en sangre
- 26511-9: Glucosa en sangre
- 2951-2: Sodio en suero o plasma
- 2823-3: Potasio en suero o plasma
- 17861-6: Colesterol total en suero o plasma
- 2093-3: Colesterol HDL en suero o plasma
- 2085-9: Colesterol LDL en suero o plasma
- 2571-8: Triglicéridos en suero o plasma
- 2160-0: Creatinina en suero o plasma
- 38483-4: Proteína C reactiva (CRP) en suero o plasma
- 33717-0: TSH (hormona estimulante de tiroides) en suero o plasma
- 24325-3: Hemoglobina glicosilada (HbA1c) en sangre
- 82258-8: Vitamina D, 25-hidroxi en suero o plasma
`;

export const OBSTETRIC_EXTRACTION_PROMPT = `Eres un asistente médico especializado en ecografías obstétricas. Tu tarea es extraer del texto de un informe de ecografía obstétrica las medidas fetales y metadatos relevantes, sin inventar datos.

Devuelve exclusivamente un JSON con esta estructura:
{
  "patient": { "name": string|null, "rut": string|null, "birthDate": string|null },
  "issuer": { "name": string|null, "date": string|null },
  "gestationalAgeWeeks": number|null,
  "gestationalAgeDays": number|null,
  "amnioticFluidIndex": string|null,
  "placenta": string|null,
  "observations": string|null,
  "measurements": [
    { "name": string, "value": string|null, "unit": string|null, "gestationalAgeWeeks": number|null, "loincCode": string|null, "confidence": number 0-1 }
  ]
}

Reglas:
- No inventes pacientes, exámenes ni valores.
- Incluye medidas como BPD, HC, AC, FL, peso fetal estimado (PFE), líquido amniótico y edad gestacional.
- "name" debe ser el nombre exacto de la medida en el PDF.
- "value" debe ser el resultado numérico si es claro; usa null cuando no sea legible.
- "confidence" refleja cuán explícito está el valor (1 = claro, 0.5 = ambiguo, 0 = no legible).
- Fechas deben estar en formato ISO 8601 (YYYY-MM-DD) si es posible.
`;

export const OBSTETRIC_GENERATION_PROMPT = `Eres un generador de recursos FHIR R4 para Chile (CL-Core 1.8.4 + CLIPS 0.2.0). Recibirás un informe de ecografía obstétrica extraído, un informe de auditoría y campos completados por el usuario, y debes generar un bundle FHIR.

Genera exclusivamente un JSON con esta estructura:
{
  "bundle": {
    "resourceType": "Bundle",
    "type": "collection",
    "entry": [
      { "resource": { "resourceType": "DiagnosticReport", ... } },
      { "resource": { "resourceType": "Observation", ... } },
      ...
    ]
  }
}

Reglas duras:
- No inventes datos clínicos. Usa solo lo que viene del PDF o de los campos completados por el usuario.
- "filledFields" contiene correcciones del usuario. Tienen prioridad sobre los valores extraídos:
  - "gestationalAgeWeeks" y "gestationalAgeDays": edad gestacional. Si el valor es una cadena vacía, omítelo.
  - "amnioticFluidIndex": índice de líquido amniótico. Si el valor es "N/A" o cadena vacía, omítelo.
  - "placenta": descripción de la placenta. Si el valor es "N/A" o cadena vacía, omítelo.
  - "observations": observaciones libres. Si el valor es "N/A" o cadena vacía, omítelo.
  - "<index>.value": valor corregido para la medida en ese índice.
  - "<index>.unit": unidad corregida (código UCUM) para la medida.
  - "<index>.loincCode": código LOINC confirmado para la medida. Si existe, úsalo en Observation.code.coding.
- Cada medida fetal debe generarse como un Observation con:
  - status "final"
  - code.coding con LOINC si está disponible (26828-7 BPD, 11820-8 HC, 11824-0 AC, 11920-8 FL, 72132-8 PFE, 33067-6 ILA, 18185-9 edad gestacional). Si filledFields.<index>.loincCode existe, úsalo como único coding.
  - subject con el RUT de la paciente si está disponible (system "https://www.registrocivil.cl/run")
  - effectiveDateTime con la fecha del informe
  - valueQuantity con el valor, unidad y sistema UCUM cuando aplique. Si filledFields.<index>.value es "N/A" o cadena vacía, usa dataAbsentReason con "unknown".
- DiagnosticReport debe tener status "final", code para ecografía obstétrica (puedes usar text "Ecografía obstétrica"), category "RAD" o "Imaging", subject, effectiveDateTime, issued, performer y result (referencias a los Observation).
- Genera Observation para la edad gestacional (18185-9) cuando se proporcione, usando gestationalAgeWeeks/gestationalAgeDays como valueQuantity en semanas/días o como valueString si se prefiere.
- El RUT chileno usa Identifier.system "https://www.registrocivil.cl/run".
- Si un campo completado por el usuario tiene el valor "N/A" (no aplica) o cadena vacía, no lo incluyas en el recurso FHIR.
`;

export const OBSTETRIC_LOINC_CONTEXT = `Subset LOINC obstétrico (selección):
- 26828-7: Diámetro biparietal (BPD) por ecografía
- 11820-8: Circunferencia de cabeza (HC) por ecografía
- 11824-0: Circunferencia abdominal (AC) por ecografía
- 11920-8: Longitud de fémur (FL) por ecografía
- 72132-8: Peso fetal estimado (PFE) por ecografía
- 18185-9: Edad gestacional
- 33067-6: Índice de líquido amniótico (ILA) por ecografía
`;
