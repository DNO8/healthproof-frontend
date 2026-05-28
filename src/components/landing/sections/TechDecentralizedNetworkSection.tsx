"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Shield,
  Server,
  Users,
  Building2,
  FlaskConical,
  Stethoscope,
  Pill,
  ShieldCheck,
} from "lucide-react";
import { ScrollReveal, SectionTitle } from "@/components/ui";

export function TechDecentralizedNetworkSection() {
  const t = useTranslations("techSections");
  const [activeNode, setActiveNode] = useState<number | null>(null);
  const [compromised, setCompromised] = useState(false);

  const nodes = [
    { id: 0, x: 50, y: 20, label: t("nodeHospital"), Icon: Building2 },
    { id: 1, x: 20, y: 50, label: t("nodeLab"), Icon: FlaskConical },
    { id: 2, x: 80, y: 50, label: t("nodeClinic"), Icon: Stethoscope },
    { id: 3, x: 35, y: 80, label: t("nodePharmacy"), Icon: Pill },
    { id: 4, x: 65, y: 80, label: t("nodeInsurance"), Icon: ShieldCheck },
  ];

  const links = [
    [0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [1, 2], [0, 3], [0, 4],
  ];

  const handleNodeClick = (id: number) => {
    if (compromised && activeNode === id) {
      setCompromised(false);
      setActiveNode(null);
    } else {
      setActiveNode(id);
      setCompromised(true);
    }
  };

  return (
    <section className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <ScrollReveal y={50} duration={0.8}>
        <div className="neu-shell border border-white/70 p-6 sm:p-10">
          <SectionTitle
            eyebrow={t("decentralizedBadge")}
            title={t("decentralizedTitle")}
            subtitle={t("decentralizedDesc")}
            centered
          />

          <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-center">
            {/* Interactive Network Visualization */}
            <div className="flex-1">
              <div className="relative aspect-square w-full max-w-lg mx-auto rounded-3xl border border-white/60 bg-(--hp-bg) p-6 shadow-(--hp-shadow-inset)">
                {/* SVG Links */}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
                  {links.map(([a, b], i) => {
                    const na = nodes[a];
                    const nb = nodes[b];
                    const isBroken = compromised && (a === activeNode || b === activeNode);
                    return (
                      <line
                        key={i}
                        x1={na.x}
                        y1={na.y}
                        x2={nb.x}
                        y2={nb.y}
                        stroke={isBroken ? "#cbd5e1" : "#93c5fd"}
                        strokeWidth={isBroken ? 0.5 : 0.8}
                        strokeDasharray={isBroken ? "4 2" : "0"}
                        opacity={isBroken ? 0.3 : 0.6}
                      />
                    );
                  })}
                </svg>

                {/* Nodes with icons */}
                {nodes.map((node) => {
                  const isActive = node.id === activeNode;
                  const isDown = compromised && isActive;
                  const Icon = node.Icon;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => handleNodeClick(node.id)}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 transition-all duration-300"
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 sm:h-12 sm:w-12 ${
                          isDown
                            ? "border-red-300 bg-red-100 shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                            : isActive
                              ? "border-sky-300 bg-sky-100 shadow-[0_0_12px_rgba(147,197,253,0.5)]"
                              : "border-slate-200 bg-white shadow-sm hover:border-sky-200 hover:bg-sky-50"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 sm:h-5 sm:w-5 ${
                            isDown ? "text-red-500" : isActive ? "text-sky-600" : "text-slate-400"
                          }`}
                        />
                      </div>
                      <span
                        className={`whitespace-nowrap text-[10px] font-medium sm:text-xs ${
                          isDown ? "text-red-600" : isActive ? "text-sky-700" : "text-slate-500"
                        }`}
                      >
                        {node.label}
                      </span>
                    </button>
                  );
                })}

                {/* Reset button */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveNode(null);
                      setCompromised(false);
                    }}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      compromised
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {compromised ? t("restoreNode") : t("clickNodeToSimulate")}
                  </button>
                </div>
              </div>
            </div>

            {/* Info cards */}
            <div className="flex-1 space-y-4">
              <div className="neu-inset flex gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50">
                  <Server className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{t("noSinglePointTitle")}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t("noSinglePointDesc")}</p>
                </div>
              </div>

              <div className="neu-inset flex gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <Shield className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{t("resilienceTitle")}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t("resilienceDesc")}</p>
                </div>
              </div>

              <div className="neu-inset flex gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                  <Users className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{t("interoperabilityTitle")}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t("interoperabilityDesc")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
