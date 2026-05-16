"use client";

import { useState, useEffect } from "react";
import { sileo } from "sileo";
import { useTranslations } from "next-intl";
import { listGuardiansOnChain } from "@/actions/list-guardians-onchain";
import { useWalletAddress } from "@/hooks/useWalletAddress";
import type { OnChainGuardianship } from "@/lib/medical-constants";

export default function GuardiansPage() {
  const t = useTranslations("dashboard.guardians");
  const walletAddress = useWalletAddress();
  const [guardians, setGuardians] = useState<OnChainGuardianship[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!walletAddress) return;
    setLoading(true);
    listGuardiansOnChain({ patientWallet: walletAddress })
      .then((result) => {
        if (result.success) {
          setGuardians(result.data.guardianships);
        }
      })
      .catch((e) => {
        sileo.error({ title: t("loadError"), description: String(e).slice(0, 120) });
      })
      .finally(() => setLoading(false));
  }, [walletAddress]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-slate-800">{t("title")}</h1>

      <div className="neu-shell border border-white/70 p-6 sm:p-8">
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">{t("loading")}</p>
        ) : guardians.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">{t("empty")}</p>
        ) : (
          <div className="space-y-3">
            {guardians.map((g) => (
              <div key={g.guardian} className="neu-inset rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {g.guardian.slice(0, 10)}…{g.guardian.slice(-4)}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {g.active ? (
                      <span className="text-green-600">{t("active")}</span>
                    ) : (
                      <span className="text-red-500">{t("inactive")}</span>
                    )}
                  </p>
                </div>
                <span className="text-xl shrink-0">{g.active ? "👤" : "🚫"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
