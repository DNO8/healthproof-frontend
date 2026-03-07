"use client";

export function GoBackButton({ label }: { label: string }) {
  return (
    <button
      className="neu-focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-(--hp-border) bg-(--hp-layer) px-6 text-sm font-semibold text-slate-700 shadow-(--hp-shadow-raised) transition hover:bg-white active:translate-y-px"
      onClick={() => window.history.back()}
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
        <path d="m15 18-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}
