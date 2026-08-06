"use client";

import { useTranslations } from "next-intl";
import type { ScenarioKey } from "@/actions/prevent-ia/analyze-document";
import { RISK_DOT_CLASS } from "./risk-styles";

const SCENARIOS: {
  key: ScenarioKey;
  riskLevel: "bajo" | "moderado" | "alto";
}[] = [
  { key: "escenario_riesgo_bajo", riskLevel: "bajo" },
  { key: "escenario_riesgo_en_ascenso", riskLevel: "moderado" },
  { key: "escenario_riesgo_alto", riskLevel: "alto" },
];

interface ScenarioSwitcherProps {
  active: ScenarioKey;
  loading: boolean;
  onSelect: (key: ScenarioKey) => void;
}

export function ScenarioSwitcher({
  active,
  loading,
  onSelect,
}: ScenarioSwitcherProps) {
  const t = useTranslations("dashboard.preventIa.scenarios");

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {SCENARIOS.map((scenario) => {
        const isActive = scenario.key === active;
        return (
          <button
            key={scenario.key}
            type="button"
            disabled={loading}
            onClick={() => onSelect(scenario.key)}
            className={`rounded-2xl px-5 py-3 text-left transition-all disabled:cursor-wait disabled:opacity-60 ${
              isActive ? "neu-pressed" : "neu-chip hover:neu-pressed"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${RISK_DOT_CLASS[scenario.riskLevel]}`}
              />
              <span className="font-medium text-slate-800">
                {t(`${scenario.key}.label`)}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {t(`${scenario.key}.hint`)}
            </div>
          </button>
        );
      })}
    </div>
  );
}
