"use client";

import { useWallets } from "@privy-io/react-auth";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { sileo } from "sileo";
import { createWalletClient, custom, keccak256, toHex } from "viem";
import { getDbUser } from "@/actions/auth/get-user";
import { getUserPublicKey } from "@/actions/auth/get-user-public-key";
import { registerDocumentOnChain } from "@/actions/documents/register-document-onchain";
import { saveDocumentSecret } from "@/actions/documents/save-document-secret";
import { UserSelect } from "@/components/forms/UserSelect";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "@/lib/contracts";
import {
  DOC_TYPE,
  NO_CLASSIFICATION,
  NO_STANDARD,
} from "@/lib/medical-constants";
import { signMetaTransaction } from "@/lib/metatx/forwarder";
import { isPdfFile } from "@/lib/validate-file";
import { exportPublicKey } from "@/services/encryption/ecdh";
import { getKeyPair } from "@/services/encryption/keystore";
import { uploadHybridEncryptedFile } from "@/services/storage/upload";
import { useKeyConflictStore } from "@/state/key-conflict.store";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

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

type UploadResultsModalProps = {
  onClose: () => void;
  labId: string;
};

type UploadedDoc = {
  id: string;
  fileName: string;
  fileHash: string;
  cid: string;
  iv: string;
  uploadedAt: string;
};

const STORAGE_KEY = "hp_uploaded_results";

