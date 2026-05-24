"use client";

import { useState, useEffect, useCallback } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
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
import { grantPermissionOnChain } from "@/actions/permissions/grant-permission-onchain";
import { getUserPublicKey } from "@/actions/auth/get-user-public-key";
import { rewrapKeyForRecipient } from "@/services/encryption/rewrap";
import { exportPublicKey } from "@/services/encryption/ecdh";
import { getKeyPair } from "@/services/encryption/keystore";
import { UserSelect } from "@/components/forms/UserSelect";
import { useKeyConflictStore } from "@/state/key-conflict.store";
import { Stethoscope, FlaskConical, Building2 } from "lucide-react";
import { savePermissionKey } from "@/actions/permissions/save-permission-key";
import { signMetaTransaction } from "@/lib/metatx/forwarder";
import PermissionManagerArtifact from "@/lib/abis/PermissionManager.json";

const PermissionManagerAbi = PermissionManagerArtifact.abi;
const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

async function getViemWalletClient(wallet: { getEthereumProvider: () => Promise<any> }) {
  const provider = await wallet.getEthereumProvider();
  return createWalletClient({ chain: HEALTHPROOF_CHAIN, transport: custom(provider) });
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
  const [results, setResults] = useState<DocumentSecretRow[]>([]);
  const [selectedResult, setSelectedResult] = useState<DocumentSecretRow | null>(null);
  const [loadingResults, setLoadingResults] = useState(true);
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

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  async function handleGenerate() {
    if (!selectedResult) {
      sileo.warning({ title: t("selectResultTitle"), description: t("selectResultDesc") });
      return;
    }
    if (!grantedTo) {
      sileo.warning({ title: t("selectRecipient"), description: t("selectRecipientDesc") });
      return;
    }
    const trimmedRecipient = recipientId.trim();
    if (!trimmedRecipient) {
      sileo.warning({ title: t("recipientRequired"), description: t("recipientRequiredDesc") });
      return;
    }
    if (!walletAddress) return;

    const activeWallet = wallets.find((w) => w.address);
    if (!activeWallet) {
      sileo.error({ title: t("generateFailed"), description: "No active wallet found" });
      return;
    }

    setGenerating(true);

    try {
      const recipientPubKeyJwk = await getUserPublicKey(trimmedRecipient);
      if (!recipientPubKeyJwk) {
        throw new Error(t("noRecipientKey"));
      }

      let senderPublicKeyJwk = selectedResult.uploader_public_key;
      if (!senderPublicKeyJwk) {
        senderPublicKeyJwk = await getUserPublicKey(selectedResult.uploader_wallet);
      }
      if (!senderPublicKeyJwk) {
        throw new Error(t("noLabPublicKey"));
      }

      const myWrappedKey =
        selectedResult.encrypted_keys[walletAddress.toLowerCase()] ??
        selectedResult.encrypted_keys[userId];
      if (!myWrappedKey) {
        throw new Error(t("noWrappedKey"));
      }

      const rewrapped = await rewrapKeyForRecipient({
        myUserId: userId,
        myWrappedKey,
        senderPublicKeyJwk,
        recipientPublicKeyJwk: recipientPubKeyJwk,
      });

      const myKeys = await getKeyPair(userId);
      if (!myKeys) {
        throw new Error(t("noPatientKeys"));
      }
      const myPublicKeyJwk = await exportPublicKey(myKeys.publicKey);

      const resolvedWalletAddress = walletAddress ?? userId;
      const documentId = selectedResult.document_id;

      const payload = buildPermissionPayload({
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

      // Persist rewrapped key so grantee can access without QR scan
      await savePermissionKey({
        document_id: documentId,
        patient_wallet: resolvedWalletAddress,
        grantee_wallet: trimmedRecipient,
        encrypted_key: JSON.stringify(rewrapped),
      });

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
        description: t("qrGeneratedDesc", { role: grantedTo.replace("_", " "), minutes: QR_EXPIRY_MINUTES }),
        duration: 4000,
      });
    } catch (e) {
      sileo.error({ title: t("generateFailed"), description: String(e).slice(0, 120) });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{tPage("title")}</h1>

      {keyConflict && (
        <div className="mb-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-700 border border-amber-200">
          {t("keyConflictWarning")}
        </div>
      )}

      <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-5">
        {/* Select document */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("selectDocument")}</label>
          {loadingResults ? (
            <p className="text-sm text-slate-400 py-2">{t("loadingDocuments")}</p>
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
                  <span className="font-semibold text-slate-700">{r.file_name ?? r.document_id.slice(0, 20) + "…"}</span>
                  <span className="ml-2 text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Select role */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("selectRole")}</label>
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
          <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("selectRecipient")}</label>
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
          disabled={generating || !selectedResult || !grantedTo || !recipientId.trim() || !!keyConflict}
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
            <p className="text-xs text-slate-500">{t("qrExpiresIn", { minutes: QR_EXPIRY_MINUTES })}</p>
            <button
              className="neu-surface hover:neu-pressed rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 transition-all"
              onClick={() => setQrData(null)}
              type="button"
            >
              {t("generateNew")}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
