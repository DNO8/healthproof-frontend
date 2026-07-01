import gsap from "gsap";
import { type RefObject, useLayoutEffect } from "react";

const PATH_IDS = ["path-mc-lab", "path-lab-pat", "path-pat-mc"] as const;
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

function buildClosedLoop(pathEl: SVGPathElement, count: number) {
  const forward = samplePath(pathEl, count);
  const backward = [...forward].reverse();
  return [...forward, ...backward];
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
  imgRefs: RefObject<Array<HTMLImageElement | null>>,
  pathStates: Record<string, boolean>,
  preAssets: string[],
  postAssets: string[],
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

    const pathLoops = pathEls.map((el) =>
      buildClosedLoop(el, SAMPLES_PER_SEGMENT),
    );
    const iconsPerPath = Math.ceil(icons.length / PATH_IDS.length);

    const ctx = gsap.context(() => {
      const loopDuration = 10;

      icons.forEach((icon, index) => {
        const pathIndex = Math.min(
          Math.floor(index / iconsPerPath),
          PATH_IDS.length - 1,
        );
        const pathLoop = pathLoops[pathIndex];
        const progress = {
          value: (index % iconsPerPath) / (iconsPerPath || 1),
        };

        gsap.set(icon, {
          autoAlpha: 0.85,
          xPercent: -50,
          yPercent: -50,
        });

        const update = () => {
          const t = progress.value % 1;
          const { x, y } = lerp(pathLoop, t);
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
  }, []);

  // Update image assets when path states change without restarting motion
  // biome-ignore lint/correctness/useExhaustiveDependencies: imgRefs is a stable ref
  useLayoutEffect(() => {
    const imgs = imgRefs.current.filter(Boolean) as HTMLImageElement[];
    if (imgs.length === 0) return;

    const iconsPerPath = Math.ceil(imgs.length / PATH_IDS.length);

    imgs.forEach((img, i) => {
      const pathIndex = Math.min(
        Math.floor(i / iconsPerPath),
        PATH_IDS.length - 1,
      );
      const pathId = PATH_IDS[pathIndex];
      const isVerified = pathStates[pathId] ?? false;
      const assets = isVerified ? postAssets : preAssets;
      const src = assets[i % assets.length];
      if (img.getAttribute("src") !== src) {
        img.setAttribute("src", src);
        img.setAttribute("width", isVerified ? "38" : "30");
        img.setAttribute("height", isVerified ? "38" : "30");
      }
    });
  }, [pathStates, preAssets, postAssets]);
}
