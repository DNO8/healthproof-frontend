"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (err: string) => void;
  className?: string;
}

export function QRScanner({ onScan, onError, className = "" }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    setStatus("starting");
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
      .then(() => setStatus("scanning"))
      .catch((err) => {
        setStatus("error");
        setError(String(err));
        onError?.(String(err));
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [onScan, onError]);

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
        <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
