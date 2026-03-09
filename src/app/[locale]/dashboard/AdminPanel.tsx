"use client";

import { useState } from "react";
import { sileo } from "sileo";
import {
  isProtocolPaused,
  pauseProtocol,
  resumeProtocol,
  adminRegisterEntity,
  adminVerifyEntity,
  adminGetEntity,
} from "@/actions/admin-onchain";
import { ContractRole } from "@/types/domain.types";

type AdminPanelProps = {
  onClose: () => void;
};

const ROLE_OPTIONS: { label: string; value: ContractRole }[] = [
  { label: "Patient", value: ContractRole.PATIENT },
  { label: "Doctor", value: ContractRole.DOCTOR },
  { label: "Lab", value: ContractRole.LAB },
  { label: "Institution", value: ContractRole.INSTITUTION },
  { label: "Certifier", value: ContractRole.CERTIFIER },
  { label: "Admin", value: ContractRole.ADMIN },
];

type Tab = "protocol" | "entities";

export function AdminPanel({ onClose }: AdminPanelProps) {
  const [tab, setTab] = useState<Tab>("protocol");

  // Protocol state
  const [paused, setPaused] = useState<boolean | null>(null);
  const [protocolLoading, setProtocolLoading] = useState(false);

  // Entity state
  const [wallet, setWallet] = useState("");
  const [role, setRole] = useState<ContractRole>(ContractRole.PATIENT);
  const [specialty, setSpecialty] = useState("");
  const [entityLoading, setEntityLoading] = useState(false);
  const [lookupWallet, setLookupWallet] = useState("");
  const [entityInfo, setEntityInfo] = useState<{
    role: number;
    specialty: string;
    institution: string;
    verified: boolean;
  } | null>(null);

  async function checkPaused() {
    setProtocolLoading(true);
    try {
      const result = await isProtocolPaused();
      setPaused(result);
    } finally {
      setProtocolLoading(false);
    }
  }

  async function handlePause() {
    setProtocolLoading(true);
    try {
      const res = await pauseProtocol();
      if ("error" in res) {
        sileo.error({ title: "Pause failed", description: res.error.slice(0, 120) });
      } else {
        setPaused(true);
        sileo.success({ title: "Protocol paused", description: `TX: ${res.txHash.slice(0, 16)}…` });
      }
    } finally {
      setProtocolLoading(false);
    }
  }

  async function handleResume() {
    setProtocolLoading(true);
    try {
      const res = await resumeProtocol();
      if ("error" in res) {
        sileo.error({ title: "Resume failed", description: res.error.slice(0, 120) });
      } else {
        setPaused(false);
        sileo.success({ title: "Protocol resumed", description: `TX: ${res.txHash.slice(0, 16)}…` });
      }
    } finally {
      setProtocolLoading(false);
    }
  }

  async function handleRegisterEntity() {
    if (!wallet.trim()) return;
    setEntityLoading(true);
    try {
      const res = await adminRegisterEntity({
        wallet: wallet.trim(),
        role,
        specialty: specialty.trim() || undefined,
      });
      if ("error" in res) {
        sileo.error({ title: "Register failed", description: res.error.slice(0, 120) });
      } else {
        sileo.success({ title: "Entity registered", description: `TX: ${res.txHash.slice(0, 16)}…` });
      }
    } finally {
      setEntityLoading(false);
    }
  }

  async function handleVerifyEntity() {
    if (!wallet.trim()) return;
    setEntityLoading(true);
    try {
      const res = await adminVerifyEntity(wallet.trim());
      if ("error" in res) {
        sileo.error({ title: "Verify failed", description: res.error.slice(0, 120) });
      } else {
        sileo.success({ title: "Entity verified", description: `TX: ${res.txHash.slice(0, 16)}…` });
      }
    } finally {
      setEntityLoading(false);
    }
  }

  async function handleLookupEntity() {
    if (!lookupWallet.trim()) return;
    setEntityLoading(true);
    setEntityInfo(null);
    try {
      const info = await adminGetEntity(lookupWallet.trim());
      setEntityInfo(info);
      if (!info) sileo.error({ title: "Not found", description: "Entity not registered on-chain" });
    } finally {
      setEntityLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="neu-surface w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/70 p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Admin Panel</h2>
          <button className="text-slate-400 hover:text-slate-600" onClick={onClose} type="button">✕</button>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-2">
          {(["protocol", "entities"] as const).map((t) => (
            <button
              key={t}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                tab === t ? "neu-pressed text-slate-800" : "neu-surface text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => setTab(t)}
              type="button"
            >
              {t === "protocol" ? "Protocol" : "Entities"}
            </button>
          ))}
        </div>

        {/* Protocol Tab */}
        {tab === "protocol" && (
          <div className="space-y-4">
            <button
              className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
              disabled={protocolLoading}
              onClick={checkPaused}
              type="button"
            >
              {protocolLoading ? "Checking…" : "Check Protocol Status"}
            </button>

            {paused !== null && (
              <div className={`rounded-xl p-4 text-sm font-medium ${paused ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                Protocol is {paused ? "PAUSED" : "ACTIVE"}
              </div>
            )}

            <div className="flex gap-3">
              <button
                className="neu-surface hover:neu-pressed flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-red-600 transition-all disabled:opacity-50"
                disabled={protocolLoading}
                onClick={handlePause}
                type="button"
              >
                Pause Protocol
              </button>
              <button
                className="neu-surface hover:neu-pressed flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-green-600 transition-all disabled:opacity-50"
                disabled={protocolLoading}
                onClick={handleResume}
                type="button"
              >
                Resume Protocol
              </button>
            </div>
          </div>
        )}

        {/* Entities Tab */}
        {tab === "entities" && (
          <div className="space-y-5">
            {/* Register / Verify */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Register & Verify</h3>
              <input
                className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
                placeholder="Wallet address (0x…)"
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
              />
              <div className="flex gap-3">
                <select
                  className="neu-pressed flex-1 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
                  value={role}
                  onChange={(e) => setRole(Number(e.target.value) as ContractRole)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <input
                  className="neu-pressed flex-1 rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
                  placeholder="Specialty (optional)"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                />
              </div>
              <div className="flex gap-3">
                <button
                  className="neu-surface hover:neu-pressed flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
                  disabled={entityLoading || !wallet.trim()}
                  onClick={handleRegisterEntity}
                  type="button"
                >
                  Register
                </button>
                <button
                  className="neu-surface hover:neu-pressed flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
                  disabled={entityLoading || !wallet.trim()}
                  onClick={handleVerifyEntity}
                  type="button"
                >
                  Verify
                </button>
              </div>
            </div>

            {/* Lookup */}
            <div className="space-y-3 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-700">Lookup Entity</h3>
              <input
                className="neu-pressed w-full rounded-xl px-4 py-2.5 text-sm text-slate-700 outline-none"
                placeholder="Wallet address (0x…)"
                value={lookupWallet}
                onChange={(e) => setLookupWallet(e.target.value)}
              />
              <button
                className="neu-surface hover:neu-pressed w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all disabled:opacity-50"
                disabled={entityLoading || !lookupWallet.trim()}
                onClick={handleLookupEntity}
                type="button"
              >
                {entityLoading ? "Fetching…" : "Lookup"}
              </button>

              {entityInfo && (
                <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-700 space-y-1">
                  <div><span className="font-medium">Role:</span> {ROLE_OPTIONS.find((r) => r.value === entityInfo.role)?.label ?? entityInfo.role}</div>
                  <div><span className="font-medium">Specialty:</span> {entityInfo.specialty || "—"}</div>
                  <div><span className="font-medium">Institution:</span> <code className="text-[11px]">{entityInfo.institution}</code></div>
                  <div><span className="font-medium">Verified:</span> <span className={entityInfo.verified ? "text-green-600" : "text-red-500"}>{entityInfo.verified ? "Yes" : "No"}</span></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
