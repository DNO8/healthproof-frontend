import "server-only";

import { randomUUID } from "crypto";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { toUcum } from "@/lib/ucum-units";
import { countMustSupport } from "./must-support";
import { getOpenAIClient, withOpenAIRetry } from "./openai-client";
import { ABDOMINAL_ULTRASOUND_GENERATION_PROMPT } from "./prompts";
import type {
	AuditReport,
	FhirBundle,
	FhirResource,
	GenerateResult,
	ImagingReport,
} from "./schema";
import { FHIR_GUIDE_VERSION, fhirBundleSchema } from "./schema";

export type ImagingFilledFields = Record<string, string>;

export async function generateImagingBundle(
	report: ImagingReport,
	audit: AuditReport,
	filledFields: ImagingFilledFields,
	sessionId: string,
): Promise<GenerateResult> {
	const normalizedFields = normalizeImagingUnits(filledFields);
	return withOpenAIRetry(async (model) => {
		const openai = getOpenAIClient();
		const response = await openai.chat.completions.create({
			model,
			messages: [
				{ role: "system", content: ABDOMINAL_ULTRASOUND_GENERATION_PROMPT },
				{
					role: "user",
					content: JSON.stringify(
						{
							report,
							audit,
							filledFields: normalizedFields,
						},
						null,
						2,
					),
				},
			],
			response_format: { type: "json_object" },
			temperature: 0.1,
			max_tokens: 8192,
		});

		const content = response.choices[0]?.message?.content ?? "{}";
		const raw = JSON.parse(content) as unknown;
		const parsed = z
			.object({
				bundle: fhirBundleSchema,
			})
			.parse(raw);

		let bundle = parsed.bundle;
		bundle = ensureNarrativeObservation(bundle, report);
		const mustSupportCount = countMustSupport(bundle);

		logger.info(
			{
				sessionId,
				entries: bundle.entry.length,
				score: mustSupportCount.filled / Math.max(1, mustSupportCount.total),
			},
			"generateImagingBundle completed",
		);

		return {
			bundle,
			compliance: {
				score: mustSupportCount.filled / Math.max(1, mustSupportCount.total),
				mustSupportTotal: mustSupportCount.total,
				mustSupportFilled: mustSupportCount.filled,
				guiaVersion: FHIR_GUIDE_VERSION,
			},
		};
	});
}

function ensureNarrativeObservation(
	bundle: FhirBundle,
	report: ImagingReport,
): FhirBundle {
	const hasObservation = bundle.entry.some(
		(entry) => entry.resource.resourceType === "Observation",
	);
	if (hasObservation) return bundle;

	const diagnosticReportEntry = bundle.entry.find(
		(entry) => entry.resource.resourceType === "DiagnosticReport",
	);
	if (!diagnosticReportEntry) return bundle;

	const patientEntry = bundle.entry.find(
		(entry) => entry.resource.resourceType === "Patient",
	);
	const patientReference = patientEntry?.fullUrl
		? { reference: patientEntry.fullUrl }
		: { reference: "urn:uuid:patient-1" };

	const diagnosticReport = diagnosticReportEntry.resource as Record<
		string,
		unknown
	>;
	const effectiveDateTime =
		(diagnosticReport.effectiveDateTime as string) ||
		report.issuer?.date ||
		new Date().toISOString();

	const narrativeText = [report.findings, report.impression]
		.filter(Boolean)
		.join("\n\n");
	if (!narrativeText) return bundle;

	const observationId = randomUUID();
	const observation: FhirResource = {
		resourceType: "Observation",
		id: observationId,
		status: "final",
		category: [
			{
				coding: [
					{
						system:
							"http://terminology.hl7.org/CodeSystem/observation-category",
						code: "imaging",
						display: "Imaging",
					},
				],
			},
		],
		code: {
			coding: [
				{
					system: "http://loinc.org",
					code: report.procedureLoinc || "79377-4",
					display: report.studyType || "Ecografía de abdomen",
				},
			],
			text: report.studyType || "Hallazgos de ecografía abdominal",
		},
		subject: patientReference,
		effectiveDateTime,
		bodySite: {
			text: "abdomen",
		},
		valueString: narrativeText,
	};

	const observationFullUrl = `urn:uuid:${observationId}`;
	bundle.entry.push({ fullUrl: observationFullUrl, resource: observation });

	const currentResult = diagnosticReport.result;
	const resultArray = Array.isArray(currentResult) ? currentResult : [];
	resultArray.push({ reference: observationFullUrl });
	diagnosticReport.result = resultArray;

	return bundle;
}

function normalizeImagingUnits(
	fields: ImagingFilledFields,
): ImagingFilledFields {
	const normalized: ImagingFilledFields = {};
	for (const [key, value] of Object.entries(fields)) {
		normalized[key] = key.endsWith(".unit") ? (toUcum(value) ?? value) : value;
	}
	return normalized;
}
