"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/types/domain.types";
import { AdminPanel } from "./AdminPanel";
import { EmergencyAccessModal } from "./EmergencyAccessModal";
import { ACTION_ICONS } from "@/lib/icons";

type ActionDef = {
  id: string;
  titleKey: string;
  descKey: string;
  iconKey: string;
  disabled: boolean;
  tagKey?: string;
};

const ROLE_ACTIONS: Partial<Record<UserRole, ActionDef[]>> = {
  patient: [
    { id: "share-results", titleKey: "shareResults", descKey: "shareResultsDesc", iconKey: "share-results", disabled: false },
    { id: "my-documents", titleKey: "myDocuments", descKey: "myDocumentsDesc", iconKey: "my-documents", disabled: false },
    { id: "my-orders", titleKey: "myOrders", descKey: "myOrdersDesc", iconKey: "my-orders", disabled: false },
  ],
  lab: [
    { id: "upload-results", titleKey: "uploadResults", descKey: "uploadResultsDesc", iconKey: "upload-results", disabled: false },
    { id: "scan-qr", titleKey: "scanQr", descKey: "scanQrDescLab", iconKey: "scan-qr", disabled: false },
    { id: "pending-orders", titleKey: "pendingOrders", descKey: "pendingOrdersDesc", iconKey: "pending-orders", disabled: false },
  ],
  doctor: [
    { id: "scan-qr", titleKey: "scanQr", descKey: "scanQrDescMc", iconKey: "scan-qr", disabled: false },
    { id: "emergency-access", titleKey: "emergencyAccess", descKey: "emergencyAccessDesc", iconKey: "emergency-access", disabled: false, tagKey: "breakGlassTag" },
  ],
  admin: [
    { id: "admin-panel", titleKey: "adminPanel", descKey: "adminPanelDesc", iconKey: "admin-panel", disabled: false },
    { id: "create-order", titleKey: "createOrder", descKey: "createOrderDesc", iconKey: "create-order", disabled: false },
    { id: "scan-qr", titleKey: "scanQr", descKey: "scanQrDescMc", iconKey: "scan-qr", disabled: false },
  ],
};

const NAVIGATION_MAP: Record<string, string> = {
  "my-orders": "/dashboard/my-orders",
  "my-episodes": "/dashboard/my-episodes",
  "share-results": "/dashboard/share",
  "upload-results": "/dashboard/upload",
  "scan-qr": "/dashboard/scan",
  "my-documents": "/dashboard/documents",
  "active-permissions": "/dashboard/permissions",
  "create-order": "/dashboard/orders",
  "manage-episodes": "/dashboard/episodes",
  "pending-orders": "/dashboard/lab-orders",
  "results-history": "/dashboard/documents",
};

export function DashboardActions({
  role,
}: {
  role: UserRole;
}) {
  const t = useTranslations("dashboard.actions");
  const router = useRouter();
  const actions = ROLE_ACTIONS[role] ?? [];
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);

  function handleActionClick(actionId: string) {
    if (actionId === "admin-panel") {
      setIsAdminOpen(true);
      return;
    }
    if (actionId === "emergency-access") {
      setIsEmergencyOpen(true);
      return;
    }
    const path = NAVIGATION_MAP[actionId];
    if (path) {
      router.push(path);
    }
  }

  return (
    <>
      <div className="mt-8">
        <h2 className="mb-5 text-lg font-bold text-slate-800">{t("title")}</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action.iconKey];
            return (
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
                {Icon && <Icon className="h-6 w-6 text-sky-600" />}
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
            );
          })}
        </div>
      </div>

      {isAdminOpen && (
        <AdminPanel onClose={() => setIsAdminOpen(false)} />
      )}

      {isEmergencyOpen && (
        <EmergencyAccessModal onClose={() => setIsEmergencyOpen(false)} />
      )}
    </>
  );
}
