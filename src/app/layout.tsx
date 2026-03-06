import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Nav } from "@/components/layout/Nav";
import { ToastProvider } from "@/components/providers/ToastProvider";
import { Providers } from "./providers";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HealthProof — Sovereign Medical Verification",
  description: "Cliente web oficial para verificación médica soberana",
  icons: {
    icon: "/images/logo/healthproof-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  function isPrivyBug(m){return typeof m==='string'&&m.includes('walletProvider')&&m.includes('is not a function')}
  window.addEventListener('error',function(e){if(isPrivyBug(e.message)){e.preventDefault();e.stopImmediatePropagation()}},true);
  window.addEventListener('unhandledrejection',function(e){var m=e.reason&&e.reason.message||String(e.reason||'');if(isPrivyBug(m)){e.preventDefault();e.stopImmediatePropagation()}},true);
})();
`,
          }}
        />
      </head>
      <body className={`${manrope.variable} antialiased`}>
        <Providers>
          <ToastProvider />
          <Nav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
