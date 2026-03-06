"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { sileo } from "sileo";
import { ROLES, type UserRole } from "@/types/domain.types";
import { login, signup } from "./actions";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    if (mode === "signup" && !selectedRole) {
      sileo.warning({
        title: "Role required",
        description: "Please select a role before creating your account.",
      });
      return;
    }

    const email = (formData.get("email") as string)?.trim();
    if (!email) {
      sileo.warning({
        title: "Email required",
        description: "Please enter your email address.",
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sileo.warning({
        title: "Invalid email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    const password = formData.get("password") as string;
    if (!password || password.length < 6) {
      sileo.warning({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
      });
      return;
    }

    sileo.info({
      title: mode === "login" ? "Signing in..." : "Creating account...",
      description: "Please wait a moment.",
      duration: 2000,
    });

    startTransition(async () => {
      const action = mode === "login" ? login : signup;
      const result = await action(formData);
      if (result?.error) {
        sileo.error({
          title: mode === "login" ? "Login failed" : "Signup failed",
          description: result.error,
        });
        return;
      }

      if (result?.success) {
        if (mode === "signup") {
          sileo.success({
            title: "Account created!",
            description: "Your account has been created. Please sign in.",
            duration: 4000,
          });
          setMode("login");
        } else {
          sileo.success({
            title: "Welcome back!",
            description: "You have signed in successfully.",
            duration: 4000,
          });
          router.push("/dashboard");
          router.refresh();
        }
      }
    });
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
              {mode === "login"
                ? "Sign in to your account"
                : "Create a new account"}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="neu-inset mb-8 flex rounded-xl p-1">
            <button
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${
                mode === "login"
                  ? "neu-surface text-sky-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => {
                setMode("login");
              }}
              type="button"
            >
              Log in
            </button>
            <button
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all duration-200 ${
                mode === "signup"
                  ? "neu-surface text-sky-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
              onClick={() => {
                setMode("signup");
              }}
              type="button"
            >
              Sign up
            </button>
          </div>

          {/* Form */}
          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Role selection — signup only */}
            {mode === "signup" && (
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
                <input name="role" type="hidden" value={selectedRole ?? ""} />
              </div>
            )}

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
                name="email"
                placeholder="you@example.com"
                type="text"
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-medium text-slate-700"
                htmlFor="password"
              >
                Password
              </label>
              <input
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                className="neu-inset w-full rounded-xl px-4 py-3 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                id="password"
                name="password"
                placeholder="••••••••"
                type="password"
              />
            </div>

            <button
              className="w-full rounded-2xl border border-white/60 bg-(--hp-primary) px-8 py-3 text-sm font-semibold text-slate-800 shadow-(--hp-shadow-raised) transition hover:bg-(--hp-primary-soft) active:translate-y-px disabled:opacity-60"
              disabled={isPending}
              type="submit"
            >
              {isPending
                ? "Loading..."
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
