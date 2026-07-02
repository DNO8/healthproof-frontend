# Informe de Laboratorio Clínico

> **Documento de demostración para HealthProof RAG-FHIR Agent**  
> Todos los datos personales son ficticios y fueron generados exclusivamente para pruebas de la solución.

---

## Datos del Paciente

- **Nombre:** Juan Pérez González
- **RUT:** 12.345.678-9
- **Fecha de nacimiento:** 1985-06-15
- **Sexo:** Masculino
- **Edad:** 41 años

## Datos del Informe

- **Número de orden:** ORD-2026-004892
- **Fecha de toma de muestra:** 2026-06-28
- **Fecha de emisión del informe:** 2026-06-29
- **Laboratorio:** Laboratorio Clínico SaludPlus
- **Médico solicitante:** Dra. María López Soto
- **Centro médico:** Centro Médico Norte

## Resultados de Exámenes

### 1. Hemograma completo

| Examen | Resultado | Unidad | Rango de referencia |
|--------|-----------|--------|----------------------|
| Hemoglobina | 14.8 | g/dL | 13.5 - 17.5 |
| Hematocrito | 44.2 | % | 40.0 - 52.0 |
| Glóbulos rojos | 5.1 | millones/µL | 4.5 - 5.9 |
| Glóbulos blancos | 6.8 | miles/µL | 4.5 - 11.0 |
| Plaquetas | 245 | miles/µL | 150 - 400 |
| VCM | 87 | fL | 80 - 100 |
| HCM | 29 | pg | 27 - 33 |
| Leucocitos totales | 6.8 | miles/µL | 4.5 - 11.0 |

**Observación:** Hemograma dentro de límites normales.

---

### 2. Perfil lipídico

| Examen | Resultado | Unidad | Rango de referencia |
|--------|-----------|--------|----------------------|
| Colesterol total | 198 | mg/dL | < 200 |
| HDL colesterol | 48 | mg/dL | > 40 |
| LDL colesterol | 128 | mg/dL | < 130 |
| Triglicéridos | 110 | mg/dL | < 150 |
| VLDL | 22 | mg/dL | 5 - 40 |

**Observación:** Colesterol total y LDL ligeramente elevados. Se sugiere control en 6 meses.

---

### 3. Perfil bioquímico básico

| Examen | Resultado | Unidad | Rango de referencia |
|--------|-----------|--------|----------------------|
| Glucosa en ayunas | 95 | mg/dL | 70 - 100 |
| Urea | 28 | mg/dL | 17 - 43 |
| Creatinina | 0.92 | mg/dL | 0.70 - 1.30 |
| Ácido úrico | 5.4 | mg/dL | 3.4 - 7.0 |
| Proteínas totales | 7.2 | g/dL | 6.0 - 8.3 |
| Bilirrubina total | 0.8 | mg/dL | 0.1 - 1.2 |
| TGO/AST | 22 | U/L | 10 - 40 |
| TGP/ALT | 26 | U/L | 10 - 40 |
| Fosfatasa alcalina | 78 | U/L | 40 - 130 |

**Observación:** Perfil bioquímico dentro de rangos normales.

---

### 4. Hormonal: TSH

| Examen | Resultado | Unidad | Rango de referencia |
|--------|-----------|--------|----------------------|
| TSH | 2.45 | µUI/mL | 0.40 - 4.00 |

**Observación:** TSH dentro de rango normal.

---

### 5. Exámenes de orina (uroanálisis)

| Examen | Resultado | Unidad | Rango de referencia |
|--------|-----------|--------|----------------------|
| Densidad | 1.020 | g/mL | 1.005 - 1.030 |
| pH | 6.0 | - | 5.0 - 8.0 |
| Glucosa | Negativo | - | Negativo |
| Proteínas | Negativo | - | Negativo |
| Cetonas | Negativo | - | Negativo |
| Sangre oculta | Negativo | - | Negativo |
| Leucocitos | Negativo | - | Negativo |
| Esterasas leucocitarias | Negativo | - | Negativo |
| Nitritos | Negativo | - | Negativo |
| Células epiteliales | Escasas | - | Escasas |
| Bacterias | Escasas | - | Escasas |

**Observación:** Uroanálisis sin alteraciones significativas.

---

## Conclusión del Laboratorio

Resultados generales dentro de rangos normales, con ligero aumento de colesterol total y LDL. Se recomienda control lipídico en 6 meses y evaluación de hábitos alimenticios.

---

## Firma y Responsable

- **Bioquímico responsable:** Q.F. Carlos Martínez Vega
- **Registro:** 12345
- **Laboratorio autorizado:** SaludPlus SpA

---

**Nota:** Este documento es una simulación generada para demostración de la conversión de informes de laboratorio en recursos FHIR mediante el agente RAG de HealthProof.
