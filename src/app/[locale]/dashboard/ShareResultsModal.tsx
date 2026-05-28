"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useWallets } from "@privy-io/react-auth";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import { QRCodeSVG } from "qrcode.react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { createWalletClient, custom, keccak256, toHex } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import type { GrantedToRole, EncryptedQRData } from "@/types/domain.types";
import { QR_EXPIRY_MINUTES } from "@/lib/constants";
import { buildPermissionPayload } from "@/features/permissions";
import {
  listDocumentSecretsForWallet,
  type DocumentSecretRow,
} from "@/actions/documents/get-document-secret";
import { getDbUser } from "@/actions/auth/get-user";
import { grantPermissionOnChain } from "@/actions/permissions/grant-permission-onchain";
import { getUserPublicKey } from "@/actions/auth/get-user-public-key";
import { rewrapKeyForRecipient } from "@/services/encryption/rewrap";
import { exportPublicKey } from "@/services/encryption/ecdh";
import { getKeyPair } from "@/services/encryption/keystore";
import { UserSelect } from "@/components/forms/UserSelect";
import { useKeyConflictStore } from "@/state/key-conflict.store";
import { savePermissionKey } from "@/actions/permissions/save-permission-key";
import { signMetaTransaction } from "@/lib/metatx/forwarder";
import PermissionManagerArtifact from "@/lib/abis/PermissionManager.json";
import { Stethoscope, FlaskConical, Building2, AlertTriangle } from "lucide-react";

const PermissionManagerAbi = PermissionManagerArtifact.abi;

async function getViemWalletClient(wallet: { getEthereumProvider: () => Promise<any> }) {
  const provider = await wallet.getEthereumProvider();
  return createWalletClient({ chain: HEALTHPROOF_CHAIN, transport: custom(provider) });
}

const GRANTED_ROLES: {
  key: GrantedToRole;
  labelKey: string;
  icon: ReactNode;
}[] = [
  { key: "doctor", labelKey: "doctor", icon: <Stethoscope className="h-5 w-5" /> },
  { key: "lab", labelKey: "laboratory", icon: <FlaskConical className="h-5 w-5" /> },
  { key: "institution", labelKey: "medicalCenter", icon: <Building2 className="h-5 w-5" /> },
];

