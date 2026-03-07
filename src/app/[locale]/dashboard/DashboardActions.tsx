"use client";

import { useState } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/types/domain.types";
import { useUiStore } from "@/state/ui.store";
import { ShareResultsModal } from "./ShareResultsModal";
import { UploadResultsModal } from "./UploadResultsModal";

type ActionDef = {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  disabled: boolean;
  tagKey?: string;
};

const ROLE_ACTIONS: Record<UserRole, ActionDef[]> = {
  patient: [
    {
      id: "share-results",
      titleKey: "shareResults",
      descKey: "shareResultsDesc",
      icon: "📤",
      disabled: false,
    },
    {
      id: "my-documents",
      titleKey: "myDocuments",
      descKey: "myDocumentsDesc",
      icon: "📄",
      disabled: true,
      tagKey: "tags.backendRequired",
    },
    {
      id: "active-permissions",
      titleKey: "activePermissions",
      descKey: "activePermissionsDesc",
      icon: "🔐",
      disabled: true,
      tagKey: "tags.backendRequired",
    },
    {
      id: "audit-log",
      titleKey: "auditLog",
      descKey: "auditLogDesc",
      icon: "📋",
      disabled: true,
      tagKey: "tags.contractsRequired",
    },
    {
      id: "connect-wallet",
      titleKey: "connectWallet",
      descKey: "connectWalletDesc",
      icon: "🔗",
      disabled: true,
      tagKey: "tags.walletPending",
    },
  ],
  laboratory: [
    {
      id: "scan-qr",
      titleKey: "scanQr",
      descKey: "scanQrDescLab",
      icon: "📷",
      disabled: false,
    },
    {
      id: "upload-results",
      titleKey: "uploadResults",
      descKey: "uploadResultsDesc",
      icon: "📤",
      disabled: false,
    },
    {
      id: "pending-orders",
      titleKey: "pendingOrders",
      descKey: "pendingOrdersDesc",
      icon: "📋",
      disabled: true,
      tagKey: "tags.backendRequired",
    },
    {
      id: "results-history",
      titleKey: "resultsHistory",
      descKey: "resultsHistoryDesc",
      icon: "🗂️",
      disabled: true,
      tagKey: "tags.backendRequired",
    },
  ],
  medical_center: [
    {
      id: "scan-qr",
      titleKey: "scanQr",
      descKey: "scanQrDescMc",
      icon: "📷",
      disabled: false,
    },
    {
      id: "create-order",
      titleKey: "createOrder",
      descKey: "createOrderDesc",
      icon: "📝",
      disabled: true,
      tagKey: "tags.backendRequired",
    },
    {
      id: "verify-results",
      titleKey: "verifyResults",
      descKey: "verifyResultsDesc",
      icon: "✅",
      disabled: true,
      tagKey: "tags.contractsRequired",
    },
    {
      id: "patient-records",
      titleKey: "patientRecords",
      descKey: "patientRecordsDesc",
      icon: "🗂️",
      disabled: true,
      tagKey: "tags.backendRequired",
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
  const t = useTranslations("dashboard.actions");
  const actions = ROLE_ACTIONS[role];
  const { isQrModalOpen, openQrModal, closeQrModal } = useUiStore();
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  function handleActionClick(actionId: string) {
    switch (actionId) {
      case "share-results":
        openQrModal();
        break;
      case "upload-results":
        setIsUploadOpen(true);
        break;
      case "scan-qr":
        sileo.info({
          title: t("comingSoon"),
          description: t("comingSoonDesc"),
        });
        break;
      default:
        break;
    }
  }

  return (
    <>
      <div className="mt-8">
        <h2 className="mb-5 text-lg font-bold text-slate-800">{t("title")}</h2>
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
                {t(action.titleKey)}
              </p>
              <p className="text-xs text-slate-500">{t(action.descKey)}</p>
              {action.tagKey && (
                <span className="mt-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-400">
                  {t(action.tagKey)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {isQrModalOpen && (
        <ShareResultsModal onClose={closeQrModal} patientId={userId} />
      )}

      {isUploadOpen && (
        <UploadResultsModal onClose={() => setIsUploadOpen(false)} />
      )}
    </>
  );
}
