import gsap from "gsap";
import { type RefObject, useLayoutEffect } from "react";
import {
  ICON_VISUAL_VARIANTS,
  INITIAL_FLOW_SEGMENT_DURATION,
  VERIFIED_FLOW_SPEED_MULTIPLIER,
} from "@/components/landing/constants";

type CarouselAnimationRefs = {
  sectionRef: RefObject<HTMLElement | null>;
  ringRef: RefObject<HTMLDivElement | null>;
  domeRef: RefObject<HTMLDivElement | null>;
  actorRefs: RefObject<Array<HTMLDivElement | null>>;
  iconRefs: RefObject<Array<HTMLDivElement | null>>;
  dotRefs: RefObject<Array<HTMLSpanElement | null>>;
};

export function useCarouselAnimation(
  refs: CarouselAnimationRefs,
  verified: boolean,
  reduceMotion: boolean,
) {
  const { sectionRef, ringRef, domeRef, actorRefs, iconRefs, dotRefs } = refs;

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (ringRef.current) {
        gsap.set(ringRef.current, {
          rotateX: 18,
          rotateY: -8,
          transformPerspective: 1600,
          transformStyle: "preserve-3d",
        });
      }

      if (reduceMotion) {
        const staticIcons = iconRefs.current.filter(
          Boolean,
        ) as HTMLDivElement[];

        staticIcons.forEach((node, index) => {
          const totalIcons = staticIcons.length;
          const angle = (index / totalIcons) * Math.PI * 2;

          gsap.set(node, {
            x: Math.cos(angle) * 160,
            y: Math.sin(angle) * 70,
            autoAlpha: 0.95,
            scale: 0.9,
            rotate: 0,
          });
        });

        if (domeRef.current) {
          gsap.set(domeRef.current, { autoAlpha: verified ? 1 : 0 });
        }

        return;
      }

      const actors = actorRefs.current.filter(Boolean) as HTMLDivElement[];
      actors.forEach((node, index) => {
        gsap.to(node, {
          y: -9,
          duration: 2 + index * 0.25,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: index * 0.22,
        });
      });

      const icons = iconRefs.current.filter(Boolean) as HTMLDivElement[];
      const mm = gsap.matchMedia();
      const speedMultiplier = verified ? VERIFIED_FLOW_SPEED_MULTIPLIER : 1;
      const orbitDuration =
        (INITIAL_FLOW_SEGMENT_DURATION * 3) / speedMultiplier;

      const animateOrbit = (radiusX: number, radiusY: number) => {
        const totalIcons = icons.length;

        const updatePosition = (
          node: HTMLDivElement,
          angle: number,
          rX: number,
          rY: number,
          variant: (typeof ICON_VISUAL_VARIANTS)[number],
        ) => {
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          const x = cosA * (rX + variant.driftX);
          const y = sinA * (rY + variant.driftY) * 0.55;
          const z = sinA * 120;
          const depthScale =
            variant.baseScale * (0.7 + 0.3 * ((z + 120) / 240));
          const depthAlpha = variant.alpha * (0.5 + 0.5 * ((z + 120) / 240));

          gsap.set(node, {
            x,
            y,
            z,
            scale: depthScale,
            autoAlpha: depthAlpha,
            rotateY: cosA * 15,
            rotateX: sinA * -8,
          });
        };

        icons.forEach((node, index) => {
          const variant =
            ICON_VISUAL_VARIANTS[index % ICON_VISUAL_VARIANTS.length];
          const angleOffset =
            (index / totalIcons) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
          const progress = { value: 0 };

          const speedJitter = 0.6 + Math.random() * 0.8;
          const iconDuration = orbitDuration * speedJitter;

          const rX = radiusX + (Math.random() - 0.5) * 40;
          const rY = radiusY + (Math.random() - 0.5) * 30;

          const startProgress = Math.random();
          progress.value = startProgress;

          gsap.set(node, { transformPerspective: 800 });
          updatePosition(
            node,
            angleOffset + startProgress * Math.PI * 2,
            rX,
            rY,
            variant,
          );

          const orbitUpdate = () => {
            const angle = angleOffset + progress.value * Math.PI * 2;
            updatePosition(node, angle, rX, rY, variant);
          };

          gsap.to(progress, {
            value: 1,
            duration: iconDuration * (1 - startProgress),
            ease: "none",
            onUpdate: orbitUpdate,
            onComplete: () => {
              progress.value = 0;
              gsap.to(progress, {
                value: 1,
                duration: iconDuration,
                ease: "none",
                repeat: -1,
                onUpdate: orbitUpdate,
              });
            },
          });
        });
      };

      mm.add("(max-width: 767px)", () => {
        animateOrbit(70, 50);
      });

      mm.add("(min-width: 768px)", () => {
        animateOrbit(200, 130);
      });

      if (domeRef.current) {
        gsap.set(domeRef.current, { autoAlpha: 0 });
      }

      dotRefs.current.forEach((dotNode) => {
        if (!dotNode) {
          return;
        }
        gsap.set(dotNode, { autoAlpha: 0, scale: 0.4 });
      });

      return () => {
        mm.revert();
      };
    }, sectionRef);

    return () => ctx.revert();
  }, [
    reduceMotion,
    verified,
    sectionRef,
    ringRef,
    domeRef,
    actorRefs,
    iconRefs,
    dotRefs,
  ]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const icons = iconRefs.current.filter(Boolean) as HTMLDivElement[];

      if (reduceMotion) {
        gsap.set(icons, { autoAlpha: 0.95, scale: 1 });

        if (domeRef.current) {
          gsap.set(domeRef.current, { autoAlpha: verified ? 1 : 0 });
        }

        dotRefs.current.forEach((dotNode) => {
          if (!dotNode) {
            return;
          }

          gsap.set(dotNode, {
            autoAlpha: verified ? 0.85 : 0,
            scale: 1,
          });
        });

        return;
      }

      gsap.fromTo(
        icons,
        { autoAlpha: 0, scale: 0.68 },
        {
          autoAlpha: 0.95,
          scale: 1,
          duration: 0.45,
          stagger: 0.06,
          ease: "power2.out",
        },
      );

      if (!domeRef.current) {
        return;
      }

      if (!verified) {
        gsap.to(domeRef.current, {
          autoAlpha: 0,
          duration: 0.35,
          ease: "power1.out",
        });
        return;
      }

      gsap.to(domeRef.current, {
        autoAlpha: 1,
        duration: 0.65,
        ease: "power2.out",
      });

      dotRefs.current.forEach((dotNode, index) => {
        if (!dotNode) {
          return;
        }

        gsap.fromTo(
          dotNode,
          { autoAlpha: 0, scale: 0.4 },
          {
            autoAlpha: 0.95,
            scale: 1,
            duration: 0.34,
            delay: index * 0.02,
            ease: "power2.out",
          },
        );

        gsap.to(dotNode, {
          autoAlpha: 0.35 + (index % 5) * 0.11,
          duration: 1.1 + (index % 4) * 0.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: index * 0.03,
        });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [reduceMotion, verified, sectionRef, domeRef, iconRefs, dotRefs]);
}
