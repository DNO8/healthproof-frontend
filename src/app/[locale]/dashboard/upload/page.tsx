"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { sileo } from "sileo";
import {
	createWalletClient,
	custom,
	keccak256,
	stringToHex,
	toHex,
} from "viem";
import { getUserPublicKey } from "@/actions/auth/get-user-public-key";
import { registerDocumentOnChain } from "@/actions/documents/register-document-onchain";
import { auditImagingManual } from "@/actions/fhir/audit-imaging-manual";
import { auditManual } from "@/actions/fhir/audit-manual";
import { classifyDocument } from "@/actions/fhir/classify-document";
import { extractAndAudit } from "@/actions/fhir/extract-and-audit";
import { extractAndAuditImaging } from "@/actions/fhir/extract-and-audit-imaging";
import { extractAndAuditObstetric } from "@/actions/fhir/extract-and-audit-obstetric";
import { generateFhir } from "@/actions/fhir/generate-fhir";
import { generateFhirImaging } from "@/actions/fhir/generate-fhir-imaging";
import { generateFhirObstetric } from "@/actions/fhir/generate-fhir-obstetric";
import { logConsent } from "@/actions/fhir/log-consent";
import { publishFhirDocument } from "@/actions/fhir/publish-fhir-document";
import {
	getOrderOnChain,
	updateOrderStatusOnChain,
} from "@/actions/medical-orders/medical-orders-onchain";
import { UserSelect } from "@/components/forms/UserSelect";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import { useRouter } from "@/i18n/navigation";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
import { useWithPrivyToken } from "@/lib/auth/privy-token-helper";
import { isAuthSuccess } from "@/lib/auth/with-auth";
import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "@/lib/contracts";
import {
	DOC_CLASSIFICATION,
	DOC_TYPE,
	FHIR_STANDARD,
	NO_CLASSIFICATION,
	NO_STANDARD,
	ZERO_BYTES32,
} from "@/lib/medical-constants";
import { signMetaTransaction } from "@/lib/metatx/forwarder";
import { slugify } from "@/lib/utils";
import { isUploadableFile } from "@/lib/validate-file";
import { exportPublicKey } from "@/services/encryption/ecdh";
import { getKeyPair } from "@/services/encryption/keystore";
import type {
	AuditReport,
	AuditSuggestions,
	DocumentType,
	ExtractedDoc,
	FhirResource,
	GenerateResult,
	ImagingReport,
	LabFilledFields,
	ManualExamRow,
	ManualHeader,
	ObstetricReport,
} from "@/services/fhir-rag/schema";
import { extractDocumentText } from "@/services/pdf/extract-text";
import { PHI_PLACEHOLDER } from "@/services/phi/phi-placeholders";
import { reassemblePhiInBundle } from "@/services/phi/reassembler";
import type { PhiMap } from "@/services/phi/types";
import type { HybridRecipient } from "@/services/storage/upload";
import {
	uploadHybridEncryptedFile,
	uploadHybridEncryptedJson,
} from "@/services/storage/upload";
import { useKeyConflictStore } from "@/state/key-conflict.store";

import { ConsentNotice } from "./ConsentNotice";
import { FhirBundlePreview } from "./FhirBundlePreview";
import { FhirReviewPanel } from "./FhirReviewPanel";
import {
	type ImagingManualEntry,
	ImagingManualEntryForm,
} from "./ImagingManualEntryForm";
import { ImagingReviewPanel } from "./ImagingReviewPanel";
import { ManualEntryForm } from "./ManualEntryForm";
import { ObstetricReviewPanel } from "./ObstetricReviewPanel";

async function getViemWalletClient(wallet: {
	getEthereumProvider: () => Promise<unknown>;
}) {
	const provider = (await wallet.getEthereumProvider()) as {
		request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
	};
	return createWalletClient({
		chain: HEALTHPROOF_CHAIN,
		transport: custom(provider),
	});
}

function formatUploadError(e: unknown): string {
	const message = String(e).slice(0, 160);
	if (message.toLowerCase().includes("rate limit")) {
		return "Rate limit. Espera unos segundos y vuelve a intentar.";
	}
	if (message.includes("PhiLeakDetected")) {
		return "Se detectaron datos personales en el texto enviado a la IA. Verifica que la redacción local esté activa o ingresa los datos manualmente.";
	}
	return message;
}

function findPatientReference(
	bundle: GenerateResult["bundle"],
): string | undefined {
	for (const entry of bundle.entry) {
		if (entry.resource.resourceType === "Patient") {
			if (entry.fullUrl) return entry.fullUrl;
			if (entry.resource.id) return `Patient/${entry.resource.id}`;
		}
	}
	return undefined;
}

function addDocumentReference(
	bundle: GenerateResult["bundle"],
	pdfCid: string,
	contentType: string,
	title: string,
): GenerateResult["bundle"] {
	const patientRef = findPatientReference(bundle);
	const documentReference: Record<string, unknown> = {
		resourceType: "DocumentReference",
		status: "current",
		docStatus: "final",
		type: { text: "Medical document" },
		category: [
			{
				coding: [
					{
						system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
						code: "DOC",
						display: "Document",
					},
				],
			},
		],
		content: [
			{
				attachment: {
					contentType,
					url: `ipfs://${pdfCid}`,
					title,
				},
			},
		],
	};
	if (patientRef) {
		documentReference.subject = { reference: patientRef };
	}
	return {
		...bundle,
		entry: [...bundle.entry, { resource: documentReference as FhirResource }],
	};
}

