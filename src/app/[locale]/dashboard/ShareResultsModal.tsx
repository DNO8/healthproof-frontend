"use client";

import { useState } from "react";
import { useWallets } from "@privy-io/react-auth";
import { QRCodeSVG } from "qrcode.react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import type { GrantedToRole, ResourceType } from "@/types/domain.types";
import { QR_EXPIRY_MINUTES } from "@/lib/constants";
import { buildPermissionPayload, encodeQRData } from "@/features/permissions";

const GRANTED_ROLES: { key: GrantedToRole; labelKey: string; icon: string }[] =
  [
    { key: "doctor", labelKey: "doctor", icon: "🩺" },
    { key: "laboratory", labelKey: "laboratory", icon: "🔬" },
    { key: "medical_center", labelKey: "medicalCenter", icon: "🏥" },
  ];

const RESOURCE_TYPES: { key: ResourceType; labelKey: string }[] = [
  { key: "RESULT", labelKey: "examResult" },
  { key: "ORDER", labelKey: "medicalOrder" },
  { key: "DOCUMENT", labelKey: "document" },
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
  const [resourceType, setResourceType] = useState<ResourceType | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const embeddedWallet = wallets.find((w) => w.walletClientType === "privy");

  async function handleGenerate() {
    if (!grantedTo) {
      sileo.warning({
        title: t("selectRecipient"),
        description: t("selectRecipientDesc"),
      });
      return;
    }
    if (!resourceType) {
      sileo.warning({
        title: t("selectResource"),
        description: t("selectResourceDesc"),
      });
      return;
    }

    setGenerating(true);

    try {
      const payload = buildPermissionPayload({
        patientId,
        grantedToRole: grantedTo,
        resourceType,
        resourceId: `${resourceType.toLowerCase()}-${patientId.slice(-8)}`,
      });

      const message = JSON.stringify(payload);
      let signature = "unsigned";
      let walletAddress = patientId;

      if (embeddedWallet) {
        const provider = await embeddedWallet.getEthereumProvider();
        const accounts = (await provider.request({
          method: "eth_accounts",
        })) as string[];
        walletAddress = accounts[0] ?? embeddedWallet.address;
        signature = (await provider.request({
          method: "personal_sign",
          params: [message, walletAddress],
        })) as string;
      }

      const qr = {
        type: "healthproof_permission" as const,
        payload,
        signature,
        wallet: walletAddress,
      };

      setQrData(encodeQRData(qr));

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
      sileo.error({
        title: t("errorTitle"),
        description: t("errorDesc"),
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

            {/* Recipient role */}
            <div className="mt-6">
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
                    onClick={() => setGrantedTo(role.key)}
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

            {/* Resource type */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-slate-700">
                {t("resourceType")}
              </p>
              <div className="flex flex-wrap gap-2">
                {RESOURCE_TYPES.map((rt) => (
                  <button
                    className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                      resourceType === rt.key
                        ? "neu-pressed text-sky-700"
                        : "neu-chip text-slate-600 hover:text-slate-800"
                    }`}
                    key={rt.key}
                    onClick={() => setResourceType(rt.key)}
                    type="button"
                  >
                    {t(rt.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry info */}
            <p className="mt-4 text-[11px] text-slate-400">
              {t("expiryInfo", { minutes: QR_EXPIRY_MINUTES })}{" "}
              {embeddedWallet ? t("walletSigned") : t("noWallet")}
            </p>

            {/* Generate button */}
            <button
              className="mt-6 w-full rounded-2xl border border-white/60 bg-(--hp-primary) px-6 py-3 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) active:translate-y-px disabled:opacity-60"
              disabled={generating}
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
                  level="M"
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
                  setResourceType(null);
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
