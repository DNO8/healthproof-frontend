import { useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type ScrollRevealOptions = {
  y?: number;
  x?: number;
  opacity?: number;
  duration?: number;
  delay?: number;
  ease?: string;
  start?: string;
  stagger?: number;
};

const DEFAULTS: Required<Omit<ScrollRevealOptions, "x" | "stagger">> = {
  y: 60,
  opacity: 0,
  duration: 0.8,
  delay: 0,
  ease: "power3.out",
  start: "top 80%",
};

/**
 * Animates an element into view when it enters the viewport.
 * Attach the returned ref to the element you want to reveal.
 *
 * For staggered children, pass `stagger` and attach the ref
 * to the parent — all direct children will animate in sequence.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  y = DEFAULTS.y,
  x,
  opacity = DEFAULTS.opacity,
  duration = DEFAULTS.duration,
  delay = DEFAULTS.delay,
  ease = DEFAULTS.ease,
  start = DEFAULTS.start,
  stagger,
}: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = stagger != null ? el.children : el;

    const from: gsap.TweenVars = { opacity, y };
    if (x != null) from.x = x;

    const to: gsap.TweenVars = {
      opacity: 1,
      y: 0,
      x: 0,
      duration,
      delay,
      ease,
      scrollTrigger: {
        trigger: el,
        start,
        toggleActions: "play none none none",
      },
    };

    if (stagger != null) {
      to.stagger = stagger;
    }

    gsap.fromTo(targets, from, to);

    return () => {
      ScrollTrigger.getAll().forEach((st) => {
        if (st.trigger === el) st.kill();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [y, x, opacity, duration, delay, ease, start, stagger]);

  return ref;
}
