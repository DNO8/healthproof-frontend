"use client";

import { useLoginWithEmail, usePrivy } from "@privy-io/react-auth";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sileo } from "sileo";
import { ROLES, type UserRole } from "@/types/domain.types";

export default function AuthPage() {
  const router = useRouter();
  const { ready, authenticated, login: privyLogin } = usePrivy();
  const { sendCode, loginWithCode } = useLoginWithEmail();

  const [step, setStep] = useState<"choose" | "email" | "otp">("choose");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (ready && authenticated) {
      router.push("/dashboard");
    }
  }, [ready, authenticated, router]);

  async function handleSendCode() {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      sileo.warning({
        title: "Invalid email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    if (!selectedRole) {
      sileo.warning({
        title: "Role required",
        description: "Please select a role to continue.",
      });
      return;
    }

    setIsPending(true);
    try {
      localStorage.setItem("hp_selected_role", selectedRole);
      await sendCode({ email: trimmed });
      setStep("otp");
      sileo.info({
        title: "Code sent",
        description: `We sent a verification code to ${trimmed}`,
        duration: 4000,
      });
    } catch {
      sileo.error({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleVerifyCode() {
    if (!otpCode.trim()) {
      sileo.warning({
        title: "Code required",
        description: "Please enter the verification code.",
      });
      return;
    }

    setIsPending(true);
    try {
      await loginWithCode({ code: otpCode.trim() });
      sileo.success({
        title: "Welcome!",
        description: "You have signed in successfully.",
        duration: 4000,
      });
      router.push("/dashboard");
    } catch {
      sileo.error({
        title: "Invalid code",
        description: "The verification code is incorrect or expired.",
      });
    } finally {
      setIsPending(false);
    }
  }

  if (!ready) {
    return (
      <main className="flex min-h-[calc(100vh-60px)] items-center justify-center">
        <p className="text-sm text-slate-400">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="neu-shell border border-white/70 p-8 sm:p-10">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-3">
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
              {step === "otp"
                ? "Enter the code we sent to your email"
                : "Sign in to access your medical records"}
            </p>
          </div>

          {step === "choose" && (
            <div className="space-y-5">
              {/* Role selection */}
              <div>
                <p className="mb-2 text-xs font-medium text-slate-700">
                  Select your role
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
                          {role.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {selectedRole && (
                  <p className="mt-2 text-center text-[11px] text-slate-400">
                    {ROLES.find((r) => r.key === selectedRole)?.description}
                  </p>
                )}
              </div>

              {/* Continue buttons */}
              <button
                className="w-full rounded-2xl border border-white/60 bg-(--hp-primary) px-8 py-3 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) active:translate-y-px disabled:opacity-60"
                disabled={!selectedRole}
                onClick={() => setStep("email")}
                type="button"
              >
                Continue with Email
              </button>

              <div className="relative flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[11px] text-slate-400">or</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <button
                className="neu-surface w-full rounded-2xl border border-white/60 px-8 py-3 text-sm font-medium text-slate-600 transition hover:text-slate-800 active:translate-y-px disabled:opacity-60"
                disabled={!selectedRole}
                onClick={() => {
                  if (selectedRole) {
                    localStorage.setItem("hp_selected_role", selectedRole);
                  }
                  privyLogin();
                }}
                type="button"
              >
                Continue with Wallet or Google
              </button>
            </div>
          )}

          {step === "email" && (
            <div className="space-y-5">
              <div>
                <label
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                  htmlFor="email"
                >
                  Email
                </label>
                <input
                  autoComplete="email"
                  className="neu-inset w-full rounded-xl px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  id="email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                  value={email}
                />
              </div>

              <button
                className="w-full rounded-2xl border border-white/60 bg-(--hp-primary) px-8 py-3 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) active:translate-y-px disabled:opacity-60"
                disabled={isPending}
                onClick={handleSendCode}
                type="button"
              >
                {isPending ? "Sending..." : "Send Verification Code"}
              </button>

              <button
                className="w-full text-xs text-slate-400 transition hover:text-slate-600"
                onClick={() => setStep("choose")}
                type="button"
              >
                Back
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
                  Verification Code
                </label>
                <input
                  autoComplete="one-time-code"
                  className="neu-inset w-full rounded-xl px-4 py-3 text-center text-lg font-semibold tracking-[0.3em] text-slate-800 outline-none placeholder:text-slate-400"
                  id="otp"
                  maxLength={6}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="000000"
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
                {isPending ? "Verifying..." : "Verify & Sign In"}
              </button>

              <button
                className="w-full text-xs text-slate-400 transition hover:text-slate-600"
                onClick={() => {
                  setOtpCode("");
                  setStep("email");
                }}
                type="button"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
