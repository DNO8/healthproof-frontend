"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { FileText, FolderOpen, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { sileo } from "sileo";
import { createWalletClient, custom, keccak256, toHex } from "viem";
import { getUserPublicKey } from "@/actions/auth/get-user-public-key";
import { listEpisodesByPatient } from "@/actions/clinical-episodes/list-episodes-by-patient";
import type { DocumentSecretRow } from "@/actions/documents/get-document-secret";
import { listDocumentSecretsForWallet } from "@/actions/documents/get-document-secret";
import { listDocumentsByEpisode } from "@/actions/documents/list-documents-by-episode";
import { createPermissionInvitation } from "@/actions/permissions/create-permission-invitation";
import { listPermissionInvitations } from "@/actions/permissions/list-permission-invitations";
import { listPermissionsOnChain } from "@/actions/permissions/list-permissions-onchain";
import { respondPermissionInvitation } from "@/actions/permissions/respond-permission-invitation";
import { revokePermissionOnChain } from "@/actions/permissions/revoke-permission-onchain";
import { UserSelect } from "@/components/forms/UserSelect";
import { EmptyState, SkeletonList } from "@/components/ui";
import { useWalletAddress } from "@/hooks/auth/useWalletAddress";
import HealthProofGatewayAbi from "@/lib/abis/HealthProofGateway.json";
import { isAuthSuccess } from "@/lib/auth/with-auth";
import { CONTRACT_ADDRESSES, HEALTHPROOF_CHAIN } from "@/lib/contracts";
import type {
  OnChainEpisode,
  OnChainPermission,
} from "@/lib/medical-constants";
import { signMetaTransaction } from "@/lib/metatx/forwarder";
import { batchRewrapForGrantee } from "@/services/encryption/rewrap";

const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

async function getViemWalletClient(wallet: {
  getEthereumProvider: () => Promise<unknown>;
}) {
  const provider = (await wallet.getEthereumProvider()) as {
    request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  };
  return createWalletClient({
    chain: HEALTHPROOF_CHAIN,
    transport: custom(provider),
  });
}

