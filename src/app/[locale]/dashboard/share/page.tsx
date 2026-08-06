"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  Building2,
  FileText,
  FlaskConical,
  FolderOpen,
  Stethoscope,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useCallback, useEffect, useState } from "react";
import { sileo } from "sileo";
import { createWalletClient, custom, keccak256, toHex } from "viem";
import { getUserPublicKey } from "@/actions/auth/get-user-public-key";
import { listEpisodesByPatient } from "@/actions/clinical-episodes/list-episodes-by-patient";
import {
  type DocumentSecretRow,
  listDocumentSecretsForWallet,
} from "@/actions/documents/get-document-secret";
import { listDocumentsByEpisode } from "@/actions/documents/list-documents-by-episode";
import { grantPermissionOnChain } from "@/actions/permissions/grant-permission-onchain";
import { savePermissionKey } from "@/actions/permissions/save-permission-key";
import { UserSelect } from "@/components/forms/UserSelect";
import { buildPermissionPayload } from "@/features/permissions";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
import { isAuthSuccess } from "@/lib/auth/with-auth";
import { QR_EXPIRY_MINUTES } from "@/lib/constants";
import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "@/lib/contracts";
import type { OnChainEpisode } from "@/lib/medical-constants";
import { signMetaTransaction } from "@/lib/metatx/forwarder";
import { rewrapKeyForRecipient } from "@/services/encryption/rewrap";
import { useKeyConflictStore } from "@/state/key-conflict.store";
import type { GrantedToRole } from "@/types/domain.types";

const _ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

type ShareMode = "document" | "episode";

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

const GRANTED_ROLES: {
  key: GrantedToRole;
  labelKey: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "doctor", labelKey: "doctor", Icon: Stethoscope },
  { key: "lab", labelKey: "laboratory", Icon: FlaskConical },
  { key: "institution", labelKey: "medicalCenter", Icon: Building2 },
];