export function ShareResultsModal({
  onClose,
  patientId,
}: {
  onClose: () => void;
  patientId: string;
}) {
  const t = useTranslations("shareModal");
  const walletAddress = useWalletAddress();
  const { wallets } = useWallets();
  const [grantedTo, setGrantedTo] = useState<GrantedToRole | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [results, setResults] = useState<DocumentSecretRow[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);
  const [qrData, setQrData] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const keyConflict = useKeyConflictStore((s) => s.conflict);

  const fetchResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      // Resolve wallet address from Privy DID
      const dbUserRes = await getDbUser({ idOrWallet: patientId });
      const wallet = dbUserRes.success ? dbUserRes.data?.wallet_address : undefined;
      if (!wallet) {
        setResults([]);
        return;
      }
      const rows = await listDocumentSecretsForWallet(wallet);
      setResults(rows);
    } catch (err) {
      console.error("[ShareResultsModal] Error fetching results:", err);
    } finally {
      setLoadingResults(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  async function handleGenerate() {
    if (!selectedDocId) {
      sileo.warning({
        title: t("selectDocumentTitle"),
        description: t("selectDocumentDesc"),
      });
      return;
    }
    if (!grantedTo) {
      sileo.warning({
        title: t("selectRoleTitle"),
        description: t("selectRoleDesc"),
      });
      return;
    }
    const trimmedRecipient = recipientId.trim();
    if (!trimmedRecipient) {
      sileo.warning({
        title: t("selectRecipient"),
        description: t("selectRecipientDesc"),
      });
      return;
    }

    const selectedResult = results.find((r) => r.document_id === selectedDocId) ?? null;
    if (!selectedResult) {
      sileo.warning({
        title: t("selectDocumentTitle"),
        description: t("selectDocumentDesc"),
      });
      return;
    }

    const activeWallet = wallets.find((w) => w.address);
    if (!activeWallet) {
      sileo.error({ title: t("errorTitle"), description: "No active wallet found" });
      return;
    }

    setGenerating(true);

    try {
      // 1. Get recipient's public key from DB
      const recipientPubKeyJwk = await getUserPublicKey(trimmedRecipient);
      if (!recipientPubKeyJwk) {
        throw new Error(t("noRecipientKey"));
      }

      // 2. Get the uploader's public key — prefer the stored key from upload time,
      //    fall back to current DB key for legacy records without uploader_public_key
      let senderPublicKeyJwk = selectedResult.uploader_public_key;
      if (!senderPublicKeyJwk) {
        senderPublicKeyJwk = await getUserPublicKey(
          selectedResult.uploader_wallet,
        );
      }
      if (!senderPublicKeyJwk) {
        throw new Error(t("noLabPublicKey"));
      }

      // 3. Re-wrap the AES key for the recipient
      const myWrappedKey =
        selectedResult.encrypted_keys[selectedResult.patient_wallet] ??
        selectedResult.encrypted_keys[patientId];

      if (!myWrappedKey) {
        throw new Error(t("noWrappedKey"));
      }

      const rewrapped = await rewrapKeyForRecipient({
        myUserId: patientId,
        myWrappedKey,
        senderPublicKeyJwk,
        recipientPublicKeyJwk: recipientPubKeyJwk,
      });

      // 4. Get my public key to include in QR
      const myKeys = await getKeyPair(patientId);
      if (!myKeys?.publicKey) {
        throw new Error(t("noPatientKeys"));
      }
      const myPublicKeyJwk = await exportPublicKey(myKeys.publicKey);

      // 5. Resolve wallet address
      const resolvedWalletAddress = walletAddress ?? patientId;
      const documentId = selectedResult.document_id;

      // 6. Build permission payload
      const payload = buildPermissionPayload({
        patientWallet: resolvedWalletAddress,
        granteeWallet: trimmedRecipient,
        grantedToRole: grantedTo,
        documentId,
      });

      // 7. Sign on-chain permission grant via EIP-2771 meta-transaction
      const viemWallet = await getViemWalletClient(activeWallet);
      const resourceId =
        documentId.startsWith("0x") && documentId.length === 66
          ? (documentId as `0x${string}`)
          : keccak256(toHex(documentId));

      const request = await signMetaTransaction(
        viemWallet,
        CONTRACT_ADDRESSES.PermissionManager as `0x${string}`,
        "grantPermission",
        [
          resolvedWalletAddress.toLowerCase(),
          trimmedRecipient.toLowerCase(),
          0, // Scope.DOCUMENT
          resourceId,
          BigInt(0), // no expiry
        ],
        PermissionManagerAbi,
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

      // 8. Persist rewrapped key so grantee can access without QR scan
      try {
        const permSave = await savePermissionKey({
          document_id: documentId,
          patient_wallet: resolvedWalletAddress,
          grantee_wallet: trimmedRecipient,
          encrypted_key: JSON.stringify(rewrapped),
        });
        if (!permSave.success) {
          console.warn("[ShareResultsModal] savePermissionKey:", permSave.error);
        }
      } catch (e) {
        console.warn("[ShareResultsModal] savePermissionKey failed:", e);
      }

      // 9. Build encrypted QR data
      const qr: EncryptedQRData = {
        type: "healthproof_permission",
        payload,
        signature: "unsigned",
        wallet: resolvedWalletAddress,
        crypto: {
          document_id: documentId,
          cid: documentId,
          iv: selectedResult.iv,
          encrypted_key: rewrapped,
          patient_public_key: myPublicKeyJwk,
        },
      };

      setQrData(JSON.stringify(qr));

      sileo.success({
        title: t("qrGenerated"),
        description: t("qrGeneratedDesc", {
          role: grantedTo.replace("_", " "),
          minutes: QR_EXPIRY_MINUTES,
        }),
        duration: 4000,
      });
    } catch (err) {
      console.error("[ShareResultsModal] Error generating QR:", err);
      const message = err instanceof Error ? err.message : t("errorDesc");
      sileo.error({
        title: t("errorTitle"),
        description: message,
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="neu-shell mx-4 w-full max-w-lg border border-white/70 p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{t("title")}</h2>
          <button
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            type="button"
          >
            <svg
              fill="none"
              height="20"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="20"
              aria-label={t("close")}
            >
              <title>{t("close")}</title>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!qrData ? (
          <>
            <p className="mt-3 text-sm text-slate-500">{t("description")}</p>

            {/* Select result */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-slate-700">
                {t("selectDocument")}
              </p>
              {loadingResults ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="neu-pressed h-10 w-full animate-pulse rounded-xl bg-slate-200" />
                  ))}
                </div>
              ) : results.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">
                  {t("noResults")}
                </p>
              ) : (
                <div className="neu-inset rounded-xl p-4 space-y-2 max-h-56 overflow-y-auto">
                  {results.map((r) => (
                    <label key={r.document_id} className="flex items-center gap-2 cursor-pointer py-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200"
                        checked={selectedDocId === r.document_id}
                        onChange={() => setSelectedDocId(r.document_id)}
                      />
                      <span className="text-sm text-slate-700 truncate">
                        {r.file_name ?? r.document_id.slice(0, 24) + "…"}
                      </span>
                      <span className="text-xs text-slate-400 ml-auto shrink-0">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Recipient role */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-slate-700">
                {t("shareWith")}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                {GRANTED_ROLES.map((role) => (
                  <button
                    className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all duration-200 ${
                      grantedTo === role.key
                        ? "neu-pressed border border-sky-200 text-sky-700"
                        : "neu-surface border border-transparent text-slate-600 hover:border-slate-200"
                    }`}
                    key={role.key}
                    onClick={() => {
                      setGrantedTo(role.key);
                      setRecipientId("");
                    }}
                    type="button"
                  >
                    {role.icon}
                    <span className="text-[11px] font-semibold">
                      {t(role.labelKey)}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Recipient selector */}
            {grantedTo && (
              <div className="mt-5">
                <UserSelect
                  value={recipientId}
                  onChange={setRecipientId}
                  label={t("recipientId")}
                  placeholder={t("recipientIdPlaceholder")}
                  filterRole={grantedTo}
                />
              </div>
            )}

            {/* Expiry info */}
            <p className="mt-4 text-[11px] text-slate-400">
              {t("expiryInfo", { minutes: QR_EXPIRY_MINUTES })}{" "}
              {walletAddress ? t("walletSigned") : t("noWallet")}
            </p>

            {/* Key conflict warning */}
            {keyConflict && (
              <p className="mt-4 flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {keyConflict === "missing_local_keys"
                  ? t("keyConflictMissing")
                  : t("keyConflictMismatch")}
              </p>
            )}

            {/* Generate button */}
            <button
              className="mt-6 w-full rounded-2xl border border-white/60 bg-(--hp-primary) px-6 py-3 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) active:translate-y-px disabled:opacity-60"
              disabled={generating || !!keyConflict}
              onClick={handleGenerate}
              type="button"
            >
              {generating ? t("generating") : t("generateQr")}
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-slate-500">
              {t("qrShowDescription")}
            </p>

            <div className="mt-6 flex justify-center">
              <div className="neu-inset rounded-2xl p-4">
                <QRCodeSVG
                  value={qrData}
                  size={192}
                  bgColor="transparent"
                  fgColor="#1e293b"
                  level="L"
                />
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-400">
              {t("expiresIn", { minutes: QR_EXPIRY_MINUTES })}
            </p>

            {/* Payload preview */}
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
                {t("viewPayload")}
              </summary>
              <pre className="neu-inset mt-2 max-h-40 overflow-auto rounded-xl p-3 text-[10px] text-slate-600">
                {qrData}
              </pre>
            </details>

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex-1 rounded-2xl border border-white/60 bg-(--hp-primary) px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft)"
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
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                onClick={() => {
                  setQrData(null);
                  setGrantedTo(null);
                  setSelectedDocId(null);
                  setRecipientId("");
                }}
                type="button"
              >
                {t("generateNew")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
