import gsap from "gsap";
import { type RefObject, useLayoutEffect } from "react";

const PATH_IDS = ["path-mc-lab", "path-lab-pat", "path-pat-mc"];
const SVG_W = 1000;
const SVG_H = 600;
const SAMPLES_PER_SEGMENT = 80;

function samplePath(pathEl: SVGPathElement, count: number) {
  const len = pathEl.getTotalLength();
  const points: Array<{ xPct: number; yPct: number }> = [];
  for (let i = 0; i < count; i++) {
    const pt = pathEl.getPointAtLength((i / count) * len);
    points.push({ xPct: (pt.x / SVG_W) * 100, yPct: (pt.y / SVG_H) * 100 });
  }
  return points;
}

function buildFullLoop(pathEls: SVGPathElement[]) {
  const loop: Array<{ xPct: number; yPct: number }> = [];
  for (const el of pathEls) {
    loop.push(...samplePath(el, SAMPLES_PER_SEGMENT));
  }
  return loop;
}

function lerp(points: Array<{ xPct: number; yPct: number }>, t: number) {
  const total = points.length;
  const raw = t * total;
  const idx = Math.floor(raw) % total;
  const next = (idx + 1) % total;
  const frac = raw - Math.floor(raw);
  return {
    x: points[idx].xPct + (points[next].xPct - points[idx].xPct) * frac,
    y: points[idx].yPct + (points[next].yPct - points[idx].yPct) * frac,
  };
}

export function useHeroPathAnimation(
  sectionRef: RefObject<HTMLElement | null>,
  iconRefs: RefObject<Array<HTMLDivElement | null>>,
  verified: boolean,
) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: refs are stable
  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const icons = iconRefs.current.filter(Boolean) as HTMLDivElement[];
    if (icons.length === 0) return;

    const pathEls = PATH_IDS.map((id) =>
      section.querySelector<SVGPathElement>(`#${id}`),
    ).filter(Boolean) as SVGPathElement[];

    if (pathEls.length === 0) return;

    const loop = buildFullLoop(pathEls);

    const ctx = gsap.context(() => {
      const loopDuration = 10;

      icons.forEach((icon, index) => {
        const progress = { value: index / icons.length };

        gsap.set(icon, {
          autoAlpha: 0.85,
          xPercent: -50,
          yPercent: -50,
        });

        const update = () => {
          const t = progress.value % 1;
          const { x, y } = lerp(loop, t);
          gsap.set(icon, { left: `${x}%`, top: `${y}%` });
        };

        update();

        gsap.to(progress, {
          value: progress.value + 1,
          duration: loopDuration,
          ease: "none",
          repeat: -1,
          onUpdate: update,
        });
      });
    }, section);

    return () => ctx.revert();
  }, [verified]);
}
