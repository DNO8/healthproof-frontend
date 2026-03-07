import gsap from "gsap";
import Image from "next/image";
import { useEffect, useRef } from "react";
import {
  ACTORS,
  HERO_CIRCLE_DECORS,
  HERO_CROSS_DECORS,
  POST_BLOCKCHAIN_ASSETS,
  PRE_BLOCKCHAIN_ASSETS,
} from "@/components/landing/constants";
import { Button, DecorativeCircle, DecorativeCross } from "@/components/ui";
import { useHeroPathAnimation } from "@/hooks/useHeroPathAnimation";

type HeroCarouselSectionProps = {
  verified: boolean;
  onVerify: () => void;
};

const ICON_COUNT = 12;

export function HeroCarouselSection({
  verified,
  onVerify,
}: HeroCarouselSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const iconRefs = useRef<Array<HTMLDivElement | null>>([]);
  const headline1Ref = useRef<HTMLSpanElement | null>(null);
  const headline2Ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const h1 = headline1Ref.current;
    const h2 = headline2Ref.current;
    if (!h1 || !h2) return;

    gsap.set(h2, { autoAlpha: 0, y: 20 });
    gsap.set(h1, { autoAlpha: 1, y: 0 });

    const tl = gsap.timeline({ repeat: -1 });

    tl.to(h1, {
      autoAlpha: 0,
      y: -20,
      duration: 0.6,
      ease: "power2.inOut",
      delay: 3,
    })
      .to(
        h2,
        { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.inOut" },
        "<0.1",
      )
      .to(h2, {
        autoAlpha: 0,
        y: -20,
        duration: 0.6,
        ease: "power2.inOut",
        delay: 3,
      })
      .to(
        h1,
        { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.inOut" },
        "<0.1",
      );

    return () => {
      tl.kill();
    };
  }, []);

  const activeAssets = verified
    ? POST_BLOCKCHAIN_ASSETS
    : PRE_BLOCKCHAIN_ASSETS;

  useHeroPathAnimation(sectionRef, iconRefs, verified);

  return (
    <section
      className="relative mx-auto flex w-full max-w-7xl flex-col justify-center py-8 sm:min-h-screen sm:px-8 sm:py-12 lg:px-12"
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
      </div>

      <header className="relative z-10 mx-auto mb-6 max-w-5xl text-center sm:mb-10">
        <h1 className="relative text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
          <span
            className="block bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent"
            ref={headline1Ref}
          >
            Interoperability is becoming mandatory.
          </span>
          <span
            className="absolute inset-x-0 top-0 bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent"
            ref={headline2Ref}
          >
            Are your medical documents verifiable?
          </span>
        </h1>
      </header>

      <div className="relative z-10">
        <div className="neu-shell relative mx-auto h-[520px] w-full max-w-6xl overflow-hidden border border-white/70 pb-20 sm:h-[640px] sm:p-6 sm:pb-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(167,243,208,0.16),transparent_56%)]" />

          {/* SVG paths connecting actors */}
          <svg
            aria-labelledby="hero-paths-title"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full"
            preserveAspectRatio="none"
            role="img"
            viewBox="0 0 1000 600"
          >
            <title id="hero-paths-title">Connection paths between actors</title>
            {/* Medical Center → Laboratory (top arc) */}
            <path
              className="hero-path"
              d="M 200 220 C 350 80, 650 80, 800 220"
              fill="none"
              id="path-mc-lab"
              opacity="0.35"
              stroke="url(#pathGrad)"
              strokeDasharray="8 6"
              strokeWidth="2"
            />
            {/* Laboratory → Patient (right arc) */}
            <path
              className="hero-path"
              d="M 800 220 C 780 360, 620 460, 500 440"
              fill="none"
              id="path-lab-pat"
              opacity="0.35"
              stroke="url(#pathGrad)"
              strokeDasharray="8 6"
              strokeWidth="2"
            />
            {/* Patient → Medical Center (left arc) */}
            <path
              className="hero-path"
              d="M 500 440 C 380 460, 220 360, 200 220"
              fill="none"
              id="path-pat-mc"
              opacity="0.35"
              stroke="url(#pathGrad)"
              strokeDasharray="8 6"
              strokeWidth="2"
            />
            <defs>
              <linearGradient id="pathGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#93C5FD" />
                <stop offset="50%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#93C5FD" />
              </linearGradient>
            </defs>
          </svg>

          {/* Actor: Medical Center (left) */}
          <div className="absolute left-[6%] top-[22%] z-10 flex flex-col items-center sm:left-[10%] sm:top-[18%]">
            <div className="relative h-[80px] w-[100px] sm:h-[140px] sm:w-[180px] lg:h-[170px] lg:w-[210px]">
              <Image
                alt={ACTORS[0].name}
                className="object-contain drop-shadow-[0_14px_24px_rgba(120,134,165,0.3)]"
                fill
                priority
                sizes="(max-width: 640px) 100px, (max-width: 1024px) 180px, 210px"
                src={ACTORS[0].image}
              />
            </div>
            <h3 className="mt-1 text-xs font-semibold text-slate-700 sm:text-sm">
              {ACTORS[0].name}
            </h3>
          </div>

          {/* Actor: Laboratory (right) */}
          <div className="absolute right-[6%] top-[22%] z-10 flex flex-col items-center sm:right-[10%] sm:top-[18%]">
            <div className="relative h-[80px] w-[100px] sm:h-[140px] sm:w-[180px] lg:h-[170px] lg:w-[210px]">
              <Image
                alt={ACTORS[1].name}
                className="object-contain drop-shadow-[0_14px_24px_rgba(120,134,165,0.3)]"
                fill
                sizes="(max-width: 640px) 100px, (max-width: 1024px) 180px, 210px"
                src={ACTORS[1].image}
              />
            </div>
            <h3 className="mt-1 text-xs font-semibold text-slate-700 sm:text-sm">
              {ACTORS[1].name}
            </h3>
          </div>

          {/* Actor: Patient (bottom center) */}
          <div className="absolute bottom-[90px] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center sm:bottom-[100px]">
            <div className="relative h-[90px] w-[60px] sm:h-[150px] sm:w-[100px] lg:h-[180px] lg:w-[120px]">
              <Image
                alt={ACTORS[2].name}
                className="object-contain drop-shadow-[0_14px_24px_rgba(120,134,165,0.3)]"
                fill
                priority
                sizes="(max-width: 640px) 60px, (max-width: 1024px) 100px, 120px"
                src={ACTORS[2].image}
              />
            </div>
            <h3 className="mt-1 text-xs font-semibold text-slate-700 sm:text-sm">
              {ACTORS[2].name}
            </h3>
          </div>

          {/* Animated icons traveling along paths */}
          <div className="pointer-events-none absolute inset-0 z-20">
            {Array.from({ length: ICON_COUNT }, (_, i) => (
              <div
                className="absolute left-0 top-0 opacity-0"
                key={`icon-${verified ? "post" : "pre"}-${i}`}
                ref={(node) => {
                  iconRefs.current[i] = node;
                }}
              >
                <Image
                  alt="asset"
                  className="object-contain drop-shadow-[0_6px_12px_rgba(104,120,156,0.25)]"
                  height={verified ? 38 : 30}
                  src={activeAssets[i % activeAssets.length]}
                  width={verified ? 38 : 30}
                />
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="absolute inset-x-0 bottom-4 z-50 flex flex-col items-center gap-1 sm:bottom-6 sm:gap-2">
            <p
              className="max-w-[220px] px-4 text-center text-[10px] text-slate-500 sm:max-w-xl sm:text-sm"
              key={verified ? "verified-caption" : "base-caption"}
              style={{ animation: "fadeIn 0.6s ease" }}
            >
              {verified ? (
                "Verifiable and secure workflow."
              ) : (
                <>
                  Built for the new era of{" "}
                  <strong className="text-slate-700">
                    health data interoperability and ICD-11 digital standards
                  </strong>
                  .
                </>
              )}
            </p>
            <Button
              className="min-w-[200px] transition-all duration-500 sm:min-w-[250px]"
              onClick={() => !verified && onVerify()}
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
          </div>
        </div>
      </div>
    </section>
  );
}
