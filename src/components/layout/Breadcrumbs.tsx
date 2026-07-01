"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const labelMap: Record<string, string> = {
  dashboard: "sidebar.overview",
  overview: "sidebar.overview",
  documents: "sidebar.documents",
  permissions: "sidebar.permissions",
  guardians: "sidebar.guardians",
  share: "sidebar.share",
  "my-orders": "sidebar.myOrders",
  orders: "sidebar.orders",
  episodes: "sidebar.episodes",
  "lab-orders": "sidebar.labOrders",
  upload: "sidebar.upload",
  scan: "sidebar.scan",
  networks: "sidebar.networks",
  kernel: "sidebar.kernel",
  protocol: "sidebar.protocol",
  entities: "sidebar.entities",
  profile: "nav.profile",
  shared: "sidebar.shared",
};

export function Breadcrumbs() {
  const t = useTranslations("dashboard");
  const pathname = usePathname();

  if (pathname === "/dashboard" || pathname === "/dashboard/overview")
    return null;

  const segments = pathname
    .replace(/^\/dashboard\/?/, "")
    .split("/")
    .filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="mb-4 flex items-center gap-1 text-xs text-slate-500">
      <Link
        className="hover:text-slate-700 transition"
        href="/dashboard/overview"
      >
        {t("sidebar.overview")}
      </Link>
      {segments.map((seg: string, i: number) => {
        const isLast = i === segments.length - 1;
        const labelKey = labelMap[seg] ?? seg;
        const label =
          labelKey.startsWith("sidebar.") || labelKey.startsWith("nav.")
            ? t(labelKey)
            : seg;
        return (
          <span key={seg} className="flex items-center gap-1">
            <span className="text-slate-300">/</span>
            {isLast ? (
              <span className="font-medium text-slate-700">{label}</span>
            ) : (
              <span className="text-slate-500">{label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
