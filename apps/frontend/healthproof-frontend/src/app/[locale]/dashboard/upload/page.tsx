"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import { auditManual } from "@/actions/fhir/audit-manual";
import { extractAndAudit } from "@/actions/fhir/extract-and-audit";
import { generateFhir } from "@/actions/fhir/generate-fhir";
import { logConsent } from "@/actions/fhir/log-consent";
import { publishFhirDocument } from "@/actions/fhir/publish-fhir-document";
import {
  getOrderOnChain,
  updateOrderStatusOnChain,
} from "@/actions/medical-orders/medical-orders-onchain";
import { UserSelect } from "@/components/forms/UserSelect";
import { useWithPrivyToken } from "@/lib/auth/privy-token-helper";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
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
  ExtractedDoc,
  GenerateResult,
  LabFilledFields,
  ManualExamRow,
  ManualHeader,
} from "@/services/fhir-rag/schema";
import { extractDocumentText } from "@/services/pdf/extract-text";
import type { HybridRecipient } from "@/services/storage/upload";
import {
  uploadHybridEncryptedFile,
  uploadHybridEncryptedJson,
} from "@/services/storage/upload";
import { useKeyConflictStore } from "@/state/key-conflict.store";

import { ConsentNotice } from "./ConsentNotice";
import { FhirBundlePreview } from "./FhirBundlePreview";
import { FhirReviewPanel } from "./FhirReviewPanel";
import { ManualEntryForm } from "./ManualEntryForm";

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
  return message;
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
  const [sessionId, setSessionId] = useState<string>("");
  const [extractedText, setExtractedText] = useState<string>("");
  const [doc, setDoc] = useState<ExtractedDoc | null>(null);
  const [audit, setAudit] = useState<AuditReport | null>(null);
  const [labFilledFields, setLabFilledFields] = useState<LabFilledFields>({});
  const [manualHeader, setManualHeader] = useState<ManualHeader>({});
  const [manualExams, setManualExams] = useState<ManualExamRow[]>([]);
  const [generateResult, setGenerateResult] = useState<GenerateResult | null>(
    null,
  );
  const [_pdfResult, setPdfResult] = useState<Awaited<
    ReturnType<typeof uploadHybridEncryptedFile>
  > | null>(null);
  const [_resolvedEpisodeId, setResolvedEpisodeId] =
    useState<`0x${string}`>(ZERO_BYTES32);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyConflict = useKeyConflictStore((s) => s.conflict);

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
      setFile(dropped);
    },
    [tModal],
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
    } catch (err) {
      console.warn("[upload] Could not resolve episodeId from order:", err);
    }
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
    setStep("consent");
  }

  async function handleAiProcessing() {
    if (!file) return;
    setUploading(true);
    try {
      const { text, hasText, error } = await extractDocumentText(file);
      console.log("[upload] extracted text", { hasText, length: text.length, error });
      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);
      if (!hasText || error) {
        console.error("[handleAiProcessing] extraction failed", { text, hasText, error });
        sileo.warning({
          title: tModal("noTextTitle"),
          description: `${tModal("noTextDesc")}${error ? ` (${error})` : ""}`,
        });
        setStep("manual");
        return;
      }
      setExtractedText(text);
      console.log("[upload] logging consent", { sessionId: newSessionId });
      const consent = await logConsent(
        await withPrivyToken({ sessionId: newSessionId }),
      );
      console.log("[upload] consent response", consent);
      if (!isAuthSuccess(consent) || !consent.data.success) {
        throw new Error("ConsentRequired");
      }
      console.log("[upload] moving to review step");
      await handleExtractAndAudit(newSessionId, text);
    } catch (e) {
      sileo.error({
        title: t("uploadError"),
        description: formatUploadError(e),
      });
      setStep("consent");
    } finally {
      setUploading(false);
    }
  }

  async function handleExtractAndAudit(sessionId: string, text: string) {
    setUploading(true);
    try {
      console.log("[upload] extractAndAudit starting", { sessionId, textLength: text.length });
      const response = await extractAndAudit(
        await withPrivyToken({
          text,
          sessionId,
          labFilledFields: {},
        }),
      );
      console.log("[upload] extractAndAudit response", response);
      if (isAuthSuccess(response)) {
        const { doc, audit } = response.data as unknown as {
          doc: ExtractedDoc;
          audit: AuditReport;
        };
        setDoc(doc);
        setAudit(audit);
        console.log("[upload] moving to review step from extractAndAudit");
        setStep("review");
      } else {
        console.error("[upload] extractAndAudit failed", response);
        throw new Error((response as { error: string }).error);
      }
    } catch (e) {
      sileo.error({
        title: t("uploadError"),
        description: formatUploadError(e),
      });
      setStep("select");
    } finally {
      setUploading(false);
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
      console.log("[upload] auditManual starting", { sessionId });
      const response = await auditManual(
        await withPrivyToken({ doc: manualDoc, sessionId }),
      );
      console.log("[upload] auditManual response", response);
      if (isAuthSuccess(response)) {
        const { doc, audit } = response.data as unknown as {
          doc: ExtractedDoc;
          audit: AuditReport;
        };
        setDoc(doc);
        setAudit(audit);
        console.log("[upload] moving to review step from auditManual");
        setStep("review");
      } else {
        console.error("[upload] auditManual failed", response);
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
    if (!doc || !audit || !sessionId) return;
    setUploading(true);
    try {
      console.log("[upload] generateFhir starting", { sessionId });
      const response = await generateFhir(
        await withPrivyToken({
          doc,
          audit,
          labFilledFields,
          sessionId,
        }),
      );
      console.log("[upload] generateFhir response", response);
      if (isAuthSuccess(response)) {
        setGenerateResult(response.data as GenerateResult);
        setStep("preview");
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
      const fhirUpload = await uploadHybridEncryptedJson(
        generateResult.bundle,
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
          stringToHex(DOC_CLASSIFICATION.LAB, { size: 32 }),
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
          classification: DOC_CLASSIFICATION.LAB,
          patientWallet: patientId.trim(),
          episodeId,
        }),
      );

      console.log("[upload] publishFhirDocument starting", { sessionId });
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
          classification: DOC_CLASSIFICATION.LAB,
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
        } catch (err) {
          console.error("[upload] Order status update failed:", err);
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

      setStep("select");
      setFile(null);
      setDoc(null);
      setAudit(null);
      setGenerateResult(null);
      setPdfResult(null);
      setLabFilledFields({});
      setSessionId("");
      setExtractedText("");
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
                console.error("[upload] Retry order completion failed:", err);
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
          <ConsentNotice
            onAccept={handleAiProcessing}
            onManual={() => setStep("manual")}
            disabled={uploading}
          />
        )}

        {step === "manual" && (
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
          />
        )}

        {step === "preview" && generateResult && (
          <FhirBundlePreview
            result={generateResult}
            onPublish={handlePublish}
            publishing={uploading}
            onReviewAgain={() => setStep("review")}
          />
        )}
      </div>
    </main>
  );
}
