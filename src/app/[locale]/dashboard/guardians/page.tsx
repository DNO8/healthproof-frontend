"use client";

import { useState, useEffect } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { listGuardiansOnChain } from "@/actions/guardians/list-guardians-onchain";
import { revokeGuardianshipOnChain } from "@/actions/guardians/revoke-guardianship-onchain";
import { grantGuardianshipOnChain } from "@/actions/guardians/grant-guardianship-onchain";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import { truncateAddress } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserSelect } from "@/components/forms/UserSelect";
import { EmptyState, SkeletonList } from "@/components/ui";
import { User, UserX, ShieldOff } from "lucide-react";
import type { OnChainGuardianship } from "@/lib/medical-constants";

type Tab = "list" | "assign" | "revoke";

const GUARDIANSHIP_TYPES = [
  { value: 0, labelKey: "typeParental" },
  { value: 1, labelKey: "typeLegalTutor" },
  { value: 2, labelKey: "typeCourtAppointed" },
  { value: 3, labelKey: "typeVoluntary" },
];

export default function GuardiansPage() {
  const t = useTranslations("dashboard.guardians");
  const walletAddress = useWalletAddress();
  const [tab, setTab] = useState<Tab>("list");
  const [guardians, setGuardians] = useState<OnChainGuardianship[]>([]);
  const [loading, setLoading] = useState(true);

  // assign state
  const [assignPatient, setAssignPatient] = useState("");
  const [assignGuardian, setAssignGuardian] = useState("");
  const [assignType, setAssignType] = useState(0);
  const [assignExpiry, setAssignExpiry] = useState("");
  const [assigning, setAssigning] = useState(false);

  // revoke state
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) return;
    fetchGuardians();
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) {
      setAssignGuardian(walletAddress);
    }
  }, [walletAddress]);

  async function fetchGuardians() {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const result = await listGuardiansOnChain({ patientWallet: walletAddress });
      if (result.success) setGuardians(result.data.guardianships);
    } catch (e) {
      sileo.error({ title: t("loadError"), description: String(e).slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign() {
    if (!assignPatient.trim() || !assignGuardian.trim()) return;
    setAssigning(true);
    try {
      const validUntil = assignExpiry ? Math.floor(new Date(assignExpiry).getTime() / 1000) : 0;
      const res = await grantGuardianshipOnChain({
        patientWallet: assignPatient.trim(),
        guardianWallet: assignGuardian.trim(),
        guardianshipType: assignType,
        validUntil: validUntil || undefined,
      });
      if (res.success) {
        sileo.success({ title: t("assignSuccess"), description: t("assignSuccessDesc") });
        setAssignPatient("");
        setAssignGuardian("");
        setAssignType(0);
        setAssignExpiry("");
        fetchGuardians();
      } else {
        sileo.error({ title: t("assignError"), description: res.error ?? t("assignErrorDesc") });
      }
    } catch (e) {
      sileo.error({ title: t("assignError"), description: String(e).slice(0, 120) });
    } finally {
      setAssigning(false);
    }
  }

  async function handleRevoke(guardianWallet: string) {
    if (!walletAddress) return;
    setRevokingId(guardianWallet);
    try {
      const res = await revokeGuardianshipOnChain({
        patientWallet: walletAddress,
        guardianWallet,
      });
      if (res.success) {
        sileo.success({ title: t("revokeSuccess"), description: t("revokeSuccessDesc") });
        fetchGuardians();
      } else {
        sileo.error({ title: t("revokeError"), description: res.error ?? t("revokeErrorDesc") });
      }
    } catch (e) {
      sileo.error({ title: t("revokeError"), description: String(e).slice(0, 120) });
    } finally {
      setRevokingId(null);
    }
  }

  const activeGuardians = guardians.filter((g) => g.active);
  const tabClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-all ${active ? "neu-pressed text-sky-700" : "text-slate-500 hover:text-slate-800 hover:bg-white/50"}`;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>

      <div className="mb-6 flex gap-2">
        <button className={tabClass(tab === "list")} onClick={() => setTab("list")} type="button">{t("tabList")}</button>
        <button className={tabClass(tab === "assign")} onClick={() => setTab("assign")} type="button">{t("tabAssign")}</button>
        <button className={tabClass(tab === "revoke")} onClick={() => setTab("revoke")} type="button">{t("tabRevoke")}</button>
      </div>

      {tab === "list" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          {loading ? (
            <SkeletonList count={3} />
          ) : guardians.length === 0 ? (
            <EmptyState icon={ShieldOff} title={t("empty")} />
          ) : (
            <div className="space-y-3">
              {guardians.map((g) => (
                <div key={g.guardian} className="neu-inset rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{truncateAddress(g.guardian)}</p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <StatusBadge variant={g.active ? "active" : "inactive"}>
                        {g.active ? t("active") : t("inactive")}
                      </StatusBadge>
                      {" · "}{t(GUARDIANSHIP_TYPES.find((x) => x.value === g.gType)?.labelKey ?? "typeUnknown")}
                    </p>
                    {g.validUntil > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{t("expires")}: {new Date(g.validUntil * 1000).toLocaleDateString()}</p>
                    )}
                  </div>
                  {g.active ? (
                    <User className="h-5 w-5 text-sky-600 shrink-0" />
                  ) : (
                    <UserX className="h-5 w-5 text-slate-400 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "assign" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <p className="text-xs text-slate-500">{t("assignNote")}</p>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("patientLabel")}</label>
            <UserSelect label="" value={assignPatient} onChange={setAssignPatient} placeholder={t("patientPlaceholder")} filterRole="patient" excludeWallet={walletAddress ?? undefined} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("guardianLabel")}</label>
            <div className="neu-inset w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 flex items-center gap-2">
              <User className="h-4 w-4 text-sky-600" />
              <span className="font-mono">{walletAddress ? truncateAddress(walletAddress) : "—"}</span>
              <span className="text-xs text-slate-400 ml-1">({t("you")})</span>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("typeLabel")}</label>
            <select className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" value={assignType} onChange={(e) => setAssignType(Number(e.target.value))}>
              {GUARDIANSHIP_TYPES.map((gt) => (
                <option key={gt.value} value={gt.value}>{t(gt.labelKey)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("expiryLabel")}</label>
            <input type="datetime-local" className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" value={assignExpiry} onChange={(e) => setAssignExpiry(e.target.value)} />
          </div>
          <button className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50" disabled={assigning || !assignPatient.trim() || !assignGuardian.trim()} onClick={handleAssign} type="button">
            {assigning ? t("assigning") : t("assignButton")}
          </button>
        </div>
      )}

      {tab === "revoke" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          {activeGuardians.length === 0 ? (
            <EmptyState icon={ShieldOff} title={t("noActive")} />
          ) : (
            <div className="space-y-3">
              {activeGuardians.map((g) => (
                <div key={g.guardian} className="neu-inset rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{truncateAddress(g.guardian)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t(GUARDIANSHIP_TYPES.find((x) => x.value === g.gType)?.labelKey ?? "typeUnknown")}</p>
                  </div>
                  <button className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-all shrink-0" disabled={revokingId === g.guardian} onClick={() => handleRevoke(g.guardian)} type="button">
                    {revokingId === g.guardian ? t("revoking") : t("revokeButton")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