export default function UploadPage() {
	const t = useTranslations("dashboard.upload");
	const router = useRouter();
	const tModal = useTranslations("uploadModal");
	const walletAddress = useWalletAddress();
	const withPrivyToken = useWithPrivyToken();
	const { user } = usePrivy();
	const { wallets } = useWallets();
	const labId = user?.id ?? "";
	const searchParams = useSearchParams();
	const linkedOrderId = searchParams.get("orderId");
	const linkedPatientWallet = searchParams.get("patientWallet");
	const [patientId, setPatientId] = useState(linkedPatientWallet ?? "");
	const [file, setFile] = useState<File | null>(null);
	const [uploading, setUploading] = useState(false);
	const [pendingCompletion, setPendingCompletion] = useState(false);
	const [step, setStep] = useState<
		"select" | "consent" | "manual" | "review" | "preview" | "publish"
	>("select");
	const [aiStatus, setAiStatus] = useState<string | null>(null);
	const [sessionId, setSessionId] = useState<string>("");
	const [extractedText, setExtractedText] = useState<string>("");
	const [hasEnoughText, setHasEnoughText] = useState(false);
	const [detectedDocumentType, setDetectedDocumentType] =
		useState<DocumentType | null>(null);
	const [classificationError, setClassificationError] = useState(false);
	const [classificationLoading, setClassificationLoading] = useState(false);
	const [doc, setDoc] = useState<ExtractedDoc | null>(null);
	const [audit, setAudit] = useState<AuditReport | null>(null);
	const [labFilledFields, setLabFilledFields] = useState<LabFilledFields>({});
	const [obstetricReport, setObstetricReport] =
		useState<ObstetricReport | null>(null);
	const [obstetricAudit, setObstetricAudit] = useState<AuditReport | null>(
		null,
	);
	const [obstetricFilledFields, setObstetricFilledFields] = useState<
		Record<string, string>
	>({});
	const [imagingReport, setImagingReport] = useState<ImagingReport | null>(
		null,
	);
	const [imagingAudit, setImagingAudit] = useState<AuditReport | null>(null);
	const [imagingSuggestions, setImagingSuggestions] =
		useState<AuditSuggestions | null>(null);
	const [imagingFilledFields, setImagingFilledFields] = useState<
		Record<string, string>
	>({});
	const [manualHeader, setManualHeader] = useState<ManualHeader>({});
	const [manualExams, setManualExams] = useState<ManualExamRow[]>([]);
	const [manualImagingEntry, setManualImagingEntry] =
		useState<ImagingManualEntry>({
			patientName: "",
			patientRut: "",
			patientBirthDate: "",
			issuerName: "",
			issuedDate: "",
			studyType: "",
			indication: "",
			technique: "",
			findings: "",
			impression: "",
			measurements: [],
		});
	const [generateResult, setGenerateResult] = useState<GenerateResult | null>(
		null,
	);
	const [_pdfResult, setPdfResult] = useState<Awaited<
		ReturnType<typeof uploadHybridEncryptedFile>
	> | null>(null);
	const [_resolvedEpisodeId, setResolvedEpisodeId] =
		useState<`0x${string}`>(ZERO_BYTES32);
	const inputRef = useRef<HTMLInputElement>(null);
	const phiMapRef = useRef<PhiMap>({});
	const keyConflict = useKeyConflictStore((s) => s.conflict);

	const resetUploadState = useCallback(() => {
		setFile(null);
		setDoc(null);
		setAudit(null);
		setObstetricReport(null);
		setObstetricAudit(null);
		setImagingReport(null);
		setImagingAudit(null);
		setImagingSuggestions(null);
		setGenerateResult(null);
		setPdfResult(null);
		setLabFilledFields({});
		setObstetricFilledFields({});
		setImagingFilledFields({});
		setManualImagingEntry({
			patientName: "",
			patientRut: "",
			patientBirthDate: "",
			issuerName: "",
			issuedDate: "",
			studyType: "",
			indication: "",
			technique: "",
			findings: "",
			impression: "",
			measurements: [],
		});
		setSessionId("");
		setExtractedText("");
		setHasEnoughText(false);
		setDetectedDocumentType(null);
		setClassificationError(false);
		setAiStatus(null);
		phiMapRef.current = {};
	}, []);

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			const dropped = e.dataTransfer.files?.[0];
			if (!dropped) return;
			if (!isUploadableFile(dropped)) {
				sileo.error({
					title: tModal("uploadFailed"),
					description: tModal("invalidFileType"),
				});
				return;
			}
			resetUploadState();
			setFile(dropped);
		},
		[tModal, resetUploadState],
	);

	const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

	async function completeOrder(orderId: string) {
		const activeWallet = wallets.find((w) => w.address);
		if (!activeWallet) throw new Error("No active wallet");

		const provider = await activeWallet.getEthereumProvider();
		const viemWallet = createWalletClient({
			chain: HEALTHPROOF_CHAIN,
			transport: custom(provider),
		});

		const orderIdBytes =
			orderId.startsWith("0x") && orderId.length === 66
				? (orderId as `0x${string}`)
				: keccak256(toHex(orderId));

		const request = await signMetaTransaction(
			viemWallet,
			CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
			"updateOrderStatusViaGateway",
			[orderIdBytes, 2, walletAddress],
			HealthProofGatewayAbi,
		);

		await updateOrderStatusOnChain(
			await withPrivyToken({ request, orderId, status: 2 }),
		);
	}

	async function resolveEpisodeId(): Promise<`0x${string}`> {
		if (!linkedOrderId) return ZERO_BYTES32;
		try {
			const orderResponse = await getOrderOnChain(
				await withPrivyToken({ orderId: linkedOrderId }),
			);
			if (isAuthSuccess(orderResponse)) {
				const order = orderResponse.data;
				if (order?.episodeId && order.episodeId !== ZERO_BYTES32) {
					return order.episodeId as `0x${string}`;
				}
			}
		} catch (_err) {}
		return ZERO_BYTES32;
	}

	async function getRecipients(): Promise<HybridRecipient[]> {
		if (!walletAddress) throw new Error("NoWallet");
		const labKeys = await getKeyPair(labId);
		if (!labKeys?.publicKey || !labKeys?.privateKey)
			throw new Error(tModal("noLabKeys"));
		const patientPubKeyJwk = await getUserPublicKey(
			await withPrivyToken({ idOrWallet: patientId.trim() }),
		);
		if (!patientPubKeyJwk) throw new Error(tModal("noPatientKey"));
		const labPubKeyJwk = await exportPublicKey(labKeys.publicKey);
		return [
			{ wallet: walletAddress, publicKeyJwk: labPubKeyJwk },
			{ wallet: patientId.trim(), publicKeyJwk: patientPubKeyJwk },
		];
	}

	async function handleStartProcessing() {
		if (!file || !walletAddress || !patientId.trim()) return;
		if (keyConflict) {
			sileo.error({
				title: tModal("keyConflictTitle"),
				description: tModal("keyConflictDesc"),
			});
			return;
		}
		if (!isUploadableFile(file)) {
			sileo.error({
				title: tModal("uploadFailed"),
				description: tModal("invalidFileType"),
			});
			return;
		}
		if (file.size > MAX_FILE_SIZE) {
			sileo.error({ title: t("uploadError"), description: t("fileTooLarge") });
			return;
		}
		await analyzeDocument();
	}

	async function analyzeDocument() {
		if (!file) return;
		setClassificationLoading(true);
		setUploading(true);
		setAiStatus(t("aiStatusExtracting"));
		setClassificationError(false);
		setDetectedDocumentType(null);
		try {
			const {
				text: redactedText,
				phiMap,
				hasText,
				error,
			} = await extractDocumentText(file);
			phiMapRef.current = phiMap;
			setHasEnoughText(hasText && redactedText.trim().length > 20);
			const newSessionId = crypto.randomUUID();
			setSessionId(newSessionId);
			if (!hasText || error || redactedText.trim().length === 0) {
				sileo.warning({
					title: tModal("noTextTitle"),
					description: `${tModal("noTextDesc")}${error ? ` (${error})` : ""}`,
				});
				setClassificationError(true);
				setStep("consent");
				return;
			}
			setExtractedText(redactedText);
			setAiStatus(t("aiStatusClassifying"));
			const classification = await classifyDocument(
				await withPrivyToken({ text: redactedText, sessionId: newSessionId }),
			);
			if (isAuthSuccess(classification)) {
				const result = classification.data as DocumentType;
				setDetectedDocumentType(result);
				setStep("consent");
			} else {
				setClassificationError(true);
				setStep("consent");
			}
		} catch (_e) {
			setClassificationError(true);
			setStep("consent");
		} finally {
			setUploading(false);
			setClassificationLoading(false);
			setAiStatus(null);
		}
	}

	async function handleAiProcessing() {
		if (!extractedText || !sessionId || !detectedDocumentType) return;
		setUploading(true);
		setAiStatus(t("aiStatusConsent"));
		try {
			const consent = await logConsent(await withPrivyToken({ sessionId }));
			if (!isAuthSuccess(consent) || !consent.data.success) {
				throw new Error("ConsentRequired");
			}
			setAiStatus(t("aiStatusOpenAI"));
			if (detectedDocumentType.type === "obstetric-ultrasound") {
				await handleExtractAndAuditObstetric(sessionId, extractedText);
			} else if (detectedDocumentType.type === "abdominal-ultrasound") {
				await handleExtractAndAuditImaging(sessionId, extractedText);
			} else {
				await handleExtractAndAudit(sessionId, extractedText);
			}
		} catch (e) {
			sileo.error({
				title: t("uploadError"),
				description: formatUploadError(e),
			});
			setStep("consent");
		} finally {
			setUploading(false);
			setAiStatus(null);
		}
	}

	async function handleExtractAndAudit(sessionId: string, text: string) {
		setAiStatus(t("aiStatusAuditing"));
		try {
			const response = await extractAndAudit(
				await withPrivyToken({
					text,
					sessionId,
					labFilledFields: {},
				}),
			);
			if (isAuthSuccess(response)) {
				const { doc, audit } = response.data as unknown as {
					doc: ExtractedDoc;
					audit: AuditReport;
				};
				setDoc(doc);
				setAudit(audit);
				setAiStatus(t("aiStatusPreparing"));
				setStep("review");
			} else {
				throw new Error((response as { error: string }).error);
			}
		} catch (e) {
			sileo.error({
				title: t("uploadError"),
				description: formatUploadError(e),
			});
			setStep("select");
		}
	}

	async function handleExtractAndAuditImaging(sessionId: string, text: string) {
		setAiStatus(t("aiStatusAuditing"));
		try {
			const response = await extractAndAuditImaging(
				await withPrivyToken({
					text,
					sessionId,
				}),
			);
			if (isAuthSuccess(response)) {
				const { report, audit, suggestions } = response.data as unknown as {
					report: ImagingReport;
					audit: AuditReport;
					suggestions: AuditSuggestions;
				};
				setImagingReport(report);
				setImagingAudit(audit);
				setImagingSuggestions(suggestions);
				setAiStatus(t("aiStatusPreparing"));
				setStep("review");
			} else {
				throw new Error((response as { error: string }).error);
			}
		} catch (e) {
			sileo.error({
				title: t("uploadError"),
				description: formatUploadError(e),
			});
			setStep("select");
		}
	}

	async function handleExtractAndAuditObstetric(
		sessionId: string,
		text: string,
	) {
		setAiStatus(t("aiStatusAuditing"));
		try {
			const response = await extractAndAuditObstetric(
				await withPrivyToken({
					text,
					sessionId,
				}),
			);
			if (isAuthSuccess(response)) {
				const { report, audit } = response.data as unknown as {
					report: ObstetricReport;
					audit: AuditReport;
				};
				setObstetricReport(report);
				setObstetricAudit(audit);
				setAiStatus(t("aiStatusPreparing"));
				setStep("review");
			} else {
				throw new Error((response as { error: string }).error);
			}
		} catch (e) {
			sileo.error({
				title: t("uploadError"),
				description: formatUploadError(e),
			});
			setStep("select");
		}
	}

	async function handleManualProceed() {
		if (!sessionId) return;
		const validExams = manualExams.filter(
			(e) => e.rawName.trim() && e.value.trim(),
		);
		if (validExams.length === 0) {
			sileo.error({
				title: t("uploadError"),
				description: tModal("manualRequired"),
			});
			return;
		}
		setUploading(true);
		try {
			const consent = await logConsent(await withPrivyToken({ sessionId }));
			if (!isAuthSuccess(consent) || !consent.data.success) {
				throw new Error("ConsentRequired");
			}

			const manualDoc: ExtractedDoc = {
				patient: {
					name: manualHeader.patientName?.trim() || null,
					rut: manualHeader.patientRut?.trim() || null,
					birthDate: manualHeader.patientBirthDate?.trim() || null,
				},
				issuer: {
					name: manualHeader.issuerName?.trim() || null,
					date: manualHeader.issuedDate?.trim() || null,
				},
				exams: validExams.map((e) => ({
					rawName: e.rawName.trim(),
					value: e.value.trim(),
					unit: e.unit?.trim() || null,
					refRange: e.refRange?.trim() || null,
					method: e.method?.trim() || null,
					confidence: 1,
				})),
			};
			// Anonymize PHI before sending to AI audit.
			const manualPhiMap: PhiMap = {};
			if (manualDoc.patient.name)
				manualPhiMap[PHI_PLACEHOLDER.NAME] = manualDoc.patient.name;
			if (manualDoc.patient.rut)
				manualPhiMap[PHI_PLACEHOLDER.RUT] = manualDoc.patient.rut;
			if (manualDoc.patient.birthDate)
				manualPhiMap[PHI_PLACEHOLDER.BIRTH_DATE] = manualDoc.patient.birthDate;
			phiMapRef.current = { ...phiMapRef.current, ...manualPhiMap };
			const redactedManualDoc: ExtractedDoc = {
				...manualDoc,
				patient: {
					name: manualDoc.patient.name ? PHI_PLACEHOLDER.NAME : null,
					rut: manualDoc.patient.rut ? PHI_PLACEHOLDER.RUT : null,
					birthDate: manualDoc.patient.birthDate
						? PHI_PLACEHOLDER.BIRTH_DATE
						: null,
				},
			};
			const response = await auditManual(
				await withPrivyToken({ doc: redactedManualDoc, sessionId }),
			);
			if (isAuthSuccess(response)) {
				const { doc, audit } = response.data as unknown as {
					doc: ExtractedDoc;
					audit: AuditReport;
				};
				setDoc(doc);
				setAudit(audit);
				setStep("review");
			} else {
				throw new Error((response as { error: string }).error);
			}
		} catch (e) {
			sileo.error({
				title: t("uploadError"),
				description: formatUploadError(e),
			});
		} finally {
			setUploading(false);
		}
	}

	async function handleManualImagingProceed() {
		if (!sessionId) return;
		const validMeasurements = manualImagingEntry.measurements.filter((m) =>
			m.name.trim(),
		);
		if (validMeasurements.length === 0) {
			sileo.error({
				title: t("uploadError"),
				description: tModal("manualRequired"),
			});
			return;
		}
		setUploading(true);
		try {
			const consent = await logConsent(await withPrivyToken({ sessionId }));
			if (!isAuthSuccess(consent) || !consent.data.success) {
				throw new Error("ConsentRequired");
			}

			const manualReport: ImagingReport = {
				patient: {
					name: manualImagingEntry.patientName?.trim() || null,
					rut: manualImagingEntry.patientRut?.trim() || null,
					birthDate: manualImagingEntry.patientBirthDate?.trim() || null,
				},
				issuer: {
					name: manualImagingEntry.issuerName?.trim() || null,
					date: manualImagingEntry.issuedDate?.trim() || null,
				},
				studyType: manualImagingEntry.studyType?.trim() || null,
				indication: manualImagingEntry.indication?.trim() || null,
				technique: manualImagingEntry.technique?.trim() || null,
				findings: manualImagingEntry.findings?.trim() || null,
				impression: manualImagingEntry.impression?.trim() || null,
				measurements: validMeasurements,
			};

			const manualPhiMap: PhiMap = {};
			if (manualReport.patient.name)
				manualPhiMap[PHI_PLACEHOLDER.NAME] = manualReport.patient.name;
			if (manualReport.patient.rut)
				manualPhiMap[PHI_PLACEHOLDER.RUT] = manualReport.patient.rut;
			if (manualReport.patient.birthDate)
				manualPhiMap[PHI_PLACEHOLDER.BIRTH_DATE] =
					manualReport.patient.birthDate;
			phiMapRef.current = { ...phiMapRef.current, ...manualPhiMap };

			const redactedReport: ImagingReport = {
				...manualReport,
				patient: {
					name: manualReport.patient.name ? PHI_PLACEHOLDER.NAME : null,
					rut: manualReport.patient.rut ? PHI_PLACEHOLDER.RUT : null,
					birthDate: manualReport.patient.birthDate
						? PHI_PLACEHOLDER.BIRTH_DATE
						: null,
				},
			};

			const response = await auditImagingManual(
				await withPrivyToken({ report: redactedReport, sessionId }),
			);
			if (isAuthSuccess(response)) {
				const { report, audit, suggestions } = response.data as unknown as {
					report: ImagingReport;
					audit: AuditReport;
					suggestions: AuditSuggestions;
				};
				setImagingReport(report);
				setImagingAudit(audit);
				setImagingSuggestions(suggestions);
				setStep("review");
			} else {
				throw new Error((response as { error: string }).error);
			}
		} catch (e) {
			sileo.error({
				title: t("uploadError"),
				description: formatUploadError(e),
			});
		} finally {
			setUploading(false);
		}
	}

	async function handleGenerate() {
		if (!sessionId) return;
		const hasLabData = doc && audit;
		const hasObstetricData =
			detectedDocumentType?.type === "obstetric-ultrasound" &&
			obstetricReport &&
			obstetricAudit;
		const hasImagingData =
			detectedDocumentType?.type === "abdominal-ultrasound" &&
			imagingReport &&
			imagingAudit;
		if (!hasLabData && !hasObstetricData && !hasImagingData) {
			sileo.error({
				title: t("uploadError"),
				description: "No hay datos revisados para generar el bundle FHIR.",
			});
			return;
		}
		setUploading(true);
		try {
			if (hasImagingData) {
				const response = await generateFhirImaging(
					await withPrivyToken({
						report: imagingReport,
						audit: imagingAudit,
						filledFields: imagingFilledFields,
						sessionId,
					}),
				);
				if (isAuthSuccess(response)) {
					setGenerateResult(response.data as GenerateResult);
					setStep("preview");
				} else {
					throw new Error((response as { error: string }).error);
				}
			} else if (hasObstetricData) {
				const response = await generateFhirObstetric(
					await withPrivyToken({
						report: obstetricReport,
						audit: obstetricAudit,
						filledFields: obstetricFilledFields,
						sessionId,
					}),
				);
				if (isAuthSuccess(response)) {
					setGenerateResult(response.data as GenerateResult);
					setStep("preview");
				} else {
					throw new Error((response as { error: string }).error);
				}
			} else if (doc && audit) {
				const response = await generateFhir(
					await withPrivyToken({
						doc,
						audit,
						labFilledFields,
						sessionId,
					}),
				);
				if (isAuthSuccess(response)) {
					setGenerateResult(response.data as GenerateResult);
					setStep("preview");
				} else {
					throw new Error((response as { error: string }).error);
				}
			}
		} catch (e) {
			sileo.error({
				title: t("uploadError"),
				description: formatUploadError(e),
			});
		} finally {
			setUploading(false);
		}
	}

	async function handlePublish() {
		if (
			!file ||
			!generateResult ||
			!walletAddress ||
			!patientId.trim() ||
			!sessionId
		)
			return;
		if (keyConflict) {
			sileo.error({
				title: tModal("keyConflictTitle"),
				description: tModal("keyConflictDesc"),
			});
			return;
		}
		setUploading(true);
		setPendingCompletion(false);
		try {
			const recipients = await getRecipients();
			const labKeys = await getKeyPair(labId);
			if (!labKeys?.publicKey || !labKeys?.privateKey)
				throw new Error(tModal("noLabKeys"));
			const labPubKeyJwk = await exportPublicKey(labKeys.publicKey);

			const pdfUpload = await uploadHybridEncryptedFile(
				file,
				labKeys.privateKey,
				labKeys.publicKey,
				recipients,
			);
			setPdfResult(pdfUpload);

			const normalizedPdfKeys: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(pdfUpload.encryptedKeys)) {
				normalizedPdfKeys[key.toLowerCase()] = value;
			}

			const episodeId = await resolveEpisodeId();
			setResolvedEpisodeId(episodeId);

			const activeWallet = wallets.find((w) => w.address);
			if (!activeWallet) throw new Error("No active wallet");
			const viemWallet = await getViemWalletClient(activeWallet);

			const pdfDocumentId = keccak256(toHex(pdfUpload.ipfs.cid));
			const pdfClinicalHash = keccak256(toHex(pdfUpload.fileHash));
			const pdfRequest = await signMetaTransaction(
				viemWallet,
				CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
				"registerMedicalDocument",
				[
					pdfDocumentId,
					patientId.trim() as `0x${string}`,
					walletAddress.toLowerCase() as `0x${string}`,
					stringToHex(DOC_TYPE.MEDICAL_RESULT, { size: 32 }),
					pdfClinicalHash,
					episodeId,
					pdfUpload.ipfs.cid,
					ZERO_BYTES32,
					ZERO_BYTES32,
				],
				HealthProofGatewayAbi,
			);

			await registerDocumentOnChain(
				await withPrivyToken({
					request: pdfRequest,
					cid: pdfUpload.ipfs.cid,
					fileHash: pdfUpload.fileHash,
					documentType: DOC_TYPE.MEDICAL_RESULT,
					standard: NO_STANDARD,
					classification: NO_CLASSIFICATION,
					patientWallet: patientId.trim(),
					episodeId,
				}),
			);

			const rawName = file.name?.trim() || "uploaded-document";
			const base = slugify(rawName.replace(/\.[^/.]+$/, "")) || "document";
			const fhirFileName = `fhir-bundle-${base}.json`;
			const documentClassification =
				detectedDocumentType?.type === "obstetric-ultrasound"
					? DOC_CLASSIFICATION.OBSTETRIC_ULTRASOUND
					: detectedDocumentType?.type === "abdominal-ultrasound"
						? DOC_CLASSIFICATION.ABDOMINAL_ULTRASOUND
						: DOC_CLASSIFICATION.LAB;
			const bundleWithReference = addDocumentReference(
				generateResult.bundle,
				pdfUpload.ipfs.cid,
				file.type || "application/pdf",
				rawName,
			);
			// Reinsert real PHI locally before encrypting/publishing. AI never sees this bundle.
			const { bundle: bundleWithPhi, missing: missingPhi } =
				reassemblePhiInBundle(bundleWithReference, phiMapRef.current);
			if (missingPhi.length > 0) {
				sileo.warning({
					title: t("phiMissingTitle"),
					description: t("phiMissingDesc", {
						placeholders: missingPhi.join(", "),
					}),
				});
			}
			const fhirUpload = await uploadHybridEncryptedJson(
				bundleWithPhi as GenerateResult["bundle"],
				fhirFileName,
				labKeys.privateKey,
				labKeys.publicKey,
				recipients,
			);

			const normalizedFhirKeys: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(fhirUpload.encryptedKeys)) {
				normalizedFhirKeys[key.toLowerCase()] = value;
			}

			const fhirDocumentId = keccak256(toHex(fhirUpload.ipfs.cid));
			const fhirClinicalHash = keccak256(toHex(fhirUpload.fileHash));
			const fhirRequest = await signMetaTransaction(
				viemWallet,
				CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
				"registerMedicalDocument",
				[
					fhirDocumentId,
					patientId.trim() as `0x${string}`,
					walletAddress.toLowerCase() as `0x${string}`,
					stringToHex(DOC_TYPE.FHIR_REPORT, { size: 32 }),
					fhirClinicalHash,
					episodeId,
					fhirUpload.ipfs.cid,
					stringToHex(FHIR_STANDARD.R4, { size: 32 }),
					stringToHex(documentClassification, { size: 32 }),
				],
				HealthProofGatewayAbi,
			);

			await registerDocumentOnChain(
				await withPrivyToken({
					request: fhirRequest,
					cid: fhirUpload.ipfs.cid,
					fileHash: fhirUpload.fileHash,
					documentType: DOC_TYPE.FHIR_REPORT,
					standard: FHIR_STANDARD.R4,
					classification: documentClassification,
					patientWallet: patientId.trim(),
					episodeId,
				}),
			);

			const publishResponse = await publishFhirDocument(
				await withPrivyToken({
					pdf: {
						documentId: pdfUpload.ipfs.cid,
						iv: pdfUpload.iv,
						encryptedKeys: normalizedPdfKeys,
						uploaderPublicKey: labPubKeyJwk,
						fileName: file.name,
					},
					fhir: {
						documentId: fhirUpload.ipfs.cid,
						iv: fhirUpload.iv,
						encryptedKeys: normalizedFhirKeys,
						uploaderPublicKey: labPubKeyJwk,
						fileName: fhirFileName,
					},
					relatedCid: pdfUpload.ipfs.cid,
					documentType: DOC_TYPE.FHIR_REPORT,
					standard: FHIR_STANDARD.R4,
					classification: documentClassification,
					fhirCompliance: {
						score: generateResult.compliance.score,
						mustSupportTotal: generateResult.compliance.mustSupportTotal,
						mustSupportFilled: generateResult.compliance.mustSupportFilled,
						guiaVersion: generateResult.compliance.guiaVersion,
					},
					patientWallet: patientId.trim(),
					episodeId,
					sessionId,
				}),
			);

			if (
				!isAuthSuccess(publishResponse) ||
				!(publishResponse.data as { success?: boolean }).success
			) {
				throw new Error("PublishFailed");
			}

			if (linkedOrderId) {
				try {
					await completeOrder(linkedOrderId);
					sileo.success({
						title: t("uploadSuccess"),
						description: t("orderCompleted"),
					});
					router.push("/dashboard/lab-orders");
					return;
				} catch (_err) {
					setPendingCompletion(true);
					sileo.warning({
						title: t("uploadSuccess"),
						description: t("orderStatusFailed"),
					});
				}
			} else {
				sileo.success({
					title: t("uploadSuccess"),
					description: `CID: ${pdfUpload.ipfs.cid.slice(0, 20)}…`,
				});
			}

			resetUploadState();
			setPatientId(linkedPatientWallet ?? "");
		} catch (e) {
			sileo.error({
				title: t("uploadError"),
				description: formatUploadError(e),
			});
		} finally {
			setUploading(false);
		}
	}

	return (
		<main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
			<h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>

			{linkedOrderId && (
				<div className="neu-surface mb-4 rounded-xl p-4 text-sm border-l-4 border-l-[#93C5FD]">
					<p className="font-semibold text-[#1F2937]">{t("linkedOrder")}</p>
					<p className="font-mono text-xs mt-1 text-[#9CA3AF]">
						{linkedOrderId.slice(0, 20)}…{linkedOrderId.slice(-8)}
					</p>
					{linkedPatientWallet && (
						<p className="text-xs mt-1 text-[#9CA3AF]">
							{t("patientLabel")}: {linkedPatientWallet.slice(0, 8)}…
							{linkedPatientWallet.slice(-4)}
						</p>
					)}
					<p className="text-xs mt-2 text-[#93C5FD] bg-[#93C5FD]/10 rounded-lg px-2 py-1 inline-block">
						{t("twoSignaturesRequired")}
					</p>
				</div>
			)}

			{pendingCompletion && linkedOrderId && (
				<div className="neu-surface mb-4 rounded-xl p-4 text-sm border-l-4 border-l-[#F59E0B] space-y-2">
					<p className="font-semibold text-[#1F2937]">
						{t("orderCompletionPending")}
					</p>
					<p className="text-xs text-[#9CA3AF]">
						{t("orderCompletionPendingDesc")}
					</p>
					<button
						className="neu-chip px-3 py-1.5 text-xs font-semibold text-[#B45309] transition hover:brightness-95 disabled:opacity-50"
						disabled={uploading}
						onClick={async () => {
							setUploading(true);
							try {
								await completeOrder(linkedOrderId);
								sileo.success({ title: t("orderCompleted"), description: "" });
								setPendingCompletion(false);
								router.push("/dashboard/lab-orders");
							} catch (err) {
								sileo.error({
									title: t("orderCompletionFailed"),
									description: formatUploadError(err),
								});
							} finally {
								setUploading(false);
							}
						}}
						type="button"
					>
						{uploading ? t("completing") : t("completeOrderButton")}
					</button>
				</div>
			)}

			{keyConflict && (
				<div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-700 border border-amber-200">
					{tModal("keyConflictWarning")}
				</div>
			)}

			<div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
				<div>
					<span className="mb-1.5 block text-xs font-medium text-slate-700">
						{t("patientLabel")}
					</span>
					{linkedPatientWallet ? (
						<div className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-500 opacity-60">
							{linkedPatientWallet}
						</div>
					) : (
						<UserSelect
							value={patientId}
							onChange={setPatientId}
							label=""
							placeholder={t("patientPlaceholder")}
							filterRole="patient"
							excludeWallet={walletAddress ?? undefined}
						/>
					)}
				</div>

				<input
					id="pdf-upload"
					ref={inputRef}
					type="file"
					accept=".pdf,application/pdf,image/*"
					className="hidden"
					onChange={(e) => {
						const f = e.target.files?.[0];
						if (!f) {
							setFile(null);
							return;
						}
						if (!isUploadableFile(f)) {
							sileo.error({
								title: tModal("uploadFailed"),
								description: tModal("invalidFileType"),
							});
							return;
						}
						resetUploadState();
						setFile(f);
					}}
				/>
				<label
					htmlFor="pdf-upload"
					className="neu-inset rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center cursor-pointer transition-colors hover:border-sky-300 block"
					onDragOver={(e) => e.preventDefault()}
					onDrop={handleDrop}
				>
					{file ? (
						<div className="space-y-1">
							<p className="text-sm font-semibold text-slate-700">
								{file.name}
							</p>
							<p className="text-xs text-slate-400">
								{(file.size / 1024).toFixed(1)} KB
							</p>
						</div>
					) : (
						<div className="space-y-2">
							<Upload className="h-8 w-8 text-sky-600 mx-auto" />
							<p className="text-sm text-slate-600">{t("dropOrClick")}</p>
							<p className="text-xs text-slate-400">{t("fileTypes")}</p>
						</div>
					)}
				</label>

				{step === "select" && (
					<button
						className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
						disabled={uploading || !file || !patientId.trim() || !!keyConflict}
						onClick={handleStartProcessing}
						type="button"
					>
						{uploading ? t("processing") : t("processButton")}
					</button>
				)}

				{step === "consent" && (
					<div className="space-y-4">
						{detectedDocumentType && !classificationError && (
							<div className="neu-surface rounded-xl p-4 space-y-2">
								<div className="flex items-center justify-between">
									<p className="text-sm font-semibold text-slate-700">
										{t("detectedType")}
									</p>
									{detectedDocumentType.confidence < 0.7 && (
										<span className="text-[10px] px-2 py-1 rounded-full bg-amber-50 text-amber-700">
											{t("lowConfidenceBadge")}
										</span>
									)}
								</div>
								<p className="text-sm text-slate-600">
									{t(`documentType.${detectedDocumentType.type}`)}
								</p>
								<p className="text-xs text-slate-500">
									{detectedDocumentType.reason}
								</p>
							</div>
						)}
						{classificationError && (
							<div className="neu-surface rounded-xl p-4 space-y-3">
								<p className="text-sm font-semibold text-slate-700">
									{t("classificationFailedTitle")}
								</p>
								<p className="text-xs text-slate-500">
									{t("classificationFailedDesc")}
								</p>
								<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
									{hasEnoughText && (
										<button
											type="button"
											disabled={uploading || classificationLoading}
											onClick={() => {
												setClassificationError(false);
												setDetectedDocumentType({
													type: "lab",
													confidence: 0.5,
													reason: "Seleccionado manualmente por el usuario",
												});
											}}
											className="neu-surface hover:neu-pressed rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
										>
											{t("processAsLab")}
										</button>
									)}
									<button
										type="button"
										disabled={uploading || classificationLoading}
										onClick={() => {
											setClassificationError(false);
											setDetectedDocumentType({
												type: "abdominal-ultrasound",
												confidence: 0.5,
												reason: "Seleccionado manualmente por el usuario",
											});
										}}
										className="neu-surface hover:neu-pressed rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
									>
										{t("processAsAbdominalUltrasound")}
									</button>
									<button
										type="button"
										disabled={uploading || classificationLoading}
										onClick={() => setStep("manual")}
										className="neu-inset hover:brightness-95 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
									>
										{t("enterManual")}
									</button>
									<button
										type="button"
										disabled={uploading || classificationLoading}
										onClick={() => {
											resetUploadState();
											setStep("select");
											if (inputRef.current) inputRef.current.value = "";
										}}
										className="neu-surface hover:neu-pressed rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50 sm:col-span-2"
									>
										{t("uploadAnotherFile")}
									</button>
								</div>
							</div>
						)}
						{!classificationError && detectedDocumentType?.type === "other" && (
							<div className="neu-surface rounded-xl p-4 space-y-3">
								<p className="text-sm font-semibold text-slate-700">
									{t("unsupportedDocumentTitle")}
								</p>
								<p className="text-xs text-slate-500">
									{t("unsupportedDocumentDesc")}
								</p>
								<div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
									<button
										type="button"
										disabled={uploading || classificationLoading}
										onClick={() => setStep("manual")}
										className="neu-inset hover:brightness-95 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 disabled:opacity-50"
									>
										{t("enterManual")}
									</button>
									<button
										type="button"
										disabled={uploading || classificationLoading}
										onClick={() => {
											setDetectedDocumentType({
												type: "abdominal-ultrasound",
												confidence: 0.5,
												reason: "Seleccionado manualmente por el usuario",
											});
										}}
										className="neu-surface hover:neu-pressed rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
									>
										{t("processAsAbdominalUltrasound")}
									</button>
									<button
										type="button"
										disabled={uploading || classificationLoading}
										onClick={() => {
											resetUploadState();
											setStep("select");
											if (inputRef.current) inputRef.current.value = "";
										}}
										className="neu-surface hover:neu-pressed rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
									>
										{t("uploadAnotherFile")}
									</button>
								</div>
							</div>
						)}
						{!classificationError &&
							(detectedDocumentType?.type === "lab" ||
								detectedDocumentType?.type === "obstetric-ultrasound" ||
								detectedDocumentType?.type === "abdominal-ultrasound") && (
								<ConsentNotice
									documentType={detectedDocumentType.type}
									onAccept={handleAiProcessing}
									onManual={
										detectedDocumentType.type === "lab" ||
										detectedDocumentType.type === "abdominal-ultrasound"
											? () => setStep("manual")
											: undefined
									}
									disabled={uploading || !!aiStatus}
									aiStatus={aiStatus}
								/>
							)}
					</div>
				)}

				{step === "manual" &&
					detectedDocumentType?.type === "abdominal-ultrasound" && (
						<ImagingManualEntryForm
							value={manualImagingEntry}
							onChange={setManualImagingEntry}
							onProceed={handleManualImagingProceed}
							disabled={uploading}
						/>
					)}

				{step === "manual" &&
					detectedDocumentType?.type !== "abdominal-ultrasound" && (
						<ManualEntryForm
							header={manualHeader}
							exams={manualExams}
							onHeaderChange={setManualHeader}
							onExamsChange={setManualExams}
							onProceed={handleManualProceed}
							disabled={uploading}
						/>
					)}

				{step === "review" && doc && audit && (
					<FhirReviewPanel
						doc={doc}
						audit={audit}
						labFilledFields={labFilledFields}
						onChange={setLabFilledFields}
						onGenerate={handleGenerate}
						generating={uploading}
						documentType={detectedDocumentType?.type ?? "lab"}
					/>
				)}

				{step === "review" &&
					detectedDocumentType?.type === "obstetric-ultrasound" &&
					obstetricReport &&
					obstetricAudit && (
						<ObstetricReviewPanel
							report={obstetricReport}
							audit={obstetricAudit}
							filledFields={obstetricFilledFields}
							onChange={setObstetricFilledFields}
							onGenerate={handleGenerate}
							generating={uploading}
						/>
					)}

				{step === "review" &&
					detectedDocumentType?.type === "abdominal-ultrasound" &&
					imagingReport &&
					imagingAudit && (
						<ImagingReviewPanel
							report={imagingReport}
							audit={imagingAudit}
							suggestions={imagingSuggestions}
							sessionId={sessionId}
							filledFields={imagingFilledFields}
							onChange={setImagingFilledFields}
							onGenerate={handleGenerate}
							generating={uploading}
						/>
					)}

				{step === "preview" && generateResult && (
					<FhirBundlePreview
						result={{
							...generateResult,
							bundle: reassemblePhiInBundle(
								generateResult.bundle,
								phiMapRef.current,
							).bundle,
						}}
						onPublish={handlePublish}
						publishing={uploading}
						onReviewAgain={() => setStep("review")}
					/>
				)}
			</div>
		</main>
	);
}
