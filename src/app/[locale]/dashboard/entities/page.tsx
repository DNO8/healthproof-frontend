"use client";

import { useState } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { adminRegisterEntity, adminVerifyEntity, adminGetEntity } from "@/actions/admin/admin-onchain";
import type { ContractRole } from "@/types/domain.types";

const CONTRACT_ROLES: ContractRole[] = [1, 2, 3, 4, 5];

export default function EntitiesPage() {
  const t = useTranslations("dashboard.entities");
  const [tab, setTab] = useState<"register" | "verify" | "lookup">("register");
  const [wallet, setWallet] = useState("");
  const [role, setRole] = useState<ContractRole>(1);
  const [lookupWallet, setLookupWallet] = useState("");
  const [entity, setEntity] = useState<{ role: number; verified: boolean; institution: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const trimmed = wallet.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await adminRegisterEntity({ wallet: trimmed, role });
      if (!("txHash" in res)) {
        sileo.error({ title: t("registerError"), description: (res.error ?? "").slice(0, 120) });
      } else {
        sileo.success({ title: t("registerSuccess"), description: `TX: ${res.txHash.slice(0, 16)}…` });
        setWallet("");
      }
    } catch (e) {
      sileo.error({ title: t("registerError"), description: String(e).slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    const trimmed = wallet.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const res = await adminVerifyEntity(trimmed);
      if (!("txHash" in res)) {
        sileo.error({ title: t("verifyError"), description: (res.error ?? "").slice(0, 120) });
      } else {
        sileo.success({ title: t("verifySuccess"), description: `TX: ${res.txHash.slice(0, 16)}…` });
        setWallet("");
      }
    } catch (e) {
      sileo.error({ title: t("verifyError"), description: String(e).slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }

  async function handleLookup() {
    const trimmed = lookupWallet.trim();
    if (!trimmed) return;
    setLoading(true);
    setEntity(null);
    try {
      const res = await adminGetEntity(trimmed);
      if (res) {
        setEntity(res);
      } else {
        sileo.error({ title: t("lookupError"), description: t("notFound") });
      }
    } catch (e) {
      sileo.error({ title: t("lookupError"), description: String(e).slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
        <div className="flex gap-2">
          {(["register", "verify", "lookup"] as const).map((tk) => (
            <button key={tk} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${tab === tk ? "neu-pressed text-slate-800" : "neu-surface text-slate-500"}`} onClick={() => setTab(tk)} type="button">{t(`tab${tk.charAt(0).toUpperCase() + tk.slice(1)}`)}</button>
          ))}
        </div>
      </div>

      {tab === "register" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("walletLabel")}</label>
            <input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("walletPlaceholder")} value={wallet} onChange={(e) => setWallet(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("roleLabel")}</label>
            <select className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" value={role} onChange={(e) => setRole(Number(e.target.value) as ContractRole)}>
              {CONTRACT_ROLES.map((r) => (<option key={r} value={r}>{r === 1 ? "Patient" : r === 2 ? "Doctor" : r === 3 ? "Lab" : r === 4 ? "Institution" : r === 5 ? "Admin" : "Certifier"}</option>))}
            </select>
          </div>
          <button className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50" disabled={loading || !wallet.trim()} onClick={handleRegister} type="button">{loading ? t("registering") : t("registerButton")}</button>
        </div>
      )}

      {tab === "verify" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("walletLabel")}</label>
            <input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("walletPlaceholder")} value={wallet} onChange={(e) => setWallet(e.target.value)} />
          </div>
          <button className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50" disabled={loading || !wallet.trim()} onClick={handleVerify} type="button">{loading ? t("verifying") : t("verifyButton")}</button>
        </div>
      )}

      {tab === "lookup" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("walletLabel")}</label>
            <input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("walletPlaceholder")} value={lookupWallet} onChange={(e) => setLookupWallet(e.target.value)} />
          </div>
          <button className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50" disabled={loading || !lookupWallet.trim()} onClick={handleLookup} type="button">{loading ? t("lookingUp") : t("lookupButton")}</button>
          {entity && (
            <div className="neu-inset rounded-xl p-4 space-y-2">
              <DetailRow label={t("role")} value={`${entity.role}`} />
              <DetailRow label={t("verified")} value={entity.verified ? t("yes") : t("no")} />
              <DetailRow label={t("institution")} value={`${entity.institution.slice(0, 8)}…${entity.institution.slice(-4)}`} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"><span className="text-xs font-medium text-slate-500 shrink-0 w-24">{label}</span><span className="text-sm text-slate-800 break-all font-mono">{value}</span></div>);
}
