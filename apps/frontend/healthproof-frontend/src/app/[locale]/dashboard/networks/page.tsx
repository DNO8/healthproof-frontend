"use client";

import { useState } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { createNetworkOnChain, registerInstitutionOnChain, verifyInstitutionOnChain } from "@/actions/healthcare-networks/healthcare-networks-onchain";

export default function NetworksPage() {
  const t = useTranslations("dashboard.networks");
  const [tab, setTab] = useState<"create" | "register" | "verify">("create");
  const [networkId, setNetworkId] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [instId, setInstId] = useState("");
  const [instNetworkId, setInstNetworkId] = useState("");
  const [instWallet, setInstWallet] = useState("");
  const [instType, setInstType] = useState(0);
  const [verifyWallet, setVerifyWallet] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!networkId.trim() || !name.trim() || !countryCode.trim()) return;
    setLoading(true);
    try {
      const res = await createNetworkOnChain({ networkId: networkId.trim(), name: name.trim(), countryCode: countryCode.trim() });
      if (!res.success) sileo.error({ title: t("createError"), description: (res.error ?? "").slice(0, 120) });
      else { sileo.success({ title: t("createSuccess"), description: `TX: ${res.data?.txHash?.slice(0, 16)}…` }); setNetworkId(""); setName(""); setCountryCode(""); }
    } catch (e) { sileo.error({ title: t("createError"), description: String(e).slice(0, 120) }); }
    finally { setLoading(false); }
  }

  async function handleRegister() {
    if (!instId.trim() || !instNetworkId.trim() || !instWallet.trim()) return;
    setLoading(true);
    try {
      const res = await registerInstitutionOnChain({ institutionId: instId.trim(), networkId: instNetworkId.trim(), wallet: instWallet.trim(), institutionType: instType, countryCode: countryCode.trim() || "US" });
      if (!res.success) sileo.error({ title: t("registerError"), description: (res.error ?? "").slice(0, 120) });
      else { sileo.success({ title: t("registerSuccess"), description: `TX: ${res.data?.txHash?.slice(0, 16)}…` }); setInstId(""); setInstNetworkId(""); setInstWallet(""); }
    } catch (e) { sileo.error({ title: t("registerError"), description: String(e).slice(0, 120) }); }
    finally { setLoading(false); }
  }

  async function handleVerify() {
    if (!verifyWallet.trim()) return;
    setLoading(true);
    try {
      const res = await verifyInstitutionOnChain({ institutionId: verifyWallet.trim() });
      if (!res.success) sileo.error({ title: t("verifyError"), description: (res.error ?? "").slice(0, 120) });
      else { sileo.success({ title: t("verifySuccess"), description: `TX: ${res.data?.txHash?.slice(0, 16)}…` }); setVerifyWallet(""); }
    } catch (e) { sileo.error({ title: t("verifyError"), description: String(e).slice(0, 120) }); }
    finally { setLoading(false); }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
        <div className="flex gap-2">
          {(["create", "register", "verify"] as const).map((tk) => (<button key={tk} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${tab === tk ? "neu-pressed text-slate-800" : "neu-surface text-slate-500"}`} onClick={() => setTab(tk)} type="button">{t(`tab${tk.charAt(0).toUpperCase() + tk.slice(1)}`)}</button>))}
        </div>
      </div>

      {tab === "create" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div><label className="mb-1.5 block text-xs font-medium text-slate-700">{t("networkIdLabel")}</label><input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("networkIdPlaceholder")} value={networkId} onChange={(e) => setNetworkId(e.target.value)} /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-slate-700">{t("nameLabel")}</label><input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-slate-700">{t("countryLabel")}</label><input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("countryPlaceholder")} value={countryCode} onChange={(e) => setCountryCode(e.target.value)} /></div>
          <button className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50" disabled={loading || !networkId.trim() || !name.trim() || !countryCode.trim()} onClick={handleCreate} type="button">{loading ? t("creating") : t("createButton")}</button>
        </div>
      )}

      {tab === "register" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div><label className="mb-1.5 block text-xs font-medium text-slate-700">{t("institutionIdLabel")}</label><input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("institutionIdPlaceholder")} value={instId} onChange={(e) => setInstId(e.target.value)} /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-slate-700">{t("networkIdLabel")}</label><input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("networkIdPlaceholder")} value={instNetworkId} onChange={(e) => setInstNetworkId(e.target.value)} /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-slate-700">{t("walletLabel")}</label><input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("walletPlaceholder")} value={instWallet} onChange={(e) => setInstWallet(e.target.value)} /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-slate-700">{t("instTypeLabel")}</label><select className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" value={instType} onChange={(e) => setInstType(Number(e.target.value))}><option value={0}>Hospital</option><option value={1}>Clinic</option><option value={2}>Lab</option><option value={3}>Pharmacy</option></select></div>
          <button className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50" disabled={loading || !instId.trim() || !instNetworkId.trim() || !instWallet.trim()} onClick={handleRegister} type="button">{loading ? t("registering") : t("registerButton")}</button>
        </div>
      )}

      {tab === "verify" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div><label className="mb-1.5 block text-xs font-medium text-slate-700">{t("walletLabel")}</label><input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("walletPlaceholder")} value={verifyWallet} onChange={(e) => setVerifyWallet(e.target.value)} /></div>
          <button className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50" disabled={loading || !verifyWallet.trim()} onClick={handleVerify} type="button">{loading ? t("verifying") : t("verifyButton")}</button>
        </div>
      )}
    </main>
  );
}