export default function SharePage() {
  const t = useTranslations("shareModal");
  const tPage = useTranslations("dashboard.share");
  const walletAddress = useWalletAddress();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const userId = user?.id ?? "";
  const [grantedTo, setGrantedTo] = useState<GrantedToRole | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [shareMode, setShareMode] = useState<ShareMode>("document");
  const [results, setResults] = useState<DocumentSecretRow[]>([]);
  const [selectedResult, setSelectedResult] =
    useState<DocumentSecretRow | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const [episodes, setEpisodes] = useState<OnChainEpisode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<OnChainEpisode | null>(
    null,
  );
  const [episodeDocs, setEpisodeDocs] = useState<DocumentSecretRow[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [loadingEpisodeDocs, setLoadingEpisodeDocs] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const keyConflict = useKeyConflictStore((s) => s.conflict);

  const fetchResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      if (!walletAddress) {
        setResults([]);
        return;
      }
      const rows = await listDocumentSecretsForWallet(walletAddress);
      setResults(rows);
    } catch (err) {
      console.error("[SharePage] Error fetching results:", err);
    } finally {
      setLoadingResults(false);
    }
  }, [walletAddress]);

  const fetchEpisodes = useCallback(async () => {
    setLoadingEpisodes(true);
    try {
      if (!walletAddress) {
        setEpisodes([]);
        return;
      }
      const response = await listEpisodesByPatient({
        patientWallet: walletAddress,
      });
      if (isAuthSuccess(response)) {
        setEpisodes(response.data.episodes);
      } else {
        setEpisodes([]);
      }
    } catch (err) {
      console.error("[SharePage] Error fetching episodes:", err);
      setEpisodes([]);
    } finally {
      setLoadingEpisodes(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    fetchResults();
    fetchEpisodes();
  }, [fetchResults, fetchEpisodes]);

  // Load documents for selected episode
  useEffect(() => {
    async function loadEpisodeDocs() {
      if (!selectedEpisode || !walletAddress) {
        setEpisodeDocs([]);
        return;
      }
      setLoadingEpisodeDocs(true);
      try {
        const response = await listDocumentsByEpisode({
          patientWallet: walletAddress,
          episodeId: selectedEpisode.episodeId,
        });
        if (isAuthSuccess(response)) {
          setEpisodeDocs(response.data.documents);
        } else {
          setEpisodeDocs([]);
        }
      } catch (err) {
        console.error("[SharePage] Error loading episode docs:", err);
        setEpisodeDocs([]);
      } finally {
        setLoadingEpisodeDocs(false);
      }
    }
    loadEpisodeDocs();
  }, [selectedEpisode, walletAddress]);

  async function handleGenerate() {
    if (shareMode === "document" && !selectedResult) {
      sileo.warning({
        title: t("selectResultTitle"),
        description: t("selectResultDesc"),
      });
      return;
    }
    if (shareMode === "episode" && !selectedEpisode) {
      sileo.warning({
        title: t("selectEpisode") ?? "Selecciona un episodio",
        description:
          t("selectEpisodeDesc") ?? "Elige qué episodio clínico compartir.",
      });
      return;
    }
    if (!grantedTo) {
      sileo.warning({
        title: t("selectRecipient"),
        description: t("selectRecipientDesc"),
      });
      return;
    }
    const trimmedRecipient = recipientId.trim();
    if (!trimmedRecipient) {
      sileo.warning({
        title: t("recipientRequired"),
        description: t("recipientRequiredDesc"),
      });
      return;
    }
    if (!walletAddress) return;

    const activeWallet = wallets.find((w) => w.address);
    if (!activeWallet) {
      sileo.error({
        title: t("generateFailed"),
        description: "No active wallet found",
      });
      return;
    }

    setGenerating(true);

    try {
      if (shareMode === "document") {
        // ─── Document mode ───
        if (!selectedResult) throw new Error("No document selected");
        await shareDocument(selectedResult, trimmedRecipient, activeWallet);
      } else {
        // ─── Episode mode ───
        if (!selectedEpisode) throw new Error("No episode selected");
        const docsToShare = episodeDocs;
        if (docsToShare.length === 0) {
          throw new Error(
            t("noDocumentsInEpisode") ?? "Este episodio no tiene documentos.",
          );
        }
        // Warn user about N signatures
        sileo.info({
          title: t("nSignaturesRequired") ?? "Firmas múltiples",
          description:
            t("nDocsWillBeShared", { count: docsToShare.length }) ??
            `Se compartirán ${docsToShare.length} documentos. Firmando ${docsToShare.length} transacciones…`,
          duration: 4000,
        });
        for (const doc of docsToShare) {
          await shareDocument(doc, trimmedRecipient, activeWallet);
        }
        // Light QR v2 for episode
        const resolvedWalletAddress = walletAddress ?? userId;
        const qrV2 = {
          type: "healthproof_permission_v2",
          scope: "episode",
          patient_wallet: resolvedWalletAddress,
          grantee_wallet: trimmedRecipient,
          episode_id: selectedEpisode.episodeId,
          expires_at: Date.now() / 1000 + QR_EXPIRY_MINUTES * 60,
          nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        };
        setQrData(JSON.stringify(qrV2));
        sileo.success({
          title: t("qrGenerated"),
          description: t("qrGeneratedDesc", {
            role: grantedTo.replace("_", " "),
            minutes: QR_EXPIRY_MINUTES,
          }),
          duration: 4000,
        });
        setGenerating(false);
        return;
      }
    } catch (e) {
      sileo.error({
        title: t("generateFailed"),
        description: String(e).slice(0, 120),
      });
    } finally {
      setGenerating(false);
    }
  }

  async function shareDocument(
    doc: DocumentSecretRow,
    trimmedRecipient: string,
    activeWallet: { getEthereumProvider: () => Promise<unknown> },
  ) {
    const recipientPubKeyJwk = await getUserPublicKey(trimmedRecipient);
    if (!recipientPubKeyJwk) {
      throw new Error(t("noRecipientKey"));
    }

    let senderPublicKeyJwk = doc.uploader_public_key;
    if (!senderPublicKeyJwk) {
      senderPublicKeyJwk = await getUserPublicKey(doc.uploader_wallet);
    }
    if (!senderPublicKeyJwk) {
      throw new Error(t("noLabPublicKey"));
    }

    const myWrappedKey =
      doc.encrypted_keys[walletAddress?.toLowerCase() ?? ""] ??
      doc.encrypted_keys[userId];
    if (!myWrappedKey) {
      throw new Error(t("noWrappedKey"));
    }

    const rewrapped = await rewrapKeyForRecipient({
      myUserId: userId,
      myWrappedKey,
      senderPublicKeyJwk,
      recipientPublicKeyJwk: recipientPubKeyJwk,
    });

    const resolvedWalletAddress = walletAddress ?? userId;
    const documentId = doc.document_id;
    if (!grantedTo) throw new Error("NoGrantedTo");

    const _payload = buildPermissionPayload({
      patientWallet: resolvedWalletAddress,
      granteeWallet: trimmedRecipient,
      grantedToRole: grantedTo,
      documentId,
    });

    // Sign on-chain permission grant via EIP-2771 meta-transaction
    const viemWallet = await getViemWalletClient(activeWallet);
    const resourceId =
      documentId.startsWith("0x") && documentId.length === 66
        ? (documentId as `0x${string}`)
        : keccak256(toHex(documentId));

    const request = await signMetaTransaction(
      viemWallet,
      CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
      "grantAccess",
      [
        resolvedWalletAddress.toLowerCase(),
        trimmedRecipient.toLowerCase(),
        0, // Scope.DOCUMENT
        resourceId,
        BigInt(0), // no expiry
      ],
      HealthProofGatewayAbi,
    );

    const grantResult = await grantPermissionOnChain({
      request,
      patientWallet: resolvedWalletAddress,
      granteeWallet: trimmedRecipient,
      documentId,
      scope: 0,
    });
    if (!grantResult.success) {
      throw new Error(grantResult.error ?? "On-chain grant failed");
    }

    // Persist rewrapped key so grantee can access without QR scan
    try {
      const permSave = await savePermissionKey({
        document_id: documentId,
        patient_wallet: resolvedWalletAddress,
        grantee_wallet: trimmedRecipient,
        encrypted_key: JSON.stringify(rewrapped),
      });
      if (!permSave.success) {
        console.warn("[share/page] savePermissionKey:", permSave.error);
      }
    } catch (e) {
      console.warn("[share/page] savePermissionKey failed:", e);
    }

    // Light QR v2 for single document
    const qrV2 = {
      type: "healthproof_permission_v2",
      scope: "document",
      patient_wallet: resolvedWalletAddress,
      grantee_wallet: trimmedRecipient,
      document_id: documentId,
      expires_at: Date.now() / 1000 + QR_EXPIRY_MINUTES * 60,
      nonce: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    setQrData(JSON.stringify(qrV2));
    sileo.success({
      title: t("qrGenerated"),
      description: t("qrGeneratedDesc", {
        role: grantedTo?.replace("_", " "),
        minutes: QR_EXPIRY_MINUTES,
      }),
      duration: 4000,
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">
        {tPage("title")}
      </h1>

      {keyConflict && (
        <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-700 border border-amber-200">
          {t("keyConflictWarning")}
        </div>
      )}

      <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-5">
        {/* Toggle: Document / Episode */}
        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-700">
            {t("shareMode") ?? "Modo de compartir"}
          </span>
          <div className="flex gap-2">
            <button
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                shareMode === "document"
                  ? "neu-pressed text-slate-800 border-l-4 border-l-sky-500"
                  : "neu-surface text-slate-500 hover:neu-pressed"
              }`}
              onClick={() => setShareMode("document")}
              type="button"
            >
              <FileText className="mr-1 h-4 w-4 inline" />
              {t("modeDocument") ?? "Documento"}
            </button>
            <button
              className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                shareMode === "episode"
                  ? "neu-pressed text-slate-800 border-l-4 border-l-sky-500"
                  : "neu-surface text-slate-500 hover:neu-pressed"
              }`}
              onClick={() => setShareMode("episode")}
              type="button"
            >
              <FolderOpen className="mr-1 h-4 w-4 inline" />
              {t("modeEpisode") ?? "Episodio"}
            </button>
          </div>
        </div>

        {/* Document selector */}
        {shareMode === "document" && (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-700">
              {t("selectDocument")}
            </span>
            {loadingResults ? (
              <p className="text-sm text-slate-400 py-2">
                {t("loadingDocuments")}
              </p>
            ) : results.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">{t("noDocuments")}</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {results.map((r) => (
                  <button
                    key={r.id}
                    className={`w-full text-left rounded-xl px-3 py-2 text-sm transition-all ${
                      selectedResult?.id === r.id
                        ? "neu-pressed border-l-4 border-l-sky-500"
                        : "neu-surface hover:neu-pressed"
                    }`}
                    onClick={() => setSelectedResult(r)}
                    type="button"
                  >
                    <span className="font-semibold text-slate-700">
                      {r.file_name ?? `${r.document_id.slice(0, 20)}…`}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Episode selector */}
        {shareMode === "episode" && (
          <div className="space-y-3">
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-700">
                {t("selectEpisode") ?? "Selecciona un episodio"}
              </span>
              {loadingEpisodes ? (
                <p className="text-sm text-slate-400 py-2">
                  {t("loading") ?? "Cargando…"}
                </p>
              ) : episodes.length === 0 ? (
                <p className="text-sm text-slate-400 py-2">
                  {t("noEpisodes") ?? "No se encontraron episodios."}
                </p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {episodes.map((ep) => (
                    <button
                      key={ep.episodeId}
                      className={`w-full text-left rounded-xl px-3 py-2 text-sm transition-all ${
                        selectedEpisode?.episodeId === ep.episodeId
                          ? "neu-pressed border-l-4 border-l-sky-500"
                          : "neu-surface hover:neu-pressed"
                      }`}
                      onClick={() => setSelectedEpisode(ep)}
                      type="button"
                    >
                      <span className="font-semibold text-slate-700">
                        {ep.episodeType} — {ep.classification}
                      </span>
                      <span className="ml-2 text-xs text-slate-400">
                        {new Date(ep.openedAt * 1000).toLocaleDateString()}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedEpisode && (
              <div>
                <span className="mb-1.5 block text-xs font-medium text-slate-700">
                  {t("documentsInEpisode") ?? "Documentos del episodio"}
                </span>
                {loadingEpisodeDocs ? (
                  <p className="text-sm text-slate-400 py-2">
                    {t("loading") ?? "Cargando…"}
                  </p>
                ) : episodeDocs.length === 0 ? (
                  <p className="text-sm text-slate-400 py-2">
                    {t("noDocumentsInEpisode") ??
                      "Este episodio no tiene documentos."}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {episodeDocs.map((d) => (
                      <div
                        key={d.id}
                        className="neu-surface rounded-xl px-3 py-2 text-sm flex items-center justify-between"
                      >
                        <span className="font-medium text-slate-700">
                          {d.file_name ?? `${d.document_id.slice(0, 20)}…`}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(d.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Select role */}
        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-700">
            {t("selectRole")}
          </span>
          <div className="flex gap-2">
            {GRANTED_ROLES.map((role) => (
              <button
                key={role.key}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  grantedTo === role.key
                    ? "neu-pressed text-slate-800 border-l-4 border-l-sky-500"
                    : "neu-surface text-slate-500 hover:neu-pressed"
                }`}
                onClick={() => setGrantedTo(role.key)}
                type="button"
              >
                <role.Icon className="mr-1 h-4 w-4" />
                {t(role.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Select recipient */}
        <div>
          <span className="mb-1.5 block text-xs font-medium text-slate-700">
            {t("selectRecipient")}
          </span>
          <UserSelect
            value={recipientId}
            onChange={setRecipientId}
            label=""
            placeholder={t("recipientPlaceholder")}
            filterRole={grantedTo ?? undefined}
            excludeWallet={walletAddress ?? undefined}
          />
        </div>

        {/* Generate */}
        <button
          className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
          disabled={
            generating ||
            !grantedTo ||
            !recipientId.trim() ||
            !!keyConflict ||
            (shareMode === "document" ? !selectedResult : !selectedEpisode)
          }
          onClick={handleGenerate}
          type="button"
        >
          {generating ? t("generating") : t("generateButton")}
        </button>

        {/* QR display */}
        {qrData && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="neu-pressed rounded-2xl p-4">
              <QRCodeSVG value={qrData} size={200} />
            </div>
            <p className="text-xs text-slate-500">
              {t("qrExpiresIn", { minutes: QR_EXPIRY_MINUTES })}
            </p>

            {/* Payload preview */}
            <details className="w-full">
              <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700 text-center">
                {t("viewPayload")}
              </summary>
              <pre className="neu-pressed mt-2 max-h-40 overflow-auto rounded-xl p-3 text-[10px] text-slate-600">
                {qrData}
              </pre>
            </details>

            <div className="flex w-full gap-2">
              <button
                className="neu-surface hover:neu-pressed flex-1 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition-all"
                onClick={() => {
                  navigator.clipboard.writeText(qrData);
                  sileo.success({
                    title: t("copied"),
                    description: t("copiedDesc"),
                  });
                }}
                type="button"
              >
                {t("copyPayload")}
              </button>
              <button
                className="neu-surface hover:neu-pressed flex-1 rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition-all"
                onClick={() => setQrData(null)}
                type="button"
              >
                {t("generateNew")}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
