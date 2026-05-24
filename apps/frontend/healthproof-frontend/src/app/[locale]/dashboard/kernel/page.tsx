"use client";

import { useState, useEffect } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { registerModuleOnChain, upgradeModuleOnChain, getModuleOnChain, getKernelInfoOnChain } from "@/actions/admin/kernel-admin-onchain";

export default function KernelPage() {
  const t = useTranslations("dashboard.kernel");
  const [tab, setTab] = useState<"register" | "upgrade" | "info">("register");
  const [moduleId, setModuleId] = useState("");
  const [moduleAddress, setModuleAddress] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [info, setInfo] = useState<{ admin: string; governance: string; guardian: string; protocolPaused: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadInfo(); }, []);

  async function loadInfo() {
    try {
      const res = await getKernelInfoOnChain({});
      if (res.success && res.data) setInfo(res.data);
    } catch (e) { console.error(e); }
  }

  async function handleRegister() {
    if (!moduleId.trim() || !moduleAddress.trim()) return;
    setLoading(true);
    try {
      const res = await registerModuleOnChain({ moduleId: moduleId.trim(), moduleAddress: moduleAddress.trim() });
      if (!res.success) sileo.error({ title: t("registerError"), description: (res.error ?? "").slice(0, 120) });
      else { sileo.success({ title: t("registerSuccess"), description: `TX: ${res.data?.txHash?.slice(0, 16)}…` }); setModuleId(""); setModuleAddress(""); }
    } catch (e) { sileo.error({ title: t("registerError"), description: String(e).slice(0, 120) }); }
    finally { setLoading(false); }
  }

  async function handleUpgrade() {
    if (!moduleId.trim() || !newAddress.trim()) return;
    setLoading(true);
    try {
      const res = await upgradeModuleOnChain({ moduleId: moduleId.trim(), newAddress: newAddress.trim() });
      if (!res.success) sileo.error({ title: t("upgradeError"), description: (res.error ?? "").slice(0, 120) });
      else { sileo.success({ title: t("upgradeSuccess"), description: `TX: ${res.data?.txHash?.slice(0, 16)}…` }); setModuleId(""); setNewAddress(""); }
    } catch (e) { sileo.error({ title: t("upgradeError"), description: String(e).slice(0, 120) }); }
    finally { setLoading(false); }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
        <div className="flex gap-2">
          {(["register", "upgrade", "info"] as const).map((tk) => (<button key={tk} className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${tab === tk ? "neu-pressed text-slate-800" : "neu-surface text-slate-500"}`} onClick={() => setTab(tk)} type="button">{t(`tab${tk.charAt(0).toUpperCase() + tk.slice(1)}`)}</button>))}
        </div>
      </div>

      {tab === "register" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div><label className="mb-1.5 block text-xs font-medium text-slate-700">{t("moduleIdLabel")}</label><input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("moduleIdPlaceholder")} value={moduleId} onChange={(e) => setModuleId(e.target.value)} /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-slate-700">{t("moduleAddressLabel")}</label><input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("moduleAddressPlaceholder")} value={moduleAddress} onChange={(e) => setModuleAddress(e.target.value)} /></div>
          <button className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50" disabled={loading || !moduleId.trim() || !moduleAddress.trim()} onClick={handleRegister} type="button">{loading ? t("registering") : t("registerButton")}</button>
        </div>
      )}

      {tab === "upgrade" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <div><label className="mb-1.5 block text-xs font-medium text-slate-700">{t("moduleIdLabel")}</label><input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("moduleIdPlaceholder")} value={moduleId} onChange={(e) => setModuleId(e.target.value)} /></div>
          <div><label className="mb-1.5 block text-xs font-medium text-slate-700">{t("newAddressLabel")}</label><input className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none" placeholder={t("newAddressPlaceholder")} value={newAddress} onChange={(e) => setNewAddress(e.target.value)} /></div>
          <button className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50" disabled={loading || !moduleId.trim() || !newAddress.trim()} onClick={handleUpgrade} type="button">{loading ? t("upgrading") : t("upgradeButton")}</button>
        </div>
      )}

      {tab === "info" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          {info ? (
            <div className="space-y-3">
              <DetailRow label={t("admin")} value={`${info.admin.slice(0, 8)}…${info.admin.slice(-4)}`} />
              <DetailRow label={t("governance")} value={`${info.governance.slice(0, 8)}…${info.governance.slice(-4)}`} />
              <DetailRow label={t("guardian")} value={`${info.guardian.slice(0, 8)}…${info.guardian.slice(-4)}`} />
              <DetailRow label={t("paused")} value={info.protocolPaused ? t("yes") : t("no")} />
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">{t("loading")}</p>
          )}
        </div>
      )}
    </main>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3"><span className="text-xs font-medium text-slate-500 shrink-0 w-24">{label}</span><span className="text-sm text-slate-800 break-all font-mono">{value}</span></div>);
}