function getStoredResults(): UploadedDoc[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function storeResult(doc: UploadedDoc) {
  const existing = getStoredResults();
  existing.unshift(doc);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function UploadResultsModal({
  onClose,
  labId,
}: UploadResultsModalProps) {
  const t = useTranslations("uploadModal");
  const { wallets } = useWallets();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [patientId, setPatientId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadedDoc | null>(null);
  const keyConflict = useKeyConflictStore((s) => s.conflict);
  const [dragging, setDragging] = useState(false);
  const dragCounter = useRef(0);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    if (dragCounter.current === 1) setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    if (!isPdfFile(dropped)) {
      sileo.error({
        title: t("uploadFailed"),
        description: t("invalidFileType"),
      });
      return;
    }
    setFile(dropped);
  }

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  async function handleUpload() {
    if (!file) return;

    const trimmedPatientId = patientId.trim();
    if (!trimmedPatientId) {
      sileo.warning({
        title: t("patientRequired"),
        description: t("patientRequiredDesc"),
      });
      return;
    }

    if (!isPdfFile(file)) {
      sileo.error({
        title: t("uploadFailed"),
        description: t("invalidFileType"),
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      sileo.error({
        title: t("uploadFailed"),
        description: t("fileTooLarge"),
      });
      return;
    }

    // Hard guard: verify encryption key backup exists
    const { checkKeyBackup } = await import("@/actions/auth/check-key-backup");
    const backupResult = await checkKeyBackup({ userId: labId });
    if (!backupResult.success || !backupResult.data?.hasBackup) {
      sileo.error({
        title: t("backupRequired"),
        description: t("backupRequiredDesc"),
      });
      return;
    }

    setUploading(true);
    try {
      // Get lab's key pair from IndexedDB
      const labKeys = await getKeyPair(labId);
      if (!labKeys?.publicKey || !labKeys?.privateKey) {
        throw new Error(t("noLabKeys"));
      }

      // Get patient's public key from DB
      const patientPubKeyJwk = await getUserPublicKey(trimmedPatientId);
      if (!patientPubKeyJwk) {
        throw new Error(t("noPatientKey"));
      }

      // Get lab's own public key for self-wrapping
      const labPubKeyJwk = await exportPublicKey(labKeys.publicKey);

      // Resolve wallet addresses for DB storage
      // patientId is already a wallet address from UserSelect
      const labResult = await getDbUser({ idOrWallet: labId });
      const labWallet =
        labResult.success && labResult.data && labResult.data.wallet_address
          ? labResult.data.wallet_address
          : "";
      if (!labWallet) throw new Error("NoLabWallet");
      const patientWallet = trimmedPatientId;

      // Hybrid encrypt: AES-GCM + wrap key for lab & patient
      const uploadResult = await uploadHybridEncryptedFile(
        file,
        labKeys.privateKey,
        labKeys.publicKey,
        [
          { wallet: labWallet, publicKeyJwk: labPubKeyJwk },
          { wallet: trimmedPatientId, publicKeyJwk: patientPubKeyJwk },
        ],
      );

      // Save encryption secrets to document_secrets table
      await saveDocumentSecret({
        document_id: uploadResult.ipfs.cid,
        file_name: file.name,
        uploader_wallet: labWallet,
        patient_wallet: patientWallet,
        iv: uploadResult.iv,
        encrypted_keys: uploadResult.encryptedKeys,
        uploader_public_key: labPubKeyJwk,
      });

      // Sign meta-tx for on-chain document registration via Gateway
      const activeWallet = wallets.find((w) => w.address);
      if (!activeWallet) throw new Error("No active wallet");

      const viemWallet = await getViemWalletClient(activeWallet);
      const documentId = keccak256(toHex(uploadResult.ipfs.cid));
      const clinicalHash = keccak256(toHex(uploadResult.fileHash));

      const registerRequest = await signMetaTransaction(
        viemWallet,
        CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
        "registerMedicalDocument",
        [
          documentId,
          patientWallet as `0x${string}`,
          "0x0000000000000000000000000000000000000000" as `0x${string}`, // institution
          ZERO_BYTES32, // documentType
          clinicalHash,
          ZERO_BYTES32, // episodeId
          uploadResult.ipfs.cid,
          ZERO_BYTES32, // standard
          ZERO_BYTES32, // classification
        ],
        HealthProofGatewayAbi,
      );

      // Register document on-chain
      const onChainResult = await registerDocumentOnChain({
        request: registerRequest,
        cid: uploadResult.ipfs.cid,
        fileHash: uploadResult.fileHash,
        patientWallet: patientWallet,
        documentType: DOC_TYPE.MEDICAL_RESULT,
        standard: NO_STANDARD,
        classification: NO_CLASSIFICATION,
        episodeId: ZERO_BYTES32,
      });
      if ("error" in onChainResult) {
        console.warn(
          "[UploadResultsModal] On-chain registration failed:",
          onChainResult.error,
        );
      }

      const doc: UploadedDoc = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileHash: uploadResult.fileHash,
        cid: uploadResult.ipfs.cid,
        iv: uploadResult.iv,
        uploadedAt: new Date().toISOString(),
      };

      storeResult(doc);
      setResult(doc);

      sileo.success({
        title: t("uploadComplete"),
        description: t("uploadCompleteDesc", { fileName: file.name }),
        duration: 4000,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("uploadFailed");
      sileo.error({
        title: t("uploadFailed"),
        description: message,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      role="dialog"
    >
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
            >
              <title>{t("close")}</title>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!result ? (
          <>
            <p className="mt-3 text-sm text-slate-500">{t("description")}</p>

            <div className="mt-5">
              <UserSelect
                value={patientId}
                onChange={setPatientId}
                label={t("patientId")}
                placeholder={t("patientIdPlaceholder")}
                filterRole="patient"
              />
            </div>

            <div className="mt-4">
              <button
                className={`neu-surface flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 transition ${
                  dragging
                    ? "border-sky-400 bg-sky-50/50 ring-2 ring-sky-200"
                    : "border-slate-300 hover:border-sky-300 hover:bg-sky-50/30"
                }`}
                onClick={() => fileRef.current?.click()}
                type="button"
              >
                <span className="text-3xl">{dragging ? "⬇️" : "📁"}</span>
                <span className="text-sm font-medium text-slate-600">
                  {file ? file.name : t("selectFile")}
                </span>
                {!file && (
                  <span className="text-xs text-slate-400">
                    {t("dragHint")}
                  </span>
                )}
                {file && (
                  <span className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                )}
              </button>
              <input
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  if (f && !isPdfFile(f)) {
                    sileo.error({
                      title: t("uploadFailed"),
                      description: t("invalidFileType"),
                    });
                    return;
                  }
                  setFile(f);
                }}
                ref={fileRef}
                type="file"
              />
            </div>

            <p className="mt-3 text-[11px] text-slate-400">{t("clientMode")}</p>

            {keyConflict && (
              <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-700">
                ⚠️ {t("keyConflict")}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex-1 rounded-2xl border border-white/60 bg-(--hp-primary) px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) disabled:opacity-50"
                disabled={!file || uploading || !!keyConflict}
                onClick={handleUpload}
                type="button"
              >
                {uploading ? t("encrypting") : t("encryptUpload")}
              </button>
              <button
                className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                onClick={onClose}
                type="button"
              >
                {t("cancel")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 flex flex-col items-center gap-3">
              <span className="text-4xl">✅</span>
              <p className="text-sm font-semibold text-slate-800">
                {t("fileUploaded")}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <div className="neu-inset rounded-xl p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {t("fileName")}
                </p>
                <p className="mt-0.5 text-sm text-slate-700 break-all">
                  {result.fileName}
                </p>
              </div>
              <div className="neu-inset rounded-xl p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {t("sha256")}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-600 break-all">
                  {result.fileHash}
                </p>
              </div>
              <div className="neu-inset rounded-xl p-3">
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {t("ipfsCid")}
                </p>
                <p className="mt-0.5 font-mono text-xs text-slate-600 break-all">
                  {result.cid}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                className="flex-1 rounded-2xl border border-white/60 bg-(--hp-primary) px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft)"
                onClick={() => {
                  setFile(null);
                  setResult(null);
                }}
                type="button"
              >
                {t("uploadAnother")}
              </button>
              <button
                className="rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:text-slate-700"
                onClick={onClose}
                type="button"
              >
                {t("done")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