export default function PermissionsPage() {
  const t = useTranslations("dashboard.permissions");
  const walletAddress = useWalletAddress();
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const userId = user?.id ?? "";
  const [permissions, setPermissions] = useState<OnChainPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [granteeWallet, setGranteeWallet] = useState("");
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [selectAllDocs, setSelectAllDocs] = useState(false);
  const [userDocs, setUserDocs] = useState<DocumentSecretRow[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [scope, setScope] = useState(0);
  const [expiresInMinutes, setExpiresInMinutes] = useState<number | "">("");
  const [grantLoading, setGrantLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"list" | "grant" | "sent">("list");
  const [sentInvitations, setSentInvitations] = useState<
    import("@/actions/permissions/list-permission-invitations").PermissionInvitation[]
  >([]);
  const [loadingSent, setLoadingSent] = useState(false);

  // Episode sharing in "grant" tab
  const [grantMode, setGrantMode] = useState<"document" | "episode">(
    "document",
  );
  const [episodes, setEpisodes] = useState<OnChainEpisode[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<OnChainEpisode | null>(
    null,
  );
  const [episodeDocs, setEpisodeDocs] = useState<DocumentSecretRow[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [loadingEpisodeDocs, setLoadingEpisodeDocs] = useState(false);

  const load = useCallback(async () => {
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
      sileo.error({
        title: t("loadError"),
        description: String(e).slice(0, 120),
      });
    } finally {
      setLoading(false);
    }
  }, [walletAddress, t]);

  // Load episode docs when selectedEpisode changes
  useEffect(() => {
    async function loadEpisodeDocs() {
      if (!selectedEpisode || !walletAddress) {
        setEpisodeDocs([]);
        return;
      }
      setLoadingEpisodeDocs(true);
      try {
        const response = await listDocumentsByEpisode({
          patientWallet: walletAddress,
          episodeId: selectedEpisode.episodeId,
        });
        if (isAuthSuccess(response)) {
          setEpisodeDocs(response.data.documents);
        } else {
          setEpisodeDocs([]);
        }
      } catch (err) {
        console.error("[PermissionsPage] Error loading episode docs:", err);
        setEpisodeDocs([]);
      } finally {
        setLoadingEpisodeDocs(false);
      }
    }
    loadEpisodeDocs();
  }, [selectedEpisode, walletAddress]);

  const loadEpisodes = useCallback(async () => {
    if (!walletAddress) {
      setEpisodes([]);
      return;
    }
    setLoadingEpisodes(true);
    try {
      const response = await listEpisodesByPatient({
        patientWallet: walletAddress,
      });
      if (isAuthSuccess(response)) {
        setEpisodes(response.data.episodes);
      } else {
        setEpisodes([]);
      }
    } catch (err) {
      console.error("[PermissionsPage] Error fetching episodes:", err);
      setEpisodes([]);
    } finally {
      setLoadingEpisodes(false);
    }
  }, [walletAddress]);

  const loadUserDocs = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingDocs(true);
    try {
      const docs = await listDocumentSecretsForWallet(walletAddress);
      setUserDocs(docs);
    } catch {
      setUserDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [walletAddress]);

  const loadSentInvitations = useCallback(async () => {
    if (!walletAddress) return;
    setLoadingSent(true);
    try {
      const res = await listPermissionInvitations({
        type: "sent",
        patientWallet: walletAddress,
      });
      if (res.success) {
        setSentInvitations(res.data.invitations);
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      sileo.error({
        title: t("loadSentError") ?? "Error",
        description: String(e).slice(0, 120),
      });
    } finally {
      setLoadingSent(false);
    }
  }, [walletAddress, t]);

  useEffect(() => {
    load();
    loadUserDocs();
    loadEpisodes();
    if (activeTab === "sent") loadSentInvitations();
  }, [activeTab, load, loadEpisodes, loadSentInvitations, loadUserDocs]);

  async function handleSendInvitation() {
    if (!walletAddress || !granteeWallet.trim()) return;
    if (grantMode === "episode" && !selectedEpisode) {
      sileo.warning({
        title: t("selectEpisode") ?? "Selecciona un episodio",
        description:
          t("selectEpisodeDesc") ?? "Elige qué episodio clínico compartir.",
      });
      return;
    }

    const activeWallet = wallets.find((w) => w.address);
    if (!activeWallet) {
      sileo.error({
        title: t("grantError"),
        description: "No active wallet found",
      });
      return;
    }

    let docsToGrant: string[];
    if (grantMode === "episode") {
      docsToGrant =
        episodeDocs.length > 0
          ? episodeDocs.map((d) => d.document_id)
          : ["all"];
    } else {
      docsToGrant = selectedDocs.length > 0 ? selectedDocs : ["all"];
    }

    setGrantLoading(true);
    try {
      const viemWallet = await getViemWalletClient(activeWallet);
      const grantee = granteeWallet.trim().toLowerCase();
      const expiresAt = expiresInMinutes
        ? BigInt(Math.floor(Date.now() / 1000) + Number(expiresInMinutes) * 60)
        : BigInt(0);

      const signedRequests: import("@/lib/metatx/types").SignedForwardRequest[] =
        [];

      for (const docId of docsToGrant) {
        const resourceId =
          docId === "all" ? ZERO_BYTES32 : keccak256(toHex(docId));

        const request = await signMetaTransaction(
          viemWallet,
          CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
          "grantAccess",
          [walletAddress.toLowerCase(), grantee, scope, resourceId, expiresAt],
          HealthProofGatewayAbi,
        );
        signedRequests.push(request);
      }

      // Prepare encrypted keys
      const encryptedKeys: Record<string, string> = {};
      if (scope >= 2 && docsToGrant.includes("all")) {
        const recipientPubKeyJwk = await getUserPublicKey(grantee);
        if (recipientPubKeyJwk) {
          const secrets = await listDocumentSecretsForWallet(walletAddress);
          const results = await batchRewrapForGrantee({
            myUserId: userId,
            myWalletAddress: walletAddress,
            secrets,
            recipientPublicKeyJwk: recipientPubKeyJwk,
          });
          for (const r of results) {
            encryptedKeys[r.documentId] = JSON.stringify(r.rewrapped);
          }
        }
      }

      const res = await createPermissionInvitation({
        patientWallet: walletAddress,
        granteeWallet: grantee,
        documentIds: docsToGrant,
        scope,
        expiresAtUnix: Number(expiresAt),
        signedRequests,
        encryptedKeys:
          Object.keys(encryptedKeys).length > 0 ? encryptedKeys : undefined,
      });

      if (!res.success) {
        throw new Error(res.error);
      }

      sileo.success({
        title: t("invitationSent") ?? "Invitation sent",
        description:
          t("invitationSentDesc") ??
          `Permission invitation sent to ${grantee.slice(0, 10)}…`,
      });
      setGranteeWallet("");
      setSelectedDocs([]);
      setSelectAllDocs(false);
      setScope(0);
      setExpiresInMinutes("");
      setActiveTab("sent");
      await loadSentInvitations();
    } catch (e) {
      sileo.error({
        title: t("grantError"),
        description: String(e).slice(0, 120),
      });
    } finally {
      setGrantLoading(false);
    }
  }

  async function handleCancelInvitation(id: string) {
    try {
      const res = await respondPermissionInvitation({
        invitationId: id,
        action: "cancel",
      });
      if (res.success) {
        sileo.success({
          title: t("cancelSuccess") ?? "Cancelled",
          description: t("cancelSuccessDesc") ?? "Invitation cancelled.",
        });
        await loadSentInvitations();
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      sileo.error({
        title: t("cancelError") ?? "Error",
        description: String(e).slice(0, 120),
      });
    }
  }

  async function handleRevoke(grantee: string) {
    if (!walletAddress) return;

    const activeWallet = wallets.find((w) => w.address);
    if (!activeWallet) {
      sileo.error({
        title: t("revokeError"),
        description: "No active wallet found",
      });
      return;
    }

    setRevokeLoading(grantee);
    try {
      const viemWallet = await getViemWalletClient(activeWallet);

      const request = await signMetaTransaction(
        viemWallet,
        CONTRACT_ADDRESSES.HealthProofGateway as `0x${string}`,
        "revokeAccess",
        [walletAddress.toLowerCase(), grantee.toLowerCase()],
        HealthProofGatewayAbi,
      );

      const res = await revokePermissionOnChain({
        request,
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
      sileo.error({
        title: t("revokeError"),
        description: String(e).slice(0, 120),
      });
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
              activeTab === "list"
                ? "neu-pressed text-slate-800"
                : "neu-surface text-slate-500"
            }`}
            onClick={() => setActiveTab("list")}
            type="button"
          >
            {t("tabList")}
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "grant"
                ? "neu-pressed text-slate-800"
                : "neu-surface text-slate-500"
            }`}
            onClick={() => setActiveTab("grant")}
            type="button"
          >
            {t("tabGrant")}
          </button>
          <button
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "sent"
                ? "neu-pressed text-slate-800"
                : "neu-surface text-slate-500"
            }`}
            onClick={() => setActiveTab("sent")}
            type="button"
          >
            {t("tabSent") ?? "Sent"}
          </button>
        </div>
      </div>

      {activeTab === "list" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          {loading ? (
            <SkeletonList count={3} />
          ) : permissions.length === 0 ? (
            <EmptyState icon={ShieldOff} title={t("empty")} />
          ) : (
            <div className="space-y-3">
              {Array.from(
                new Map(
                  permissions.map((p) => [
                    `${p.grantee.toLowerCase()}-${p.resourceId.toLowerCase()}`,
                    p,
                  ]),
                ).values(),
              ).map((p) => (
                <div
                  key={p.grantee + p.resourceId}
                  className="neu-inset rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {p.grantee.slice(0, 10)}…{p.grantee.slice(-4)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t("scope")}:{" "}
                      {p.scope === 0
                        ? (t("scopeDocument") ?? "Documento")
                        : p.scope === 1
                          ? (t("scopeEpisode") ?? "Episodio")
                          : p.scope === 2
                            ? (t("scopeFull") ?? "Completo")
                            : p.scope}{" "}
                      · {t("resource")}: {p.resourceId.slice(0, 10)}…
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {p.expiresAt > 0
                        ? `${t("expires")}: ${new Date(p.expiresAt * 1000).toLocaleString()}`
                        : t("noExpiry")}
                      ·{" "}
                      {p.active ? (
                        <span className="text-green-600">{t("active")}</span>
                      ) : (
                        <span className="text-red-500">{t("inactive")}</span>
                      )}
                    </p>
                  </div>
                  {p.active && (
                    <button
                      className="neu-surface hover:neu-pressed shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-500 transition-all disabled:opacity-50"
                      disabled={revokeLoading === p.grantee}
                      onClick={() => handleRevoke(p.grantee)}
                      type="button"
                    >
                      {revokeLoading === p.grantee
                        ? t("revoking")
                        : t("revoke")}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "sent" && (
        <div className="neu-shell border border-white/70 p-6 sm:p-8">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">
            {t("sentInvitations") ?? "Sent Invitations"}
          </h2>
          {loadingSent ? (
            <SkeletonList count={3} />
          ) : sentInvitations.length === 0 ? (
            <EmptyState
              icon={ShieldOff}
              title={t("noSentInvitations") ?? "No invitations sent yet."}
            />
          ) : (
            <div className="space-y-3">
              {sentInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="neu-inset rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">
                      {t("to") ?? "To"}: {inv.grantee_wallet.slice(0, 10)}…
                      {inv.grantee_wallet.slice(-4)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t("scope")}:{" "}
                      {inv.scope === 0
                        ? (t("scopeDocument") ?? "Documento")
                        : inv.scope === 1
                          ? (t("scopeEpisode") ?? "Episodio")
                          : inv.scope === 2
                            ? (t("scopeFull") ?? "Completo")
                            : inv.scope}{" "}
                      · {inv.document_ids.length} {t("documents") ?? "docs"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {inv.status === "pending" && (
                        <span className="text-amber-600">
                          {t("pending") ?? "Pending"}
                        </span>
                      )}
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
                      {inv.expires_at_unix > 0 &&
                        ` · ${t("expires")}: ${new Date(inv.expires_at_unix * 1000).toLocaleString()}`}
                    </p>
                  </div>
                  {inv.status === "pending" && (
                    <button
                      className="neu-surface hover:neu-pressed shrink-0 rounded-xl px-3 py-1.5 text-xs font-semibold text-red-500 transition-all"
                      onClick={() => handleCancelInvitation(inv.id)}
                      type="button"
                    >
                      {t("cancel") ?? "Cancel"}
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
          <h2 className="text-sm font-semibold text-slate-700">
            {t("grantTitle")}
          </h2>
          <p className="text-xs text-slate-500">
            {t("invitationNote") ??
              "The recipient must accept the invitation before the permission is active on-chain."}
          </p>
          <div>
            <UserSelect
              value={granteeWallet}
              onChange={setGranteeWallet}
              label={t("granteeLabel")}
              placeholder={t("granteePlaceholder")}
              filterRoles={["doctor", "lab", "institution"]}
              excludeWallet={walletAddress ?? undefined}
            />
          </div>
          {/* Grant mode toggle */}
          <div>
            <span className="mb-1.5 block text-xs font-medium text-slate-700">
              {t("scopeByDocument") ?? "Tipo de alcance"}
            </span>
            <div className="flex gap-2">
              <button
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  grantMode === "document"
                    ? "neu-pressed text-slate-800 border-l-4 border-l-sky-500"
                    : "neu-surface text-slate-500 hover:neu-pressed"
                }`}
                onClick={() => setGrantMode("document")}
                type="button"
              >
                <FileText className="mr-1 h-4 w-4 inline" />
                {t("modeDocument") ?? "Documento(s)"}
              </button>
              <button
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                  grantMode === "episode"
                    ? "neu-pressed text-slate-800 border-l-4 border-l-sky-500"
                    : "neu-surface text-slate-500 hover:neu-pressed"
                }`}
                onClick={() => setGrantMode("episode")}
                type="button"
              >
                <FolderOpen className="mr-1 h-4 w-4 inline" />
                {t("modeEpisode") ?? "Episodio"}
              </button>
            </div>
          </div>

          {/* Document selector */}
          {grantMode === "document" && (
            <div>
              <span className="mb-1.5 block text-xs font-medium text-slate-700">
                {t("documentLabel")}
              </span>
              {loadingDocs ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are static
                    <div
                      key={i}
                      className="neu-pressed h-10 w-full animate-pulse rounded-xl bg-slate-200"
                    />
                  ))}
                </div>
              ) : userDocs.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">
                  {t("noDocuments")}
                </p>
              ) : (
                <div className="neu-inset rounded-xl p-4 space-y-2 max-h-56 overflow-y-auto">
                  <label className="flex items-center gap-2 cursor-pointer pb-2 border-b border-slate-200/50">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200"
                      checked={selectAllDocs}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectAllDocs(checked);
                        if (checked) {
                          setSelectedDocs(["all"]);
                        } else {
                          setSelectedDocs([]);
                        }
                      }}
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {t("allDocuments")}
                    </span>
                  </label>
                  {userDocs.map((doc) => (
                    <label
                      key={doc.document_id}
                      className="flex items-center gap-2 cursor-pointer py-1"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200"
                        checked={
                          selectedDocs.includes(doc.document_id) ||
                          selectedDocs.includes("all")
                        }
                        disabled={selectAllDocs}
                        onChange={(e) => {
                          if (selectAllDocs) return;
                          const checked = e.target.checked;
                          setSelectedDocs((prev) =>
                            checked
                              ? [...prev, doc.document_id]
                              : prev.filter((id) => id !== doc.document_id),
                          );
                        }}
                      />
                      <span className="text-sm text-slate-700 truncate">
                        {doc.file_name ?? `${doc.document_id.slice(0, 24)}…`}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Episode selector */}
          {grantMode === "episode" && (
            <div className="space-y-3">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-slate-700">
                  {t("selectEpisode") ?? "Selecciona un episodio"}
                </span>
                {loadingEpisodes ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are static
                      <div
                        key={i}
                        className="neu-pressed h-10 w-full animate-pulse rounded-xl bg-slate-200"
                      />
                    ))}
                  </div>
                ) : episodes.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    {t("noEpisodes") ?? "No se encontraron episodios."}
                  </p>
                ) : (
                  <div className="neu-inset rounded-xl p-4 space-y-2 max-h-40 overflow-y-auto">
                    {episodes.map((ep) => (
                      <button
                        key={ep.episodeId}
                        className={`w-full text-left rounded-xl px-3 py-2 text-sm transition-all ${
                          selectedEpisode?.episodeId === ep.episodeId
                            ? "neu-pressed border-l-4 border-l-sky-500"
                            : "neu-surface hover:neu-pressed"
                        }`}
                        onClick={() => setSelectedEpisode(ep)}
                        type="button"
                      >
                        <span className="font-semibold text-slate-700">
                          {ep.episodeType} — {ep.classification}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">
                          {new Date(ep.openedAt * 1000).toLocaleDateString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedEpisode && (
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-700">
                    {t("documentsInEpisode") ?? "Documentos del episodio"}
                  </span>
                  {loadingEpisodeDocs ? (
                    <p className="text-sm text-slate-400 py-2">
                      {t("loading") ?? "Cargando…"}
                    </p>
                  ) : episodeDocs.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">
                      {t("noDocumentsInEpisode") ??
                        "Este episodio no tiene documentos."}
                    </p>
                  ) : (
                    <div className="neu-inset rounded-xl p-4 space-y-2 max-h-40 overflow-y-auto">
                      {episodeDocs.map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-slate-700 truncate">
                            {d.file_name ?? `${d.document_id.slice(0, 24)}…`}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(d.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1">
              <span className="mb-1.5 block text-xs font-medium text-slate-700">
                {t("scopeLabel")}
              </span>
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
              <span className="mb-1.5 block text-xs font-medium text-slate-700">
                {t("expiresLabel")}
              </span>
              <input
                className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
                type="number"
                placeholder={t("expiresPlaceholder")}
                value={expiresInMinutes}
                onChange={(e) =>
                  setExpiresInMinutes(
                    e.target.value === "" ? "" : Number(e.target.value),
                  )
                }
              />
            </div>
          </div>
          <button
            className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
            disabled={
              grantLoading ||
              !granteeWallet.trim() ||
              (grantMode === "episode" ? !selectedEpisode : false)
            }
            onClick={handleSendInvitation}
            type="button"
          >
            {grantLoading
              ? (t("sending") ?? "Sending…")
              : (t("sendInvitation") ?? "Send Invitation")}
          </button>
        </div>
      )}
    </main>
  );
}
