"use client";

import { CheckCircle, Mail, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { sileo } from "sileo";
import type { PermissionInvitation } from "@/actions/permissions/list-permission-invitations";
import { listPermissionInvitations } from "@/actions/permissions/list-permission-invitations";
import { respondPermissionInvitation } from "@/actions/permissions/respond-permission-invitation";
import { EmptyState, SkeletonList } from "@/components/ui";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";

export default function InvitationsPage() {
  const t = useTranslations("dashboard.invitations");
  const walletAddress = useWalletAddress();
  const [invitations, setInvitations] = useState<PermissionInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!walletAddress) return;
    setLoading(true);
    try {
      const res = await listPermissionInvitations({
        type: "received",
        granteeWallet: walletAddress,
      });
      if (res.success) {
        setInvitations(res.data.invitations);
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      sileo.error({
        title: t("loadError") ?? "Error",
        description: String(e).slice(0, 120),
      });
    } finally {
      setLoading(false);
    }
  }, [walletAddress, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRespond(id: string, action: "accept" | "reject") {
    setRespondingId(id);
    try {
      const res = await respondPermissionInvitation({
        invitationId: id,
        action,
      });
      if (res.success) {
        sileo.success({
          title:
            action === "accept"
              ? (t("acceptSuccess") ?? "Accepted")
              : (t("rejectSuccess") ?? "Rejected"),
          description:
            action === "accept"
              ? (t("acceptSuccessDesc") ?? "Permission invitation accepted.")
              : (t("rejectSuccessDesc") ?? "Permission invitation rejected."),
        });
        await load();
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      sileo.error({
        title: t("respondError") ?? "Error",
        description: String(e).slice(0, 120),
      });
    } finally {
      setRespondingId(null);
    }
  }

  const pendingInvitations = invitations.filter((i) => i.status === "pending");
  const respondedInvitations = invitations.filter(
    (i) => i.status !== "pending",
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {t("title") ?? "Invitations"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("description")}</p>
      </div>

      <div className="space-y-6">
        {/* Pending */}
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            {t("pendingTitle") ?? "Pending Invitations"}
          </h2>
          {loading ? (
            <SkeletonList count={3} />
          ) : pendingInvitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title={t("noPending") ?? "No pending invitations."}
            />
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="neu-inset rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {t("from") ?? "From"}: {inv.patient_wallet.slice(0, 10)}…
                      {inv.patient_wallet.slice(-4)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t("scope")}: {inv.scope} · {inv.document_ids.length}{" "}
                      {t("documents") ?? "docs"}
                    </p>
                    {inv.expires_at_unix > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {t("expires")}:{" "}
                        {new Date(inv.expires_at_unix * 1000).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      className="neu-surface hover:neu-pressed flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-green-600 transition-all disabled:opacity-50"
                      disabled={respondingId === inv.id}
                      onClick={() => handleRespond(inv.id, "accept")}
                      type="button"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      {t("accept") ?? "Accept"}
                    </button>
                    <button
                      className="neu-surface hover:neu-pressed flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-500 transition-all disabled:opacity-50"
                      disabled={respondingId === inv.id}
                      onClick={() => handleRespond(inv.id, "reject")}
                      type="button"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      {t("reject") ?? "Reject"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History */}
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            {t("historyTitle") ?? "History"}
          </h2>
          {loading ? (
            <SkeletonList count={3} />
          ) : respondedInvitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title={t("noHistory") ?? "No past invitations."}
            />
          ) : (
            <div className="space-y-3">
              {respondedInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="neu-inset rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {t("from") ?? "From"}: {inv.patient_wallet.slice(0, 10)}…
                      {inv.patient_wallet.slice(-4)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t("scope")}: {inv.scope} · {inv.document_ids.length}{" "}
                      {t("documents") ?? "docs"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {inv.status === "accepted" && (
                        <span className="text-green-600">
                          {t("accepted") ?? "Accepted"}
                        </span>
                      )}
                      {inv.status === "rejected" && (
                        <span className="text-red-500">
                          {t("rejected") ?? "Rejected"}
                        </span>
                      )}
                      {inv.status === "cancelled" && (
                        <span className="text-slate-500">
                          {t("cancelled") ?? "Cancelled"}
                        </span>
                      )}
                      {inv.status === "expired" && (
                        <span className="text-slate-500">
                          {t("expired") ?? "Expired"}
                        </span>
                      )}
                      {inv.responded_at &&
                        ` · ${new Date(inv.responded_at).toLocaleString()}`}
                    </p>
                  </div>
                  {inv.tx_hash && (
                    <p className="text-[10px] font-mono text-slate-400 shrink-0">
                      TX: {inv.tx_hash.slice(0, 16)}…
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
