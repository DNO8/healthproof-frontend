"use client";

import { useState, useEffect } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { listPermissionsOnChain } from "@/actions/list-permissions-onchain";
import { grantPermissionOnChain } from "@/actions/grant-permission-onchain";
import { revokePermissionOnChain } from "@/actions/revoke-permission-onchain";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import { UserSelect } from "@/components/forms/UserSelect";
import type { OnChainPermission } from "@/lib/medical-constants";

export default function PermissionsPage() {
  const t = useTranslations("dashboard.permissions");
  const walletAddress = useWalletAddress();
  const [permissions, setPermissions] = useState<OnChainPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [granteeWallet, setGranteeWallet] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [scope, setScope] = useState(0);
  const [expiresInMinutes, setExpiresInMinutes] = useState<number | "">("");
  const [grantLoading, setGrantLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "grant">("list");

  async function load() {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const result = await listPermissionsOnChain({
        patientWallet: walletAddress,
        offset: 0,
        limit: 50,
      });
      if (result.success) {
        setPermissions(result.data.permissions);
      } else {
        throw new Error(result.error);
      }
    } catch (e) {
      sileo.error({ title: t("loadError"), description: String(e).slice(0, 120) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [walletAddress]);

  async function handleGrant() {
    if (!walletAddress || !granteeWallet.trim()) return;
    setGrantLoading(true);
    try {
      const res = await grantPermissionOnChain({
        patientWallet: walletAddress,
        granteeWallet: granteeWallet.trim(),
        documentId: documentId.trim() || "all",
        scope,
        expiresInMinutes: expiresInMinutes ? Number(expiresInMinutes) : undefined,
      });
      if (!res.success) {
        throw new Error(res.error);
      }
      sileo.success({
        title: t("grantSuccess"),
        description: `TX: ${res.data.txHash.slice(0, 16)}…`,
      });
      setGranteeWallet("");
      setDocumentId("");
      setScope(0);
      setExpiresInMinutes("");
      setActiveTab("list");
      await load();
    } catch (e) {
      sileo.error({ title: t("grantError"), description: String(e).slice(0, 120) });
    } finally {
      setGrantLoading(false);
    }
  }

  async function handleRevoke(grantee: string) {
    if (!walletAddress) return;
    setRevokeLoading(grantee);
    try {
      const res = await revokePermissionOnChain({
        patientWallet: walletAddress,
        granteeWallet: grantee,
      });
      if (!res.success) {
        throw new Error(res.error);
      }
      sileo.success({
        title: t("revokeSuccess"),
        description: `TX: ${res.data.txHash.slice(0, 16)}…`,
      });
      await load();
    } catch (e) {
      sileo.error({ title: t("revokeError"), description: String(e).slice(0, 120) });
    } finally {
      setRevokeLoading(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
        <div className="flex gap-2">
          <button
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "list" ? "neu-pressed text-slate-800" : "neu-surface text-slate-500"
            }`}
            onClick={() => setActiveTab("list")}
            type="button"
          >
            {t("tabList")}
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "grant" ? "neu-pressed text-slate-800" : "neu-surface text-slate-500"
            }`}
            onClick={() => setActiveTab("grant")}
            type="button"
          >
            {t("tabGrant")}
          </button>
        </div>
      </div>

      {activeTab === "list" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-400">{t("loading")}</p>
          ) : permissions.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">{t("empty")}</p>
          ) : (
            <div className="space-y-3">
              {permissions.map((p) => (
                <div key={p.grantee + p.resourceId} className="neu-inset rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {p.grantee.slice(0, 10)}…{p.grantee.slice(-4)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t("scope")}: {p.scope} · {t("resource")}: {p.resourceId.slice(0, 10)}…
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.expiresAt > 0
                        ? `${t("expires")}: ${new Date(p.expiresAt * 1000).toLocaleString()}`
                        : t("noExpiry")}
                      · {p.active ? <span className="text-green-600">{t("active")}</span> : <span className="text-red-500">{t("inactive")}</span>}
                    </p>
                  </div>
                  {p.active && (
                    <button
                      className="neu-surface hover:neu-pressed shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-500 transition-all disabled:opacity-50"
                      disabled={revokeLoading === p.grantee}
                      onClick={() => handleRevoke(p.grantee)}
                      type="button"
                    >
                      {revokeLoading === p.grantee ? t("revoking") : t("revoke")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "grant" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">{t("grantTitle")}</h2>
          <div>
            <UserSelect
              value={granteeWallet}
              onChange={setGranteeWallet}
              label={t("granteeLabel")}
              placeholder={t("granteePlaceholder")}
              excludeWallet={walletAddress ?? undefined}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("documentLabel")}</label>
            <input
              className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
              placeholder={t("documentPlaceholder")}
              value={documentId}
              onChange={(e) => setDocumentId(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("scopeLabel")}</label>
              <select
                className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
                value={scope}
                onChange={(e) => setScope(Number(e.target.value))}
              >
                <option value={0}>{t("scopeDocument")}</option>
                <option value={1}>{t("scopeEpisode")}</option>
                <option value={2}>{t("scopeFull")}</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-xs font-medium text-slate-700">{t("expiresLabel")}</label>
              <input
                className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
                type="number"
                placeholder={t("expiresPlaceholder")}
                value={expiresInMinutes}
                onChange={(e) => setExpiresInMinutes(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>
          <button
            className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
            disabled={grantLoading || !granteeWallet.trim()}
            onClick={handleGrant}
            type="button"
          >
            {grantLoading ? t("granting") : t("grantButton")}
          </button>
        </div>
      )}
    </main>
  );
}
