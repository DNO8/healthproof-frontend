import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Nav } from "@/components/layout/Nav";
import { ToastProvider } from "@/components/providers/ToastProvider";
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
      <body className={`${manrope.variable} antialiased`}>
        <ToastProvider />
        <Nav />
        {children}
      </body>
    </html>
  );
}
