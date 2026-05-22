"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { UserRole } from "@/types/domain.types";
import { AdminPanel } from "./AdminPanel";

type ActionDef = {
  id: string;
  titleKey: string;
  descKey: string;
  icon: string;
  disabled: boolean;
  tagKey?: string;
};

const ROLE_ACTIONS: Partial<Record<UserRole, ActionDef[]>> = {
  patient: [
    { id: "share-results", titleKey: "shareResults", descKey: "shareResultsDesc", icon: "📤", disabled: false },
    { id: "my-documents", titleKey: "myDocuments", descKey: "myDocumentsDesc", icon: "📄", disabled: false },
    { id: "my-orders", titleKey: "myOrders", descKey: "myOrdersDesc", icon: "�", disabled: false },
  ],
  lab: [
    { id: "upload-results", titleKey: "uploadResults", descKey: "uploadResultsDesc", icon: "�", disabled: false },
    { id: "scan-qr", titleKey: "scanQr", descKey: "scanQrDescLab", icon: "📷", disabled: false },
    { id: "pending-orders", titleKey: "pendingOrders", descKey: "pendingOrdersDesc", icon: "📋", disabled: false },
  ],
  doctor: [
    { id: "scan-qr", titleKey: "scanQr", descKey: "scanQrDescMc", icon: "📷", disabled: false },
    { id: "create-order", titleKey: "createOrder", descKey: "createOrderDesc", icon: "📝", disabled: false },
    { id: "manage-episodes", titleKey: "manageEpisodes", descKey: "manageEpisodesDesc", icon: "🏥", disabled: false },
  ],
  admin: [
    { id: "admin-panel", titleKey: "adminPanel", descKey: "adminPanelDesc", icon: "⚙️", disabled: false },
    { id: "create-order", titleKey: "createOrder", descKey: "createOrderDesc", icon: "📝", disabled: false },
    { id: "scan-qr", titleKey: "scanQr", descKey: "scanQrDescMc", icon: "📷", disabled: false },
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

  function handleActionClick(actionId: string) {
    if (actionId === "admin-panel") {
      setIsAdminOpen(true);
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

      {isAdminOpen && (
        <AdminPanel onClose={() => setIsAdminOpen(false)} />
      )}
    </>
  );
}
