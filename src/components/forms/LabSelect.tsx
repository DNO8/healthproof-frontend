"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  listLabsWithNetwork,
  getDoctorNetworkId,
  type LabWithNetwork,
} from "@/actions/list-labs-with-network";

export type LabSelectProps = {
  value: string;
  onChange: (walletAddress: string) => void;
  doctorWallet: string;
};

export function LabSelect({ value, onChange, doctorWallet }: LabSelectProps) {
  const t = useTranslations("dashboard.myOrders");
  const [labs, setLabs] = useState<LabWithNetwork[]>([]);
  const [doctorNetworkId, setDoctorNetworkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      listLabsWithNetwork(),
      doctorWallet ? getDoctorNetworkId(doctorWallet) : Promise.resolve(null),
    ])
      .then(([labList, netId]) => {
        setLabs(labList);
        setDoctorNetworkId(netId);
      })
      .finally(() => setLoading(false));
  }, [doctorWallet]);

  const { recommended, others } = useMemo(() => {
    if (!doctorNetworkId) return { recommended: [], others: labs };
    const rec: LabWithNetwork[] = [];
    const oth: LabWithNetwork[] = [];
    for (const lab of labs) {
      if (lab.networkId === doctorNetworkId) {
        rec.push(lab);
      } else {
        oth.push(lab);
      }
    }
    return { recommended: rec, others: oth };
  }, [labs, doctorNetworkId]);

  function formatLabel(lab: LabWithNetwork) {
    const name = lab.fullName || lab.email || "Lab";
    const shortWallet = `${lab.wallet.slice(0, 6)}…${lab.wallet.slice(-4)}`;
    return `${name} (${shortWallet})`;
  }

  return (
    <div>
      <label
        className="mb-1.5 block text-xs font-medium text-slate-700"
        htmlFor="lab-select"
      >
        {t("selectLab")}
      </label>
      <select
        id="lab-select"
        className="neu-inset w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        <option value="">
          {loading ? t("loadingLabs") : t("selectLabPlaceholder")}
        </option>
        {recommended.length > 0 && (
          <optgroup label={t("recommendedLabs")}>
            {recommended.map((lab) => (
              <option key={lab.wallet} value={lab.wallet}>
                {formatLabel(lab)}
              </option>
            ))}
          </optgroup>
        )}
        {others.length > 0 && (
          <optgroup label={recommended.length > 0 ? t("otherLabs") : t("availableLabs")}>
            {others.map((lab) => (
              <option key={lab.wallet} value={lab.wallet}>
                {formatLabel(lab)}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      {!loading && labs.length === 0 && (
        <p className="mt-1 text-[11px] text-slate-400">{t("noLabsAvailable")}</p>
      )}
    </div>
  );
}
