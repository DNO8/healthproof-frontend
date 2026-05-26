"use client";

import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  children: React.ReactNode;
}

const sizeClasses: Record<string, string> = {
  sm: "max-w-sm mx-4",
  md: "max-w-md mx-4",
  lg: "max-w-lg mx-4",
  xl: "max-w-xl mx-4",
  full: "max-w-full mx-4",
};

export function Modal({ open, onClose, title, size = "md", children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className={`relative w-full ${sizeClasses[size]} rounded-2xl border border-white/70 bg-[#F8F5F0] p-6 shadow-2xl transition-all`}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">{title}</h2>
            <button
              className="rounded-full p-1.5 text-slate-400 transition hover:bg-white/50 hover:text-slate-600"
              onClick={onClose}
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
