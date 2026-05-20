"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, keccak256, toHex } from "viem";
import { HEALTHPROOF_CHAIN, CONTRACT_ADDRESSES } from "@/lib/contracts";
import { signMetaTransaction } from "@/lib/metatx/forwarder";
import MedicalOrderRegistryAbi from "@/lib/abis/MedicalOrderRegistry.json";
import { uploadHybridEncryptedFile } from "@/services/storage/upload";
import { getKeyPair } from "@/services/encryption/keystore";
import { exportPublicKey } from "@/services/encryption/ecdh";
import { getUserPublicKey } from "@/actions/get-user-public-key";
import { getDbUser } from "@/actions/get-user";
import { saveDocumentSecret } from "@/actions/save-document-secret";
import { registerDocumentOnChain } from "@/actions/register-document-onchain";
import { updateOrderStatusOnChain } from "@/actions/medical-orders-onchain";
import { UserSelect } from "@/components/forms/UserSelect";
import { useKeyConflictStore } from "@/state/key-conflict.store";

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
    if (dropped) setFile(dropped);
  }, []);

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

  async function handleUpload() {
    if (!file || !walletAddress || !patientId.trim()) return;
    if (keyConflict) {
      sileo.error({ title: tModal("keyConflictTitle"), description: tModal("keyConflictDesc") });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      sileo.error({ title: t("uploadError"), description: t("fileTooLarge") });
      return;
    }
    setUploading(true);
    try {
      const labKeys = await getKeyPair(labId);
      if (!labKeys) throw new Error(tModal("noLabKeys"));

      const patientPubKeyJwk = await getUserPublicKey(patientId.trim());
      if (!patientPubKeyJwk) throw new Error(tModal("noPatientKey"));

      const labPubKeyJwk = await exportPublicKey(labKeys.publicKey);

      const uploadResult = await uploadHybridEncryptedFile(
        file,
        labKeys.privateKey,
        [
          { userId: labId, publicKeyJwk: labPubKeyJwk },
          { userId: patientId.trim(), publicKeyJwk: patientPubKeyJwk },
        ],
      );

      const labResult = await getDbUser({ idOrWallet: labId });
      const labWallet = (labResult.success && labResult.data?.wallet_address) ? labResult.data.wallet_address : "";

      await saveDocumentSecret({
        document_id: uploadResult.ipfs.cid,
        uploader_wallet: labWallet,
        patient_wallet: patientId.trim(),
        iv: uploadResult.iv,
        encrypted_keys: uploadResult.encryptedKeys as Record<string, unknown>,
        uploader_public_key: labPubKeyJwk,
      });

      await registerDocumentOnChain({
        cid: uploadResult.ipfs.cid,
        fileHash: uploadResult.fileHash,
        documentType: "MEDICAL_RESULT",
        patientWallet: patientId.trim(),
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
            CONTRACT_ADDRESSES.MedicalOrderRegistry,
            "updateStatus",
            [orderIdBytes, 2],
            MedicalOrderRegistryAbi,
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
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
          />
          {file ? (
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-700">{file.name}</p>
              <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="text-3xl">📁</span>
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
