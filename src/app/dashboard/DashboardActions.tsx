"use client";

import { sileo } from "sileo";
import type { UserRole } from "@/types/domain.types";
import { useUiStore } from "@/state/ui.store";
import { ShareResultsModal } from "./ShareResultsModal";

type ActionCard = {
  id: string;
  title: string;
  description: string;
  icon: string;
  disabled: boolean;
  tag?: string;
};

const ROLE_ACTIONS: Record<UserRole, ActionCard[]> = {
  patient: [
    {
      id: "share-results",
      title: "Share Results",
      description:
        "Generate a temporary QR code to grant access to a doctor or lab.",
      icon: "📤",
      disabled: false,
    },
    {
      id: "my-documents",
      title: "My Documents",
      description: "View and manage your encrypted medical documents.",
      icon: "📄",
      disabled: true,
      tag: "Backend required",
    },
    {
      id: "active-permissions",
      title: "Active Permissions",
      description: "Review and revoke access permissions you have granted.",
      icon: "🔐",
      disabled: true,
      tag: "Backend required",
    },
    {
      id: "audit-log",
      title: "Audit Log",
      description: "View the on-chain history of all access events.",
      icon: "📋",
      disabled: true,
      tag: "Contracts required",
    },
    {
      id: "connect-wallet",
      title: "Connect Wallet",
      description: "Link your wallet to sign permissions cryptographically.",
      icon: "🔗",
      disabled: true,
      tag: "Wallet integration pending",
    },
  ],
  laboratory: [
    {
      id: "scan-qr",
      title: "Scan Patient QR",
      description:
        "Scan a patient's QR code to receive access to their results.",
      icon: "📷",
      disabled: false,
    },
    {
      id: "upload-results",
      title: "Upload Results",
      description: "Upload encrypted exam results linked to a medical order.",
      icon: "📤",
      disabled: true,
      tag: "Backend required",
    },
    {
      id: "pending-orders",
      title: "Pending Orders",
      description: "View medical orders assigned to your laboratory.",
      icon: "📋",
      disabled: true,
      tag: "Backend required",
    },
    {
      id: "results-history",
      title: "Results History",
      description: "Browse all results uploaded by your laboratory.",
      icon: "🗂️",
      disabled: true,
      tag: "Backend required",
    },
  ],
  medical_center: [
    {
      id: "scan-qr",
      title: "Scan Patient QR",
      description:
        "Verify a patient's identity and access their authorized records.",
      icon: "📷",
      disabled: false,
    },
    {
      id: "create-order",
      title: "Create Order",
      description: "Issue a new medical order for a patient examination.",
      icon: "📝",
      disabled: true,
      tag: "Backend required",
    },
    {
      id: "verify-results",
      title: "Verify Results",
      description:
        "Check the integrity and on-chain registration of lab results.",
      icon: "✅",
      disabled: true,
      tag: "Contracts required",
    },
    {
      id: "patient-records",
      title: "Patient Records",
      description:
        "Access authorized patient records via verified permissions.",
      icon: "🗂️",
      disabled: true,
      tag: "Backend required",
    },
  ],
};

export function DashboardActions({
  role,
  userId,
}: {
  role: UserRole;
  userId: string;
}) {
  const actions = ROLE_ACTIONS[role];
  const { isQrModalOpen, openQrModal, closeQrModal } = useUiStore();

  function handleActionClick(actionId: string) {
    switch (actionId) {
      case "share-results":
        openQrModal();
        break;
      case "scan-qr":
        sileo.info({
          title: "Coming soon",
          description:
            "QR scanner will be available when the backend is ready.",
        });
        break;
      default:
        break;
    }
  }

  return (
    <>
      <div className="mt-8">
        <h2 className="mb-5 text-lg font-bold text-slate-800">Actions</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => (
            <button
              className={`group relative flex flex-col items-start gap-2 rounded-2xl border border-white/70 p-4 sm:p-6 text-left transition-all duration-200 ${
                action.disabled
                  ? "neu-surface cursor-not-allowed opacity-60"
                  : "neu-surface hover:neu-pressed cursor-pointer"
              }`}
              disabled={action.disabled}
              key={action.id}
              onClick={() => handleActionClick(action.id)}
              type="button"
            >
              <span className="text-2xl">{action.icon}</span>
              <p className="text-sm font-semibold text-slate-800">
                {action.title}
              </p>
              <p className="text-xs text-slate-500">{action.description}</p>
              {action.tag && (
                <span className="mt-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-400">
                  {action.tag}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {isQrModalOpen && (
        <ShareResultsModal onClose={closeQrModal} patientId={userId} />
      )}
    </>
  );
}
