import gsap from "gsap";
import { Check, Lock, MousePointerClick } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  ACTORS,
  HERO_CIRCLE_DECORS,
  HERO_CROSS_DECORS,
  POST_BLOCKCHAIN_ASSETS,
  PRE_BLOCKCHAIN_ASSETS,
} from "@/components/landing/constants";
import {
  type DemoActor,
  type DemoSteps,
  HeroDemoModal,
} from "@/components/landing/HeroDemoModal";
import { DemoSummary } from "@/components/landing/demo/DemoSummary";
import { Button, DecorativeCircle, DecorativeCross } from "@/components/ui";
import { useHeroPathAnimation } from "@/hooks/ui/useHeroPathAnimation";

const ICON_COUNT = 12;

function getPathStates(steps: DemoSteps): Record<string, boolean> {
  return {
    "path-mc-lab": steps.lab,
    "path-lab-pat": steps.patient,
    "path-pat-mc": steps.doctor,
  };
}

export function HeroCarouselSection() {
  const t = useTranslations("hero");
  const tActors = useTranslations("actors");
  const tDemo = useTranslations("heroDemo");
  const router = useRouter();
  const sectionRef = useRef<HTMLElement | null>(null);
  const iconRefs = useRef<Array<HTMLDivElement | null>>([]);
  const imgRefs = useRef<Array<HTMLImageElement | null>>([]);
  const headline1Ref = useRef<HTMLSpanElement | null>(null);
  const headline2Ref = useRef<HTMLSpanElement | null>(null);

  const [steps, setSteps] = useState<DemoSteps>({
    doctor: false,
    patient: false,
    lab: false,
  });
  const [activeActor, setActiveActor] = useState<DemoActor | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const allDone = steps.doctor && steps.patient && steps.lab;
  const pathStates = getPathStates(steps);

  const unlocked: Record<DemoActor, boolean> = {
    doctor: true,
    patient: steps.doctor,
    lab: steps.doctor && steps.patient,
  };

  useEffect(() => {
    const h1 = headline1Ref.current;
    const h2 = headline2Ref.current;
    if (!h1 || !h2) return;

    gsap.set(h2, { autoAlpha: 0 });
    gsap.set(h1, { autoAlpha: 1 });

    const tl = gsap.timeline({ repeat: -1 });

    tl.to(h1, { autoAlpha: 0, duration: 1.2, ease: "sine.inOut", delay: 3 })
      .to(h2, { autoAlpha: 1, duration: 1.2, ease: "sine.inOut" }, "<0.3")
      .to(h2, { autoAlpha: 0, duration: 1.2, ease: "sine.inOut", delay: 3 })
      .to(h1, { autoAlpha: 1, duration: 1.2, ease: "sine.inOut" }, "<0.3");

    return () => {
      tl.kill();
    };
  }, []);

  useHeroPathAnimation(
    sectionRef,
    iconRefs,
    imgRefs,
    pathStates,
    PRE_BLOCKCHAIN_ASSETS,
    POST_BLOCKCHAIN_ASSETS,
  );

  const handleComplete = (actor: DemoActor) => {
    setSteps((prev) => ({ ...prev, [actor]: true }));
    setActiveActor(null);
  };

  const actorCardClass =
    "group absolute rounded-3xl border border-transparent bg-transparent p-2 transition hover:bg-white/30";

  const openActor = (actor: DemoActor) => {
    if (!unlocked[actor]) return;
    setActiveActor(actor);
  };

  const handleActorKeyDown = (e: React.KeyboardEvent, actor: DemoActor) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openActor(actor);
    }
  };

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
            className="block bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent pb-2"
            ref={headline1Ref}
          >
            {t("headline1")}
          </span>
          <span
            className="absolute inset-x-0 top-0 bg-linear-to-r from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent"
            ref={headline2Ref}
          >
            {t("headline2")}
          </span>
        </h1>
      </header>

      <div className="relative z-10">
        <div className="neu-shell relative mx-auto aspect-square w-full max-w-6xl overflow-hidden border border-white/70 sm:aspect-auto sm:h-[640px] sm:p-6 sm:pb-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(167,243,208,0.16),transparent_56%)]" />

          {/* SVG paths connecting actors */}
          <svg
            aria-labelledby="hero-paths-title"
            className="pointer-events-none absolute inset-0 z-0 h-full w-full"
            preserveAspectRatio="none"
            role="img"
            viewBox="0 0 1000 600"
          >
            <title id="hero-paths-title">{t("svgTitle")}</title>
            {/* Medical Center → Laboratory (top arc) */}
            <path
              className="hero-path"
              d="M 200 220 C 350 80, 650 80, 800 220"
              fill="none"
              id="path-mc-lab"
              opacity={pathStates["path-mc-lab"] ? "0.65" : "0.35"}
              stroke="url(#pathGrad)"
              strokeDasharray="8 6"
              strokeWidth={pathStates["path-mc-lab"] ? "3" : "2"}
            />
            {/* Laboratory → Patient (right arc) */}
            <path
              className="hero-path"
              d="M 800 220 C 780 360, 620 460, 500 440"
              fill="none"
              id="path-lab-pat"
              opacity={pathStates["path-lab-pat"] ? "0.65" : "0.35"}
              stroke="url(#pathGrad)"
              strokeDasharray="8 6"
              strokeWidth={pathStates["path-lab-pat"] ? "3" : "2"}
            />
            {/* Patient → Medical Center (left arc) */}
            <path
              className="hero-path"
              d="M 500 440 C 380 460, 220 360, 200 220"
              fill="none"
              id="path-pat-mc"
              opacity={pathStates["path-pat-mc"] ? "0.65" : "0.35"}
              stroke="url(#pathGrad)"
              strokeDasharray="8 6"
              strokeWidth={pathStates["path-pat-mc"] ? "3" : "2"}
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
          <div
            className={`${actorCardClass} ${unlocked.doctor ? "cursor-pointer" : "cursor-not-allowed opacity-60"} left-[6%] top-[22%] z-10 flex flex-col items-center sm:left-[10%] sm:top-[18%]`}
            onClick={() => openActor("doctor")}
            onKeyDown={(e) => handleActorKeyDown(e, "doctor")}
            role="button"
            tabIndex={0}
          >
            <div className="relative h-[80px] w-[100px] sm:h-[140px] sm:w-[180px] lg:h-[170px] lg:w-[210px]">
              <Image
                alt={tActors("medicalCenter")}
                className="object-contain drop-shadow-[0_14px_24px_rgba(120,134,165,0.3)]"
                fill
                priority
                sizes="(max-width: 640px) 100px, (max-width: 1024px) 180px, 210px"
                src={ACTORS[0].image}
              />
              {steps.doctor && (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-white shadow-md">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              {!steps.doctor && unlocked.doctor && (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-sky-400 text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                  <MousePointerClick className="h-3.5 w-3.5" />
                </span>
              )}
              {!steps.doctor && !unlocked.doctor && (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-400 text-white shadow-md">
                  <Lock className="h-3 w-3" />
                </span>
              )}
            </div>
            <h3 className="mt-1 text-xs font-semibold text-slate-700 sm:text-sm">
              {tActors("medicalCenter")}
            </h3>
          </div>

          {/* Actor: Laboratory (right) */}
          <div
            className={`${actorCardClass} ${unlocked.lab ? "cursor-pointer" : "cursor-not-allowed opacity-60"} right-[6%] top-[22%] z-10 flex flex-col items-center sm:right-[10%] sm:top-[18%]`}
            onClick={() => openActor("lab")}
            onKeyDown={(e) => handleActorKeyDown(e, "lab")}
            role="button"
            tabIndex={0}
          >
            <div className="relative h-[80px] w-[100px] sm:h-[140px] sm:w-[180px] lg:h-[170px] lg:w-[210px]">
              <Image
                alt={tActors("laboratory")}
                className="object-contain drop-shadow-[0_14px_24px_rgba(120,134,165,0.3)]"
                fill
                sizes="(max-width: 640px) 100px, (max-width: 1024px) 180px, 210px"
                src={ACTORS[1].image}
              />
              {steps.lab && (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-white shadow-md">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              {!steps.lab && unlocked.lab && (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-sky-400 text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                  <MousePointerClick className="h-3.5 w-3.5" />
                </span>
              )}
              {!steps.lab && !unlocked.lab && (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-400 text-white shadow-md">
                  <Lock className="h-3 w-3" />
                </span>
              )}
            </div>
            <h3 className="mt-1 text-xs font-semibold text-slate-700 sm:text-sm">
              {tActors("laboratory")}
            </h3>
          </div>

          {/* Actor: Patient (bottom center) */}
          <div
            className={`${actorCardClass} ${unlocked.patient ? "cursor-pointer" : "cursor-not-allowed opacity-60"} bottom-[16px] left-1/2 z-10 flex -translate-x-1/2 flex-col items-center sm:bottom-[100px]`}
            onClick={() => openActor("patient")}
            onKeyDown={(e) => handleActorKeyDown(e, "patient")}
            role="button"
            tabIndex={0}
          >
            <div className="relative h-[90px] w-[60px] sm:h-[150px] sm:w-[100px] lg:h-[180px] lg:w-[120px]">
              <Image
                alt={tActors("patient")}
                className="object-contain drop-shadow-[0_14px_24px_rgba(120,134,165,0.3)]"
                fill
                priority
                sizes="(max-width: 640px) 60px, (max-width: 1024px) 100px, 120px"
                src={ACTORS[2].image}
              />
              {steps.patient && (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-white shadow-md">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
              {!steps.patient && unlocked.patient && (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-sky-400 text-white shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                  <MousePointerClick className="h-3.5 w-3.5" />
                </span>
              )}
              {!steps.patient && !unlocked.patient && (
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-400 text-white shadow-md">
                  <Lock className="h-3 w-3" />
                </span>
              )}
            </div>
            <h3 className="mt-1 text-xs font-semibold text-slate-700 sm:text-sm">
              {tActors("patient")}
            </h3>
          </div>

          {/* Animated icons traveling along paths */}
          <div className="pointer-events-none absolute inset-0 z-20">
            {Array.from({ length: ICON_COUNT }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: icon list is static and order never changes
              <div
                className="absolute left-0 top-0 opacity-0"
                key={`icon-${i}`}
                ref={(node) => {
                  iconRefs.current[i] = node;
                }}
              >
                <img
                  alt="asset"
                  className="object-contain drop-shadow-[0_6px_12px_rgba(104,120,156,0.25)]"
                  height={30}
                  ref={(node) => {
                    imgRefs.current[i] = node;
                  }}
                  src={PRE_BLOCKCHAIN_ASSETS[i % PRE_BLOCKCHAIN_ASSETS.length]}
                  width={30}
                />
              </div>
            ))}
          </div>

          {/* Final CTA overlay when all done — desktop only */}
          {allDone && (
            <div className="absolute inset-0 z-40 hidden flex-col items-center justify-center gap-3 sm:flex">
              <p className="text-center text-base font-semibold text-slate-800 drop-shadow-sm">
                {tDemo("demoComplete")}
              </p>
              <p className="max-w-md px-4 text-center text-sm text-slate-600">
                {tDemo("demoCompleteSub")}
              </p>
              <Button
                className="min-w-[240px] animate-[fadeIn_0.6s_ease]"
                onClick={() => setShowSummary(true)}
                size="lg"
                variant="primary"
              >
                {tDemo("viewSummary")}
              </Button>
            </div>
          )}

          {/* Skip demo CTA — inside box on sm+, hidden on mobile */}
          {!allDone && (
            <div className="absolute inset-x-0 bottom-[-30px] p-8 z-50 hidden flex-col items-center gap-2 sm:flex">
              <p className="max-w-xl px-4 text-center text-sm text-slate-500">
                {t("captionBase")}{" "}
                <strong className="text-slate-700">{t("captionBaseBold")}</strong>
                .
              </p>
              <Button
                className="min-w-[250px]"
                onClick={() => router.push("/auth")}
                size="lg"
                variant="primary"
              >
                {t("buttonCta")}
              </Button>
            </div>
          )}
        </div>

        {/* CTA — below box on mobile only */}
        {!allDone && (
          <div className="mt-12 flex flex-col items-center gap-2 sm:hidden">
            <p className="max-w-[280px] px-4 text-center text-xs text-slate-500">
              {t("captionBase")}{" "}
              <strong className="text-slate-700">{t("captionBaseBold")}</strong>.
            </p>
            <Button
              className="min-w-[200px]"
              onClick={() => router.push("/auth")}
              size="lg"
              variant="primary"
            >
              {t("buttonCta")}
            </Button>
          </div>
        )}

        {/* Final CTA — below box on mobile when demo complete */}
        {allDone && (
          <div className="mt-8 flex flex-col items-center gap-2 sm:hidden">
            <p className="text-center text-base font-semibold text-slate-800">
              {tDemo("demoComplete")}
            </p>
            <p className="max-w-xs px-4 text-center text-xs text-slate-600">
              {tDemo("demoCompleteSub")}
            </p>
            <Button
              className="min-w-[220px] animate-[fadeIn_0.6s_ease]"
              onClick={() => setShowSummary(true)}
              size="lg"
              variant="primary"
            >
              {tDemo("viewSummary")}
            </Button>
          </div>
        )}
      </div>

      {/* Demo Modal */}
      {activeActor && (
        <HeroDemoModal
          actor={activeActor}
          onClose={() => setActiveActor(null)}
          onComplete={() => handleComplete(activeActor)}
          onSummary={() => setShowSummary(true)}
          steps={steps}
        />
      )}

      {/* Summary Modal */}
      {showSummary && <DemoSummary onClose={() => setShowSummary(false)} />}
    </section>
  );
}
