"use client";

import Link from "next/link";

type ProfileBannerProps = {
  isComplete: boolean;
};

export function ProfileBanner({ isComplete }: ProfileBannerProps) {
  if (isComplete) return null;

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Complete your profile
          </p>
          <p className="mt-0.5 text-xs text-amber-600">
            Add your full name and wallet address to unlock all HealthProof
            features.
          </p>
        </div>
      </div>
      <Link
        className="shrink-0 rounded-xl border border-amber-300/60 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-800 transition hover:bg-amber-200"
        href="/dashboard/profile"
      >
        Complete Profile
      </Link>
    </div>
  );
}
