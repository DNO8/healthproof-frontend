import { useLayoutEffect, useState } from "react";

export function useReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(media.matches);

    sync();
    media.addEventListener("change", sync);

    return () => {
      media.removeEventListener("change", sync);
    };
  }, []);

  return reduceMotion;
}
