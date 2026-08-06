# Datos mock de Prevent IA

Estos archivos son **datos de demostración 100% ficticios**, con la forma exacta
de los tipos reales del dominio (`MedicalDocument` on-chain y `ClinicalResult`
off-chain, ver `../types.ts`), para que analizar un escenario mock ejercite el
mismo código (`health-score-engine.ts`, `agent.ts`) que se usaría con datos
reales — sin necesitar un documento real recién subido y descifrado.

- `mock-clinical-results.json`: tres escenarios de un único examen (riesgo bajo,
  en ascenso, alto), usados por `usePreventIaAnalysis` / `ScenarioSwitcher`.
- `patients-db.json`: 10 pacientes ficticios para el ranking de riesgo (vista
  doctor/certifier). La distribución está inspirada en estadísticas públicas
  agregadas (Encuesta Nacional de Salud / DEIS-MINSAL), pero ninguna ficha
  corresponde a una persona real.

**Nunca subir estos archivos a producción tal cual.** Al conectar datos reales,
`patients-db.json` se reemplaza por una consulta real (documentos descifrados
del paciente/red), no se versiona como "base de datos" — ver limitación de
cifrado cliente-side documentada en los server actions de
`src/actions/prevent-ia/`.
