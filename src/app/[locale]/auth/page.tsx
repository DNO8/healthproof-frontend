"use client";

import { useLoginWithEmail, usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";
import { sileo } from "sileo";
import { useLocale, useTranslations } from "next-intl";
import { ROLES, type UserRole } from "@/types/domain.types";

export default function AuthPage() {
  const t = useTranslations("auth");
  const tRoles = useTranslations("roles");
  const locale = useLocale();
  const { ready, authenticated, login: privyLogin } = usePrivy();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const redirectedRef = useRef(false);

  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isPending, setIsPending] = useState(false);

  const dashboardPath = `/${locale}/dashboard`;

  useEffect(() => {
    if (ready && authenticated && !redirectedRef.current) {
      redirectedRef.current = true;
      window.location.href = dashboardPath;
    }
  }, [ready, authenticated, dashboardPath]);

  const roleLabels: Record<UserRole, { label: string; desc: string }> = {
    patient: { label: tRoles("patient"), desc: tRoles("patientDesc") },
    laboratory: { label: tRoles("laboratory"), desc: tRoles("laboratoryDesc") },
    medical_center: {
      label: tRoles("medicalCenter"),
      desc: tRoles("medicalCenterDesc"),
    },
  };

  async function handleSendCode() {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      sileo.warning({
        title: t("invalidEmail"),
        description: t("invalidEmailDesc"),
      });
      return;
    }

    if (mode === "signup" && !selectedRole) {
      sileo.warning({
        title: t("roleRequired"),
        description: t("roleRequiredDesc"),
      });
      return;
    }

    setIsPending(true);
    try {
      if (selectedRole) {
        localStorage.setItem("hp_selected_role", selectedRole);
      }
      await sendCode({ email: trimmed });
      setStep("otp");
      sileo.info({
        title: t("codeSent"),
        description: t("codeSentDesc", { email: trimmed }),
        duration: 4000,
      });
    } catch {
      sileo.error({
        title: t("errorTitle"),
        description: t("errorSendCode"),
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleVerifyCode() {
    if (!otpCode.trim()) {
      sileo.warning({
        title: t("codeRequired"),
        description: t("codeRequiredDesc"),
      });
      return;
    }

    setIsPending(true);
    try {
      await loginWithCode({ code: otpCode.trim() });
      sileo.success({
        title: t("welcome"),
        description: t("welcomeDesc"),
        duration: 4000,
      });
      window.location.href = dashboardPath;
    } catch {
      sileo.error({
        title: t("invalidCode"),
        description: t("invalidCodeDesc"),
      });
    } finally {
      setIsPending(false);
    }
  }

  if (!ready) {
    return (
      <main className="flex min-h-[calc(100vh-60px)] items-center justify-center">
        <p className="text-sm text-slate-400">{t("loading")}</p>
      </main>
    );
  }

  const pillClass = (active: boolean) =>
    `flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 ${
      active
        ? "neu-pressed text-sky-700"
        : "text-slate-400 hover:text-slate-600"
    }`;

  return (
    <main className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="neu-shell border border-white/70 p-8 sm:p-10">
          {/* Logo */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <Link className="flex items-center gap-2" href="/">
              <Image
                alt="HealthProof"
                height={40}
                src="/images/logo/healthproof-logo.png"
                width={40}
              />
            </Link>
            <h1 className="text-xl font-bold tracking-tight">
              <span className="bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
                Health
              </span>
              <span className="text-slate-800">Proof</span>
            </h1>
            <p className="text-xs text-slate-500">
              {step === "otp" ? t("otpSubtitle") : t("subtitle")}
            </p>
          </div>

          {/* Sign In / Sign Up pill toggle */}
          {step === "form" && (
            <div className="mb-6 flex items-center rounded-full border border-white/60 bg-white/40 p-0.5">
              <button
                className={pillClass(mode === "signin")}
                onClick={() => setMode("signin")}
                type="button"
              >
                {t("signIn")}
              </button>
              <button
                className={pillClass(mode === "signup")}
                onClick={() => setMode("signup")}
                type="button"
              >
                {t("signUp")}
              </button>
            </div>
          )}

          {step === "form" && (
            <div className="space-y-5">
              {/* Role selection — only for Sign Up */}
              {mode === "signup" && (
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-700">
                    {t("selectRole")}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {ROLES.map((role) => {
                      const isSelected = selectedRole === role.key;
                      return (
                        <button
                          className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all duration-200 ${
                            isSelected
                              ? "neu-pressed border border-sky-200 text-sky-700"
                              : "neu-surface border border-transparent text-slate-600 hover:border-slate-200"
                          }`}
                          key={role.key}
                          onClick={() => setSelectedRole(role.key)}
                          type="button"
                        >
                          <span className="text-2xl">{role.icon}</span>
                          <span className="text-[11px] font-semibold leading-tight">
                            {roleLabels[role.key].label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedRole && (
                    <p className="mt-2 text-center text-[11px] text-slate-400">
                      {roleLabels[selectedRole].desc}
                    </p>
                  )}
                </div>
              )}

              {/* Email input */}
              <div>
                <label
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                  htmlFor="email"
                >
                  {t("emailLabel")}
                </label>
                <input
                  autoComplete="email"
                  className="neu-inset w-full rounded-xl px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  type="email"
                  value={email}
                />
              </div>

              <button
                className="w-full rounded-2xl border border-white/60 bg-(--hp-primary) px-8 py-3 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) active:translate-y-px disabled:opacity-60"
                disabled={isPending || (mode === "signup" && !selectedRole)}
                onClick={handleSendCode}
                type="button"
              >
                {isPending ? t("sendingCode") : t("sendCode")}
              </button>

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] text-slate-400">{t("or")}</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                className="neu-surface w-full rounded-2xl border border-white/60 px-8 py-3 text-sm font-medium text-slate-600 transition hover:text-slate-800 active:translate-y-px disabled:opacity-60"
                disabled={mode === "signup" && !selectedRole}
                onClick={() => {
                  if (selectedRole) {
                    localStorage.setItem("hp_selected_role", selectedRole);
                  }
                  privyLogin();
                }}
                type="button"
              >
                {t("continueWallet")}
              </button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-5">
              <div>
                <label
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                  htmlFor="otp"
                >
                  {t("otpLabel")}
                </label>
                <input
                  autoComplete="one-time-code"
                  className="neu-inset w-full rounded-xl px-4 py-3 text-center text-lg font-semibold tracking-[0.3em] text-slate-800 outline-none placeholder:text-slate-400"
                  id="otp"
                  maxLength={6}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder={t("otpPlaceholder")}
                  type="text"
                  value={otpCode}
                />
              </div>

              <button
                className="w-full rounded-2xl border border-white/60 bg-(--hp-primary) px-8 py-3 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) active:translate-y-px disabled:opacity-60"
                disabled={isPending}
                onClick={handleVerifyCode}
                type="button"
              >
                {isPending ? t("verifying") : t("verifySignIn")}
              </button>

              <button
                className="w-full text-xs text-slate-400 transition hover:text-slate-600"
                onClick={() => {
                  setOtpCode("");
                  setStep("form");
                }}
                type="button"
              >
                {t("useDifferentEmail")}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
