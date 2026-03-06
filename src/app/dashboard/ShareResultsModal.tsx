"use client";

import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { sileo } from "sileo";
import type { GrantedToRole, ResourceType } from "@/types/domain.types";
import { QR_EXPIRY_MINUTES } from "@/lib/constants";
import { buildPermissionPayload, encodeQRData } from "@/features/permissions";

const GRANTED_ROLES: { key: GrantedToRole; label: string; icon: string }[] = [
  { key: "doctor", label: "Doctor", icon: "🩺" },
  { key: "laboratory", label: "Laboratory", icon: "🔬" },
  { key: "medical_center", label: "Medical Center", icon: "🏥" },
];

const RESOURCE_TYPES: { key: ResourceType; label: string }[] = [
  { key: "RESULT", label: "Exam Result" },
  { key: "ORDER", label: "Medical Order" },
  { key: "DOCUMENT", label: "Document" },
];

export function ShareResultsModal({
  onClose,
  patientId,
}: {
  onClose: () => void;
  patientId: string;
}) {
  const [grantedTo, setGrantedTo] = useState<GrantedToRole | null>(null);
  const [resourceType, setResourceType] = useState<ResourceType | null>(null);
  const [qrData, setQrData] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function handleGenerate() {
    if (!grantedTo) {
      sileo.warning({
        title: "Select a recipient",
        description: "Choose who you want to share access with.",
      });
      return;
    }
    if (!resourceType) {
      sileo.warning({
        title: "Select a resource type",
        description: "Choose what type of resource to share.",
      });
      return;
    }

    setGenerating(true);

    const payload = buildPermissionPayload({
      patientId,
      grantedToRole: grantedTo,
      resourceType,
      resourceId: "demo-resource-id",
    });

    // TODO: When wallet is connected, use generateSignedQR() instead
    const qr = {
      type: "healthproof_permission" as const,
      payload,
      signature: "unsigned-demo",
      wallet: "not-connected",
    };

    setQrData(encodeQRData(qr));
    setGenerating(false);

    sileo.success({
      title: "QR Generated",
      description: `Permission QR for ${grantedTo.replace("_", " ")} created. Expires in ${QR_EXPIRY_MINUTES} minutes.`,
      duration: 4000,
    });
  }

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="neu-shell mx-4 w-full max-w-lg border border-white/70 p-5 sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Share Results</h2>
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
              aria-label="Close"
            >
              <title>Close</title>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!qrData ? (
          <>
            <p className="mt-3 text-sm text-slate-500">
              Generate a temporary QR code to grant access to your medical data.
            </p>

            {/* Recipient role */}
            <div className="mt-6">
              <p className="mb-2 text-xs font-medium text-slate-700">
                Share with
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
                      {role.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resource type */}
            <div className="mt-5">
              <p className="mb-2 text-xs font-medium text-slate-700">
                Resource type
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
                    {rt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Expiry info */}
            <p className="mt-4 text-[11px] text-slate-400">
              QR expires in {QR_EXPIRY_MINUTES} minutes. Wallet signature
              required for on-chain registration (coming soon).
            </p>

            {/* Generate button */}
            <button
              className="mt-6 w-full rounded-2xl border border-white/60 bg-(--hp-primary) px-6 py-3 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) active:translate-y-px disabled:opacity-60"
              disabled={generating}
              onClick={handleGenerate}
              type="button"
            >
              {generating ? "Generating..." : "Generate QR"}
            </button>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-slate-500">
              Show this QR code to the recipient. It contains a signed
              permission payload.
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
              Expires in {QR_EXPIRY_MINUTES} minutes
            </p>

            {/* Payload preview */}
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
                View payload
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
                    title: "Copied!",
                    description: "QR payload copied to clipboard.",
                  });
                }}
                type="button"
              >
                Copy payload
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
                Generate new
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
