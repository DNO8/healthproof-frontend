"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("pointerdown", handleClickOutside);
    }
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, [menuOpen]);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
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

  const linkClass = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
      active
        ? "neu-pressed text-sky-700"
        : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
    }`;

  return (
    <div
      className="sticky top-0 z-50 flex w-full justify-center px-4 pt-4"
      ref={menuRef}
    >
      <nav className="neu-shell relative w-full max-w-5xl rounded-full border border-white/70 px-5 py-2.5 sm:px-8">
        <div className="flex items-center justify-between">
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

          {/* Center label — desktop only */}
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

          {/* Desktop links */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                className={linkClass(pathname === link.href)}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}

            {!loading && (
              <>
                {user ? (
                  <>
                    <Link
                      className={linkClass(pathname.startsWith("/dashboard"))}
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
                    className={linkClass(pathname === "/auth")}
                    href="/auth"
                  >
                    Login
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Hamburger — mobile only */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition hover:bg-white/50 md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
            type="button"
            aria-label="Toggle menu"
          >
            <svg
              fill="none"
              height="20"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              width="20"
            >
              <title>{menuOpen ? "Close menu" : "Open menu"}</title>
              {menuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <>
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 flex flex-col gap-1 rounded-2xl border border-white/70 bg-(--hp-bg) p-3 shadow-lg md:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                className={linkClass(pathname === link.href)}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            ))}

            {!loading && (
              <>
                {user ? (
                  <>
                    <Link
                      className={linkClass(pathname.startsWith("/dashboard"))}
                      href="/dashboard"
                    >
                      Dashboard
                    </Link>
                    <button
                      className="rounded-full px-4 py-1.5 text-left text-sm font-medium text-slate-500 transition-all duration-200 hover:bg-white/50 hover:text-slate-800"
                      onClick={handleLogout}
                      type="button"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    className={linkClass(pathname === "/auth")}
                    href="/auth"
                  >
                    Login
                  </Link>
                )}
              </>
            )}
          </div>
        )}
      </nav>
    </div>
  );
}
