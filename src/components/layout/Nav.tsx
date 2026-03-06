"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sileo } from "sileo";
import { createClient } from "@/lib/supabase/client";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/contact", label: "Contact" },
] as const;

export function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    sessionStorage.removeItem("hp_welcome_shown");
    sileo.success({
      title: "Signed out",
      description: "You have been logged out successfully.",
    });
    router.push("/");
    router.refresh();
  }

  // Hide nav on auth page
  if (pathname === "/auth") return null;

  return (
    <div className="sticky top-0 z-50 flex w-full justify-center px-4 pt-4">
      <nav className="neu-shell flex w-full max-w-5xl items-center justify-between rounded-full border border-white/70 px-5 py-2.5 sm:px-8">
        {/* Logo */}
        <Link className="flex shrink-0 items-center gap-2" href="/">
          <Image
            alt="HealthProof"
            height={28}
            src="/images/logo/healthproof-logo.png"
            width={28}
          />
          <span className="text-sm font-bold tracking-tight sm:text-base">
            <span className="bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
              Health
            </span>
            <span className="text-slate-800">Proof</span>
          </span>
        </Link>

        {/* Center label */}
        <span className="hidden items-center gap-2 text-xs font-medium tracking-wide text-slate-400 md:flex">
          <svg
            aria-hidden="true"
            fill="none"
            height="16"
            viewBox="0 0 24 24"
            width="16"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 12h4l2-6 3 12 2-8 2 4h7"
              stroke="#60A5FA"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
          Protocol L1 : Avalanche
        </span>

        {/* Links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "neu-pressed text-sky-700"
                    : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                }`}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            );
          })}

          {!loading && (
            <>
              {user ? (
                <>
                  <Link
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                      pathname.startsWith("/dashboard")
                        ? "neu-pressed text-sky-700"
                        : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                    }`}
                    href="/dashboard"
                  >
                    Dashboard
                  </Link>
                  <button
                    className="rounded-full px-4 py-1.5 text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-white/50 hover:text-slate-800"
                    onClick={handleLogout}
                    type="button"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <Link
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                    pathname === "/auth"
                      ? "neu-pressed text-sky-700"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                  }`}
                  href="/auth"
                >
                  Login
                </Link>
              )}
            </>
          )}
        </div>
      </nav>
    </div>
  );
}
