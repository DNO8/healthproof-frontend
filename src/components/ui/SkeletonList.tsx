"use client";

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are static
          key={i}
          className="neu-surface animate-pulse rounded-xl p-5 sm:p-6 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 w-32 rounded-md bg-slate-200" />
              <div className="h-3 w-20 rounded-md bg-slate-200" />
            </div>
            <div className="h-8 w-16 rounded-lg bg-slate-200" />
          </div>
          <div className="h-3 w-48 rounded-md bg-slate-200" />
        </div>
      ))}
    </div>
  );
}
