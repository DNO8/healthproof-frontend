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
        @media (max-width: 640px) {
          [data-sileo-toaster] {
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
