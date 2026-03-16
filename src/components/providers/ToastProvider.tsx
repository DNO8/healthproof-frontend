"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sileo";

export function ToastProvider() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setIsMobile(mq.matches);

    function handleChange(e: MediaQueryListEvent) {
      setIsMobile(e.matches);
    }

    mq.addEventListener("change", handleChange);
    return () => mq.removeEventListener("change", handleChange);
  }, []);

  return (
    <>
      <Toaster
        position={isMobile ? "bottom-center" : "top-right"}
        theme="light"
      />
      <style>{`
        [data-sileo-viewport] {
          position: fixed !important;
          z-index: 200 !important;
          pointer-events: none !important;
        }
        [data-sileo-viewport] > * {
          pointer-events: auto !important;
        }
        @media (min-width: 641px) {
          [data-sileo-viewport] {
            top: 72px !important;
          }
        }
        @media (min-width: 1440px) {
          [data-sileo-viewport] {
            top: 0 !important;
          }
        }
        @media (max-width: 640px) {
          [data-sileo-viewport] {
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%);
            max-width: calc(100vw - 32px);
            width: 100%;
            padding-bottom: env(safe-area-inset-bottom, 8px);
          }
        }
      `}</style>
    </>
  );
}
