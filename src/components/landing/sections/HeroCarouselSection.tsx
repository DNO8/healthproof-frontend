import gsap from "gsap";
import Image from "next/image";
import { useMemo, useRef } from "react";
import {
  ACTOR_LABEL_POSITIONS,
  ACTOR_PAIN_ROLES,
  ACTOR_SCENE_TRANSFORMS,
  ACTORS,
  buildDomePoints,
  HERO_CIRCLE_DECORS,
  HERO_CROSS_DECORS,
  ICON_VISUAL_VARIANTS,
  POST_BLOCKCHAIN_ASSETS,
  PRE_BLOCKCHAIN_ASSETS,
  TRANSMISSION_SLOTS,
} from "@/components/landing/constants";
import { Button, DecorativeCircle, DecorativeCross } from "@/components/ui";
import { useCarouselAnimation } from "@/hooks/useCarouselAnimation";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type HeroCarouselSectionProps = {
  verified: boolean;
  onVerify: () => void;
};

export function HeroCarouselSection({
  verified,
  onVerify,
}: HeroCarouselSectionProps) {
  const reduceMotion = useReducedMotion();

  const sectionRef = useRef<HTMLElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const domeRef = useRef<HTMLDivElement | null>(null);
  const actorRefs = useRef<Array<HTMLDivElement | null>>([]);
  const iconRefs = useRef<Array<HTMLDivElement | null>>([]);
  const dotRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const isTransitioningRef = useRef(false);

  const domePoints = useMemo(buildDomePoints, []);
  const activeAssets = verified
    ? POST_BLOCKCHAIN_ASSETS
    : PRE_BLOCKCHAIN_ASSETS;

  useCarouselAnimation(
    { sectionRef, ringRef, domeRef, actorRefs, iconRefs, dotRefs },
    verified,
    reduceMotion,
  );

  const handleDiscoverClick = () => {
    if (verified || isTransitioningRef.current) {
      return;
    }

    if (reduceMotion) {
      onVerify();
      return;
    }

    isTransitioningRef.current = true;

    const icons = iconRefs.current.filter(Boolean) as HTMLDivElement[];

    gsap.to(icons, {
      autoAlpha: 0,
      scale: 0.62,
      duration: 0.32,
      stagger: 0.04,
      ease: "power2.in",
      onComplete: () => {
        onVerify();
      },
    });
  };

  return (
    <section
      className="relative mx-auto flex w-full max-w-7xl flex-col justify-center px-3 py-8 sm:min-h-screen sm:px-8 sm:py-12 lg:px-12"
      ref={sectionRef}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[460px] bg-[radial-gradient(circle_at_center,rgba(191,219,254,0.32),transparent_68%)]" />
      <div className="pointer-events-none absolute inset-0 z-0">
        {HERO_CIRCLE_DECORS.map((circle) => (
          <DecorativeCircle
            className={`absolute opacity-80 ${circle.className}`}
            color={circle.color}
            key={`hero-circle-${circle.className}-${circle.size}-${circle.color}`}
            size={circle.size}
          />
        ))}
        {HERO_CROSS_DECORS.map((cross) => (
          <DecorativeCross
            className={`absolute opacity-80 ${cross.className}`}
            color={cross.color}
            key={`hero-cross-${cross.className}-${cross.size}-${cross.color}`}
            size={cross.size}
          />
        ))}
        <Image
          alt=""
          aria-hidden="true"
          className="absolute bottom-[18%] right-[5%] h-auto w-[120px] opacity-30 sm:w-[170px]"
          height={500}
          src="/images/icons/cruces-icons.png"
          width={500}
        />
      </div>

      <header className="relative z-10 mx-auto mb-6 max-w-5xl text-center sm:mb-10">
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          <span className="block text-slate-800">
            Interoperability is becoming mandatory.
          </span>
          <span className="block bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            Are your medical documents verifiable?
          </span>
        </h1>
      </header>

      <div className="relative z-10">
        <div className="neu-shell relative mx-auto h-[420px] w-full max-w-6xl overflow-hidden border border-white/70 p-3 sm:h-[540px] sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(167,243,208,0.16),transparent_56%)]" />

          <div className="pointer-events-none absolute left-[8%] right-[8%] top-[53%] z-10 h-px bg-linear-to-r from-transparent via-slate-300/75 to-transparent" />
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-[53%] z-10 h-10 -translate-y-1/2 bg-[radial-gradient(circle_at_center,rgba(148,163,184,0.15),transparent_70%)] blur-lg" />

          <div className="absolute inset-x-0 top-0 bottom-[90px] flex items-center justify-center perspective-[1600px] sm:inset-0 sm:bottom-0">
            <div className="relative h-full w-full transform-3d" ref={ringRef}>
              {ACTORS.map((actor, index) => {
                const sceneTransform = ACTOR_SCENE_TRANSFORMS[actor.name];

                return (
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    key={actor.name}
                    style={{ transform: sceneTransform }}
                  >
                    <div
                      className="flex w-[90px] flex-col items-center sm:w-[180px] lg:w-[220px]"
                      ref={(node) => {
                        actorRefs.current[index] = node;
                      }}
                    >
                      <div className="relative h-[70px] w-[70px] sm:h-[154px] sm:w-[154px] lg:h-[190px] lg:w-[190px]">
                        <Image
                          alt={actor.name}
                          className="object-contain drop-shadow-[0_18px_28px_rgba(120,134,165,0.35)]"
                          fill
                          priority={index === 2}
                          sizes="(max-width: 640px) 110px, (max-width: 1024px) 154px, 190px"
                          src={actor.image}
                          unoptimized
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {ACTORS.map((actor) => {
            const actorRole = verified
              ? actor.role
              : (ACTOR_PAIN_ROLES[actor.name] ?? actor.role);
            const labelPos = ACTOR_LABEL_POSITIONS[actor.name];

            return (
              <div
                className={`pointer-events-none absolute z-20 text-center ${labelPos.className}`}
                key={`label-${actor.name}`}
              >
                <h3 className="text-xs font-semibold text-slate-700 sm:text-sm">
                  {actor.name}
                </h3>
                <p
                  className="text-[11px] font-medium text-slate-500 transition-opacity duration-500 sm:text-xs"
                  key={actorRole}
                  style={{ animation: "fadeIn 0.5s ease" }}
                >
                  {actorRole}
                </p>
              </div>
            );
          })}

          <div
            className="pointer-events-none absolute inset-x-0 top-0 bottom-[90px] z-30 sm:inset-0 sm:bottom-0"
            style={{ perspective: "800px", transformStyle: "preserve-3d" }}
          >
            {TRANSMISSION_SLOTS.map((slot) => {
              const variant =
                ICON_VISUAL_VARIANTS[slot % ICON_VISUAL_VARIANTS.length];

              return (
                <div
                  className="absolute left-1/2 top-1/2"
                  key={slot}
                  ref={(node) => {
                    iconRefs.current[slot] = node;
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Image
                    alt="asset"
                    className="object-contain drop-shadow-[0_10px_16px_rgba(104,120,156,0.3)]"
                    height={variant.size}
                    src={activeAssets[slot % activeAssets.length]}
                    width={variant.size}
                  />
                </div>
              );
            })}
          </div>

          <div
            className="pointer-events-none absolute inset-0 z-1"
            ref={domeRef}
          >
            {domePoints.map((point, index) => (
              <span
                className="absolute rounded-full bg-[#93C5FD] shadow-[0_0_12px_rgba(147,197,253,0.8)]"
                key={`dome-${point.left}-${point.top}-${point.size}`}
                ref={(node) => {
                  dotRefs.current[index] = node;
                }}
                style={{
                  left: `${point.left}%`,
                  top: `${point.top}%`,
                  width: `${point.size}px`,
                  height: `${point.size}px`,
                }}
              />
            ))}
          </div>

          <div className="absolute inset-x-0 bottom-3 z-50 flex flex-col items-center gap-1 sm:bottom-7 sm:gap-2">
            <Button
              className="min-w-[200px] transition-all duration-500 sm:min-w-[250px]"
              onClick={handleDiscoverClick}
              size="lg"
              variant={verified ? "success" : "primary"}
            >
              <span
                key={verified ? "active" : "discover"}
                style={{ animation: "fadeIn 0.5s ease" }}
              >
                {verified ? "Verification Active" : "Verify on Chain"}
              </span>
            </Button>
            <p
              className="max-w-[220px] px-4 text-center text-[10px] text-slate-500 sm:max-w-xl sm:text-sm"
              key={verified ? "verified-caption" : "base-caption"}
              style={{ animation: "fadeIn 0.6s ease" }}
            >
              {verified ? (
                "Verifiable and secure workflow."
              ) : (
                <>
                  HealthProof is a verification layer for healthcare
                  institutions that need to exchange clinical data while
                  guaranteeing{" "}
                  <strong className="text-slate-700">
                    integrity, traceability, and patient-controlled access
                  </strong>
                  . Built for the new era of{" "}
                  <strong className="text-slate-700">
                    health data interoperability and ICD-11 digital standards
                  </strong>
                  .
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
