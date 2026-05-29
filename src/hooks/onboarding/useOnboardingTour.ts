"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { UserRole } from "@/types/domain.types";
import type { Driver } from "driver.js";
import { getTourSteps } from "@/lib/onboarding/tour-config";
import {
  TOUR_PENDING_EVENT,
  TOUR_PENDING_KEY,
} from "@/lib/onboarding/tour-events";
import { markOnboardingComplete } from "@/actions/auth/mark-onboarding-complete";

export function useOnboardingTour(
  role: UserRole | null,
  userId: string | null
) {
  const t = useTranslations("onboardingTour");
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;

    const tryStart = () => {
      if (hasRunRef.current) return;
      if (!role || !userId) return;
      try {
        const pending = localStorage.getItem(TOUR_PENDING_KEY);
        if (pending !== "1") return;
      } catch {
        return;
      }

      const steps = getTourSteps(role, t).filter((s) => {
        if (!s.element) return true;
        const sel =
          typeof s.element === "string"
            ? s.element
            : "";
        if (!sel) return true;
        return document.querySelector(sel) !== null;
      });

      if (steps.length === 0) return;

      hasRunRef.current = true;

      let drv: Driver;
      drv = driver({
        showProgress: true,
        nextBtnText: t("buttons.next"),
        prevBtnText: t("buttons.previous"),
        doneBtnText: t("buttons.done"),
        steps,
        popoverClass: "hp-driver-popover",
        onPopoverRender: (popover, { driver: drvRef }) => {
          if (popover.footerButtons.querySelector("[data-tour-skip]")) return;
          const btn = document.createElement("button");
          btn.dataset.tourSkip = "true";
          btn.textContent = t("buttons.skip");
          btn.className = "ml-2 text-xs font-medium";
          btn.type = "button";
          btn.onclick = () => drvRef.destroy();
          popover.footerButtons.appendChild(btn);
        },
        onDestroyed: () => {
          try {
            localStorage.removeItem(TOUR_PENDING_KEY);
          } catch {
            /* ignore */
          }
          if (userId) {
            markOnboardingComplete({ userId }).catch(() => {});
          }
        },
      });

      drv.drive();
    };

    tryStart();
    const listener = () => tryStart();
    window.addEventListener(TOUR_PENDING_EVENT, listener);

    return () => {
      window.removeEventListener(TOUR_PENDING_EVENT, listener);
    };
  }, [role, userId, t]);

  return null;
}
