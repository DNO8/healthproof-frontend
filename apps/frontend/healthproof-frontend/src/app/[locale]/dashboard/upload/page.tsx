"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, keccak256, toHex, stringToHex } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { signMetaTransaction } from "@/lib/metatx/forwarder";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";

import { uploadHybridEncryptedFile } from "@/services/storage/upload";
import { getKeyPair } from "@/services/encryption/keystore";
import { exportPublicKey } from "@/services/encryption/ecdh";
import { getUserPublicKey } from "@/actions/auth/get-user-public-key";
import { saveDocumentSecret } from "@/actions/documents/save-document-secret";
import { registerDocumentOnChain } from "@/actions/documents/register-document-onchain";
import { updateOrderStatusOnChain } from "@/actions/medical-orders/medical-orders-onchain";
import { UserSelect } from "@/components/forms/UserSelect";
import { useKeyConflictStore } from "@/state/key-conflict.store";
import { Upload } from "lucide-react";
import { isPdfFile } from "@/lib/validate-file";

const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

async function getViemWalletClient(wallet: { getEthereumProvider: () => Promise<unknown> }) {
  const provider = await wallet.getEthereumProvider() as { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
  return createWalletClient({ chain: HEALTHPROOF_CHAIN, transport: custom(provider) });
}

export default function UploadPage() {
  const t = useTranslations("dashboard.upload");
  const router = useRouter();
  const tModal = useTranslations("uploadModal");
  const walletAddress = useWalletAddress();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const labId = user?.id ?? "";
  const searchParams = useSearchParams();
  const linkedOrderId = searchParams.get("orderId");
  const linkedPatientWallet = searchParams.get("patientWallet");
  const [patientId, setPatientId] = useState(linkedPatientWallet ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const keyConflict = useKeyConflictStore((s) => s.conflict);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    if (!isPdfFile(dropped)) {
      sileo.error({ title: tModal("uploadFailed"), description: tModal("invalidFileType") });
      return;
    }
    setFile(dropped);
  }, [tModal]);

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  async function handleUpload() {
    if (!file || !walletAddress || !patientId.trim()) return;
    if (keyConflict) {
      sileo.error({ title: tModal("keyConflictTitle"), description: tModal("keyConflictDesc") });
      return;
    }
    if (!isPdfFile(file)) {
      sileo.error({ title: tModal("uploadFailed"), description: tModal("invalidFileType") });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      sileo.error({ title: t("uploadError"), description: t("fileTooLarge") });
      return;
    }
    setUploading(true);
    try {
      const labKeys = await getKeyPair(labId);
      if (!labKeys?.publicKey || !labKeys?.privateKey) throw new Error(tModal("noLabKeys"));

      const patientPubKeyJwk = await getUserPublicKey(patientId.trim());
      if (!patientPubKeyJwk) throw new Error(tModal("noPatientKey"));

      const labPubKeyJwk = await exportPublicKey(labKeys.publicKey);

      const uploadResult = await uploadHybridEncryptedFile(
        file,
        labKeys.privateKey,
        [
          { userId: walletAddress!, publicKeyJwk: labPubKeyJwk },
          { userId: patientId.trim(), publicKeyJwk: patientPubKeyJwk },
        ],
      );

      // Normalize encrypted_keys to use lowercase wallet addresses
      const normalizedEncryptedKeys: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(uploadResult.encryptedKeys)) {
        const normalizedKey = key.startsWith("0x") ? key.toLowerCase() : key;
        normalizedEncryptedKeys[normalizedKey] = value;
      }

      // 1. Sign meta-tx for on-chain document registration via Gateway
      const activeWallet = wallets.find((w) => w.address);
      if (!activeWallet) throw new Error("No active wallet");

      const viemWallet = await getViemWalletClient(activeWallet);
      const documentId = keccak256(toHex(uploadResult.ipfs.cid));
      const clinicalHash = keccak256(toHex(uploadResult.fileHash));
      const documentType = stringToHex("MEDICAL_RESULT", { size: 32 });

      const registerRequest = await signMetaTransaction(
        viemWallet,
        CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
        "registerMedicalDocument",
        [
          documentId,
          patientId.trim() as `0x${string}`,
          "0x0000000000000000000000000000000000000000" as `0x${string}`, // institution
          documentType,
          clinicalHash,
          ZERO_BYTES32, // episodeId
          uploadResult.ipfs.cid,
          ZERO_BYTES32, // standard
          ZERO_BYTES32, // classification
        ],
        HealthProofGatewayAbi,
      );

      // 2. Register on-chain FIRST — if this fails, no DB record is created
      await registerDocumentOnChain({
        request: registerRequest,
        cid: uploadResult.ipfs.cid,
        fileHash: uploadResult.fileHash,
        documentType: "MEDICAL_RESULT",
        patientWallet: patientId.trim(),
      });

      // 3. Save to DB only after on-chain success
      await saveDocumentSecret({
        document_id: uploadResult.ipfs.cid,
        file_name: file.name,
        uploader_wallet: walletAddress!,
        patient_wallet: patientId.trim(),
        iv: uploadResult.iv,
        encrypted_keys: normalizedEncryptedKeys,
        uploader_public_key: labPubKeyJwk,
      });

      // If linked to an order, update its status to COMPLETED (2) via meta-tx
      if (linkedOrderId) {
        try {
          const activeWallet = wallets.find((w) => w.address);
          if (!activeWallet) throw new Error("No active wallet");

          const provider = await activeWallet.getEthereumProvider();
          const viemWallet = createWalletClient({ chain: HEALTHPROOF_CHAIN, transport: custom(provider) });

          const orderIdBytes =
            linkedOrderId.startsWith("0x") && linkedOrderId.length === 66
              ? (linkedOrderId as `0x${string}`)
              : keccak256(toHex(linkedOrderId));

          const request = await signMetaTransaction(
            viemWallet,
            CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
            "updateOrderStatusViaGateway",
            [orderIdBytes, 2, walletAddress],
            HealthProofGatewayAbi,
          );

          await updateOrderStatusOnChain({ request, orderId: linkedOrderId, status: 2 });
          sileo.success({ title: t("uploadSuccess"), description: t("orderCompleted") });
          router.push("/dashboard/lab-orders");
          return;
        } catch (err) {
          console.error("[upload] Order status update failed:", err);
          sileo.warning({ title: t("uploadSuccess"), description: t("orderStatusFailed") });
        }
      } else {
        sileo.success({ title: t("uploadSuccess"), description: `CID: ${uploadResult.ipfs.cid.slice(0, 20)}…` });
      }

      setFile(null);
      setPatientId(linkedPatientWallet ?? "");
    } catch (e) {
      sileo.error({ title: t("uploadError"), description: String(e).slice(0, 120) });
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>

      {linkedOrderId && (
        <div className="mb-4 rounded-xl bg-sky-50 p-4 text-sm text-sky-700 border border-sky-200">
          <p className="font-semibold">{t("linkedOrder")}</p>
          <p className="font-mono text-xs mt-1">{linkedOrderId.slice(0, 20)}…{linkedOrderId.slice(-8)}</p>
          {linkedPatientWallet && (
            <p className="text-xs mt-1">{t("patientLabel")}: {linkedPatientWallet.slice(0, 8)}…{linkedPatientWallet.slice(-4)}</p>
          )}
        </div>
      )}

      {keyConflict && (
        <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-700 border border-amber-200">
          {tModal("keyConflictWarning")}
        </div>
      )}

      <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("patientLabel")}</label>
          <UserSelect
            value={patientId}
            onChange={setPatientId}
            label=""
            placeholder={t("patientPlaceholder")}
            filterRole="patient"
            excludeWallet={walletAddress ?? undefined}
          />
        </div>

        <div
          className="neu-inset rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center cursor-pointer transition-colors hover:border-sky-300"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) { setFile(null); return; }
              if (!isPdfFile(f)) {
                sileo.error({ title: tModal("uploadFailed"), description: tModal("invalidFileType") });
                return;
              }
              setFile(f);
            }}
          />
          {file ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="h-8 w-8 text-sky-600 mx-auto" />
              <p className="text-sm text-slate-600">{t("dropOrClick")}</p>
              <p className="text-xs text-slate-400">{t("fileTypes")}</p>
            </div>
          )}
        </div>

        <button
          className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
          disabled={uploading || !file || !patientId.trim() || !!keyConflict}
          onClick={handleUpload}
          type="button"
        >
          {uploading ? t("uploading") : t("uploadButton")}
        </button>
      </div>
    </main>
  );
}
