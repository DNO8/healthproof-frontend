"use client";

import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { useCallback, useEffect, useRef } from "react";

type TourStep = {
  element?: string | HTMLElement;
  popover: {
    title: string;
    description: string;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
  };
};

export function useDriverTour(
  steps: TourStep[],
  options?: {
    startWhen?: boolean;
    onCompleted?: () => void;
  },
) {
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const start = useCallback(() => {
    driverRef.current?.destroy();
    driverRef.current = driver({
      showProgress: true,
      progressText: "{{current}} / {{total}}",
      nextBtnText: "Siguiente",
      prevBtnText: "Anterior",
      doneBtnText: "Entendido",
      steps,
      onDestroyed: () => {
        options?.onCompleted?.();
      },
    });
    driverRef.current.drive();
  }, [steps, options?.onCompleted]);

  useEffect(() => {
    if (!options?.startWhen || steps.length === 0) return;
    start();
    return () => {
      driverRef.current?.destroy();
    };
  }, [start, options?.startWhen, steps.length]);

  return { start };
}
