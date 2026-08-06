import type { DriveStep } from "driver.js";
import type { UserRole } from "@/types/domain.types";

export type TourStepKey =
  | "header"
  | "metrics"
  | "quickNav"
  | "quickActions"
  | "profileBanner"
  | "closing";

const SELECTORS: Record<TourStepKey, string | undefined> = {
  header: '[data-tour="role-header"]',
  metrics: '[data-tour="metrics"]',
  quickNav: '[data-tour="quick-nav"]',
  quickActions: '[data-tour="quick-actions"]',
  profileBanner: '[data-tour="profile-banner"]',
  closing: undefined,
};

function buildStep(
  key: TourStepKey,
  t: (path: string) => string,
  role: UserRole,
): DriveStep {
  const selector = SELECTORS[key];
  return {
    element: selector,
    popover: {
      title: t(`${role}.${key}.title`),
      description: t(`${role}.${key}.description`),
      side: key === "closing" ? "top" : "bottom",
      align: "start",
    },
  };
}

export function getTourSteps(
  role: UserRole,
  t: (path: string) => string,
): DriveStep[] {
  const keys: TourStepKey[] =
    role === "patient"
      ? [
          "header",
          "metrics",
          "quickNav",
          "quickActions",
          "profileBanner",
          "closing",
        ]
      : role === "doctor"
        ? [
            "header",
            "metrics",
            "quickNav",
            "quickActions",
            "profileBanner",
            "closing",
          ]
        : role === "lab"
          ? [
              "header",
              "metrics",
              "quickNav",
              "quickActions",
              "profileBanner",
              "closing",
            ]
          : [
              "header",
              "metrics",
              "quickNav",
              "quickActions",
              "profileBanner",
              "closing",
            ];

  return keys.map((k) => buildStep(k, t, role));
}
