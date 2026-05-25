"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Shield, UserCheck, Clock, ChevronRight } from "lucide-react";

export default function EmergencyPage() {
  const t = useTranslations("dashboard.emergency");
  const [activeTab, setActiveTab] = useState<"request" | "pending" | "history">("request");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{t("title")}</h1>
          <p className="text-sm text-slate-500">{t("description")}</p>
        </div>
      </div>

      <div className="mb-6 flex gap-2">
        <TabButton active={activeTab === "request"} onClick={() => setActiveTab("request")}>
          Request Access
        </TabButton>
        <TabButton active={activeTab === "pending"} onClick={() => setActiveTab("pending")}>
          Pending Approvals
        </TabButton>
        <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>
          History
        </TabButton>
      </div>

      <div className="neu-surface rounded-2xl p-6">
        {activeTab === "request" && <RequestTab />}
        {activeTab === "pending" && <PendingTab />}
        {activeTab === "history" && <HistoryTab />}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
        active
          ? "bg-sky-100 text-sky-700"
          : "text-slate-500 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function RequestTab() {
  const t = useTranslations("dashboard.emergency");

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-800">Request Emergency Access</h3>

      <div className="grid gap-4 sm:grid-cols-3">
        <PathCard
          icon={<Shield className="h-5 w-5" />}
          title={t("pathGuardian")}
          description="Requires an active guardian to approve. Access lasts 72 hours."
          color="sky"
        />
        <PathCard
          icon={<UserCheck className="h-5 w-5" />}
          title={t("pathDualDoctor")}
          description="Requires a second verified doctor as witness. Access lasts 4 hours."
          color="amber"
        />
        <PathCard
          icon={<Clock className="h-5 w-5" />}
          title={t("pathPatient")}
          description="Requires the conscious patient to self-approve. Unlimited duration."
          color="emerald"
        />
      </div>

      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
        <p className="font-medium">Important:</p>
        <p>{t("pathWarning")}</p>
      </div>
    </div>
  );
}

function PathCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "sky" | "amber" | "emerald";
}) {
  const colorClasses = {
    sky: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
    amber: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  };

  return (
    <div
      className={`cursor-pointer rounded-xl border p-4 transition-colors ${colorClasses[color]}`}
    >
      <div className="mb-2">{icon}</div>
      <p className="mb-1 font-semibold">{title}</p>
      <p className="text-xs opacity-80">{description}</p>
      <div className="mt-3 flex items-center text-xs font-medium">
        Learn more <ChevronRight className="ml-1 h-3 w-3" />
      </div>
    </div>
  );
}

function PendingTab() {
  return (
    <div className="py-8 text-center">
      <p className="text-slate-400">No pending emergency requests.</p>
    </div>
  );
}

function HistoryTab() {
  return (
    <div className="py-8 text-center">
      <p className="text-slate-400">No emergency access history.</p>
    </div>
  );
}
