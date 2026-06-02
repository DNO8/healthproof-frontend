"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (err: string) => void;
  className?: string;
}

function getBrowserName(): string {
  const ua = navigator.userAgent;
  if (ua.includes("Chrome") && !ua.includes("Edg")) return "Chrome";
  if (ua.includes("Safari") && !ua.includes("Chrome")) return "Safari";
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  return "Browser";
}

function getPermissionInstructions(t: (key: string, values?: Record<string, string | number>) => string, errorMsg: string): string {
  const browser = getBrowserName();
  if (errorMsg.includes("Permission denied") || errorMsg.includes("NotAllowedError")) {
    return t("permissionDenied", { browser });
  }
  if (errorMsg.includes("NotFoundError") || errorMsg.includes("no cameras found")) {
    return t("noCamera");
  }
  if (errorMsg.includes("NotReadableError") || errorMsg.includes("in use")) {
    return t("cameraInUse");
  }
  return t("genericCameraError", { browser });
}

export function QRScanner({ onScan, onError, className = "" }: QRScannerProps) {
  const t = useTranslations("scanner");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isRunningRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isInsecure, setIsInsecure] = useState(false);

  const startScanner = useCallback(() => {
    if (!containerRef.current) return;

    if (typeof window !== "undefined" && !window.isSecureContext) {
      setIsInsecure(true);
      setStatus("error");
      setError(t("insecureContext"));
      onError?.("insecure context");
      return;
    }

    setIsInsecure(false);
    setStatus("starting");
    setError(null);

    const scanner = new Html5Qrcode("qr-scanner-root");
    scannerRef.current = scanner;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const size = Math.min(vw - 48, vh - 200, 600);

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: size, height: size } },
        (decodedText) => {
          setStatus("scanning");
          onScan(decodedText);
        },
        () => {}
      )
      .then(() => {
        setStatus("scanning");
        isRunningRef.current = true;
      })
      .catch((err) => {
        const msg = String(err);
        setStatus("error");
        setError(msg);
        onError?.(msg);
      });
  }, [onScan, onError]);

  useEffect(() => {
    startScanner();
    return () => {
      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current.stop().catch(() => {});
        isRunningRef.current = false;
      }
      scannerRef.current = null;
    };
  }, [startScanner]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div
        id="qr-scanner-root"
        className="w-full rounded-xl overflow-hidden"
        style={{ minHeight: 320 }}
      />
      {status === "starting" && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/10">
          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white border-t-sky-500" />
        </div>
      )}
      {error && (
        <div className="mt-3 space-y-3 rounded-xl bg-red-50 p-3">
          <p className="text-sm text-red-700">
            <span className="font-semibold">{t("scannerErrorLabel")}</span> {error}
          </p>
          {!isInsecure && (
            <p className="text-xs text-red-600">
              {getPermissionInstructions(t, error)}
            </p>
          )}
          <button
            type="button"
            onClick={() => {
              if (scannerRef.current && isRunningRef.current) {
                scannerRef.current.stop().catch(() => {});
                isRunningRef.current = false;
              }
              scannerRef.current = null;
              startScanner();
            }}
            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-200"
          >
            {t("retryCamera")}
          </button>
        </div>
      )}
    </div>
  );
}
