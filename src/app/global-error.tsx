"use client";

import { Manrope } from "next/font/google";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const i18n = {
  en: {
    title: "Something went wrong",
    description:
      "An unexpected error occurred while processing your request. Our infrastructure is designed for resilience \u2014 this is likely a temporary issue.",
    tryAgain: "Try Again",
    goHome: "Back to Home",
    hint: "If the problem persists, please contact our support team.",
  },
  es: {
    title: "Algo sali\u00f3 mal",
    description:
      "Ocurri\u00f3 un error inesperado al procesar tu solicitud. Nuestra infraestructura est\u00e1 dise\u00f1ada para ser resiliente \u2014 probablemente es un problema temporal.",
    tryAgain: "Intentar de Nuevo",
    goHome: "Volver al Inicio",
    hint: "Si el problema persiste, por favor contacta a nuestro equipo de soporte.",
  },
} as const;

type Locale = keyof typeof i18n;

function detectLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const segment = window.location.pathname.split("/")[1];
  if (segment === "es") return "es";
  return "en";
}

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = detectLocale();
  const t = i18n[locale];
  const homeHref = locale === "es" ? "/es" : "/";

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${manrope.variable} antialiased`}
        style={{
          margin: 0,
          minHeight: "100vh",
          backgroundColor: "#F5F7FA",
          fontFamily:
            "var(--font-manrope), ui-sans-serif, system-ui, sans-serif",
          color: "#1F2937",
        }}
      >
        <div
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 24px",
            position: "relative",
          }}
        >
          {/* Decorative background shapes */}
          <svg
            aria-hidden="true"
            height={320}
            style={{
              position: "absolute",
              top: -64,
              right: -64,
              opacity: 0.07,
              pointerEvents: "none",
            }}
            viewBox="0 0 100 100"
            width={320}
          >
            <circle cx="50" cy="50" fill="#93C5FD" r="50" />
          </svg>
          <svg
            aria-hidden="true"
            height={260}
            style={{
              position: "absolute",
              bottom: -48,
              left: -48,
              opacity: 0.05,
              pointerEvents: "none",
            }}
            viewBox="0 0 100 100"
            width={260}
          >
            <circle cx="50" cy="50" fill="#BFDBFE" r="50" />
          </svg>
          <svg
            aria-hidden="true"
            height={28}
            style={{
              position: "absolute",
              top: "33%",
              left: 32,
              opacity: 0.08,
              pointerEvents: "none",
            }}
            viewBox="0 0 24 24"
            width={28}
          >
            <path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7z" fill="#93C5FD" />
          </svg>

          {/* Content */}
          <div
            style={{
              position: "relative",
              zIndex: 10,
              display: "flex",
              maxWidth: 480,
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            {/* Logo */}
            <a
              href={homeHref}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 40,
                textDecoration: "none",
              }}
            >
              <img
                alt="HealthProof"
                height={36}
                src="/images/logo/healthproof-logo.png"
                width={36}
              />
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                }}
              >
                <span
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #38bdf8, #3b82f6, #6366f1)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Health
                </span>
                <span style={{ color: "#1e293b" }}>Proof</span>
              </span>
            </a>

            {/* Error code badge */}
            <div
              style={{
                borderRadius: 40,
                background: "#F5F7FA",
                boxShadow: "20px 20px 60px #d1d9e6, -20px -20px 60px #ffffff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 112,
                height: 112,
                marginBottom: 32,
              }}
            >
              <span
                style={{
                  backgroundImage:
                    "linear-gradient(to bottom right, #f87171, #ef4444, #dc2626)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontSize: 48,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                }}
              >
                500
              </span>
            </div>

            {/* Card */}
            <div
              style={{
                borderRadius: 28,
                background: "#F5F7FA",
                border: "1px solid #DBE1EA",
                boxShadow: "10px 10px 20px #d1d9e6, -10px -10px 20px #ffffff",
                width: "100%",
                padding: "40px 48px",
              }}
            >
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#1e293b",
                  marginBottom: 12,
                  marginTop: 0,
                }}
              >
                {t.title}
              </h1>
              <p
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: "#64748b",
                  marginBottom: 32,
                  marginTop: 0,
                }}
              >
                {t.description}
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <button
                  onClick={() => reset()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    height: 44,
                    padding: "0 24px",
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.6)",
                    background: "#93C5FD",
                    color: "#1e293b",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "background 0.2s",
                    fontFamily: "inherit",
                  }}
                  type="button"
                >
                  <svg
                    aria-hidden="true"
                    fill="none"
                    height="16"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="16"
                  >
                    <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                    <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                    <path d="M16 21h5v-5" />
                  </svg>
                  {t.tryAgain}
                </button>
                <a
                  href={homeHref}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    height: 44,
                    padding: "0 24px",
                    borderRadius: 16,
                    border: "1px solid #DBE1EA",
                    background: "#E5E7EB",
                    color: "#334155",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <svg
                    aria-hidden="true"
                    fill="none"
                    height="16"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="16"
                  >
                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  {t.goHome}
                </a>
              </div>
            </div>

            {/* Hint */}
            <p
              style={{
                marginTop: 24,
                fontSize: 12,
                color: "#94a3b8",
              }}
            >
              {t.hint}
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
