"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallets } from "@privy-io/react-auth";
import { QRCodeSVG } from "qrcode.react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import type { GrantedToRole, EncryptedQRData } from "@/types/domain.types";
import { QR_EXPIRY_MINUTES } from "@/lib/constants";
import { buildPermissionPayload } from "@/features/permissions";
import {
  listExamResultsForUser,
  type ExamResultRow,
} from "@/actions/get-exam-result";
import { getUserPublicKey } from "@/actions/get-user-public-key";
import { rewrapKeyForRecipient } from "@/services/encryption/rewrap";
import { exportPublicKey } from "@/services/encryption/ecdh";
import { getKeyPair } from "@/services/encryption/keystore";
import { UserSelect } from "@/components/forms/UserSelect";

const GRANTED_ROLES: {
  key: GrantedToRole;
  labelKey: string;
  icon: string;
  dbRole: string;
}[] = [
  { key: "doctor", labelKey: "doctor", icon: "🩺", dbRole: "DOCTOR" },
  { key: "laboratory", labelKey: "laboratory", icon: "🔬", dbRole: "LAB" },
  {
    key: "medical_center",
    labelKey: "medicalCenter",
    icon: "🏥",
    dbRole: "DOCTOR",
  },
];

export function ShareResultsModal({
  onClose,
  patientId,
}: {
  onClose: () => void;
  patientId: string;
}) {
  const t = useTranslations("shareModal");
  const { wallets } = useWallets();
  const [grantedTo, setGrantedTo] = useState<GrantedToRole | null>(null);
  const [recipientId, setRecipientId] = useState("");
  const [results, setResults] = useState<ExamResultRow[]>([]);
  const [selectedResult, setSelectedResult] = useState<ExamResultRow | null>(
    null,
  );
  const [loadingResults, setLoadingResults] = useState(true);
  const [qrData, setQrData] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");

  const fetchResults = useCallback(async () => {
    setLoadingResults(true);
    try {
      const rows = await listExamResultsForUser(patientId);
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
    if (!selectedResult) {
      sileo.warning({
        title: t("selectResultTitle"),
        description: t("selectResultDesc"),
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

    setGenerating(true);

    try {
      console.log("[QR:1] patientId:", patientId);
      console.log("[QR:1] recipientId:", trimmedRecipient);
      console.log("[QR:1] selectedResult.id:", selectedResult.id);
      console.log(
        "[QR:1] encrypted_keys keys:",
        Object.keys(selectedResult.encrypted_keys ?? {}),
      );
      console.log(
        "[QR:1] encrypted_keys full:",
        JSON.stringify(selectedResult.encrypted_keys),
      );

      // 1. Get recipient's public key from DB
      const recipientPubKeyJwk = await getUserPublicKey(trimmedRecipient);
      console.log(
        "[QR:2] recipientPubKeyJwk:",
        recipientPubKeyJwk ? `${recipientPubKeyJwk.slice(0, 40)}...` : "NULL",
      );
      if (!recipientPubKeyJwk) {
        throw new Error(t("noRecipientKey"));
      }

      // 2. Get the uploader's public key (stored at upload time)
      const uploaderMeta = (
        selectedResult.encrypted_keys as Record<string, unknown>
      )?._uploader as { id: string; publicKey: string } | undefined;
      console.log(
        "[QR:3] uploaderMeta:",
        uploaderMeta
          ? { id: uploaderMeta.id, hasPublicKey: !!uploaderMeta.publicKey }
          : "NOT_FOUND",
      );

      let senderPublicKeyJwk: string;

      if (uploaderMeta?.publicKey) {
        senderPublicKeyJwk = uploaderMeta.publicKey;
        console.log("[QR:3] Using _uploader publicKey");
      } else {
        console.log("[QR:3] Fallback: looking for lab ID in encrypted_keys");
        const encryptedKeysEntries = Object.keys(
          selectedResult.encrypted_keys ?? {},
        );
        const labId = encryptedKeysEntries.find(
          (k) => k !== patientId && k !== "_uploader",
        );
        console.log("[QR:3] labId:", labId);
        if (!labId) {
          throw new Error(t("noLabKeyFound"));
        }
        const labPubKeyJwk = await getUserPublicKey(labId);
        console.log(
          "[QR:3] labPubKeyJwk:",
          labPubKeyJwk ? `${labPubKeyJwk.slice(0, 40)}...` : "NULL",
        );
        if (!labPubKeyJwk) {
          throw new Error(t("noLabPublicKey"));
        }
        senderPublicKeyJwk = labPubKeyJwk;
      }

      // 3. Re-wrap the AES key for the recipient
      const myWrappedKey = selectedResult.encrypted_keys[patientId];
      console.log(
        "[QR:4] myWrappedKey:",
        myWrappedKey
          ? { hasData: !!myWrappedKey.data, hasIv: !!myWrappedKey.iv }
          : "MISSING",
      );
      console.log(
        "[QR:4] senderPublicKeyJwk length:",
        senderPublicKeyJwk.length,
      );
      console.log(
        "[QR:4] recipientPubKeyJwk length:",
        recipientPubKeyJwk.length,
      );
      console.log("[QR:4] Calling rewrapKeyForRecipient...");

      const rewrapped = await rewrapKeyForRecipient({
        myUserId: patientId,
        myWrappedKey,
        senderPublicKeyJwk,
        recipientPublicKeyJwk: recipientPubKeyJwk,
      });
      console.log("[QR:5] rewrapped OK:", {
        hasData: !!rewrapped.data,
        hasIv: !!rewrapped.iv,
      });

      // 4. Get my public key to include in QR
      const myKeys = await getKeyPair(patientId);
      console.log(
        "[QR:6] myKeys from IndexedDB:",
        myKeys ? "FOUND" : "MISSING",
      );
      if (!myKeys) {
        throw new Error(t("noPatientKeys"));
      }
      const myPublicKeyJwk = await exportPublicKey(myKeys.publicKey);
      console.log("[QR:7] myPublicKeyJwk length:", myPublicKeyJwk.length);

      // 5. Build permission payload
      const payload = buildPermissionPayload({
        patientId,
        grantedToRole: grantedTo,
        resourceType: "RESULT",
        resourceId: selectedResult.id,
      });
      console.log(
        "[QR:8] payload built:",
        JSON.stringify(payload).slice(0, 80),
      );

      // 6. Sign with wallet
      const message = JSON.stringify(payload);
      let signature = "unsigned";
      let walletAddress = patientId;

      if (embeddedWallet) {
        console.log("[QR:9] Signing with wallet...");
        const provider = await embeddedWallet.getEthereumProvider();
        const accounts = (await provider.request({
          method: "eth_accounts",
        })) as string[];
        walletAddress = accounts[0] ?? embeddedWallet.address;
        signature = (await provider.request({
          method: "personal_sign",
          params: [message, walletAddress],
        })) as string;
        console.log("[QR:9] Signed. wallet:", walletAddress);
      } else {
        console.log("[QR:9] No embedded wallet, skipping sign");
      }

      // 7. Build encrypted QR data
      const qr: EncryptedQRData = {
        type: "healthproof_permission",
        payload,
        signature,
        wallet: walletAddress,
        crypto: {
          result_id: selectedResult.id,
          cid: selectedResult.cid,
          iv: selectedResult.iv,
          encrypted_key: rewrapped,
          patient_public_key: myPublicKeyJwk,
        },
      };

      console.log(
        "[QR:10] QR built successfully. Size:",
        JSON.stringify(qr).length,
        "bytes",
      );
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
                {t("selectResult")}
              </p>
              {loadingResults ? (
                <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
                  {t("loadingResults")}
                </div>
              ) : results.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">
                  {t("noResults")}
                </p>
              ) : (
                <div className="max-h-36 space-y-1.5 overflow-y-auto">
                  {results.map((r) => (
                    <button
                      className={`w-full rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                        selectedResult?.id === r.id
                          ? "neu-pressed border border-sky-200 text-sky-700"
                          : "neu-surface border border-transparent text-slate-600 hover:border-slate-200"
                      }`}
                      key={r.id}
                      onClick={() => setSelectedResult(r)}
                      type="button"
                    >
                      <p className="truncate font-mono text-[11px]">
                        CID: {r.cid.slice(0, 20)}...
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {new Date(r.created_at).toLocaleDateString()}
                      </p>
                    </button>
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
                    <span className="text-xl">{role.icon}</span>
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
                  dbRole={
                    GRANTED_ROLES.find((r) => r.key === grantedTo)?.dbRole ??
                    "DOCTOR"
                  }
                  value={recipientId}
                  onChange={setRecipientId}
                  label={t("recipientId")}
                  placeholder={t("recipientIdPlaceholder")}
                  excludeId={patientId}
                />
              </div>
            )}

            {/* Expiry info */}
            <p className="mt-4 text-[11px] text-slate-400">
              {t("expiryInfo", { minutes: QR_EXPIRY_MINUTES })}{" "}
              {embeddedWallet ? t("walletSigned") : t("noWallet")}
            </p>

            {/* Generate button */}
            <button
              className="mt-6 w-full rounded-2xl border border-white/60 bg-(--hp-primary) px-6 py-3 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) active:translate-y-px disabled:opacity-60"
              disabled={generating || !selectedResult}
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
                  setSelectedResult(null);
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
