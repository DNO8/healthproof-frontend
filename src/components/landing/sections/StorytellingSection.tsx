import Image from "next/image";
import {
  STORY_CHAPTERS,
  STORY_CIRCLE_DECORS,
  STORY_CROSS_DECORS,
} from "@/components/landing/constants";
import {
  DecorativeCircle,
  DecorativeCross,
  ScrollReveal,
} from "@/components/ui";

export function StorytellingSection() {
  return (
    <div className="space-y-8">
      {STORY_CHAPTERS.map((chapter, index) => {
        const imageFirst = index % 2 === 1;

        return (
          <ScrollReveal key={chapter.title} y={60} duration={0.9}>
            <section className="neu-shell relative min-h-screen overflow-hidden border border-white/70 p-5 sm:p-8">
              {STORY_CIRCLE_DECORS.map((circle) => (
                <DecorativeCircle
                  className={`pointer-events-none absolute opacity-70 ${circle.className}`}
                  color={circle.color}
                  key={`story-circle-${chapter.chapter}-${circle.className}-${circle.size}`}
                  size={circle.size}
                />
              ))}
              {STORY_CROSS_DECORS.map((cross) => (
                <DecorativeCross
                  className={`pointer-events-none absolute opacity-75 ${cross.className}`}
                  color={cross.color}
                  key={`story-cross-${chapter.chapter}-${cross.className}-${cross.size}`}
                  size={cross.size}
                />
              ))}
              <Image
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute right-4 top-4 h-auto w-[90px] opacity-25 sm:w-[115px]"
                height={500}
                src="/images/icons/cruces-icons.png"
                width={500}
              />

              <div className="grid min-h-[calc(100vh-5rem)] items-center gap-7 lg:grid-cols-2">
                <div
                  className={
                    imageFirst ? "order-2 lg:order-2" : "order-2 lg:order-1"
                  }
                >
                  <article className="neu-surface p-6 sm:p-8">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      {chapter.chapter}
                    </p>
                    <h3 className="mt-3 text-3xl font-semibold leading-tight text-slate-800 sm:text-4xl">
                      {chapter.title}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                      {chapter.body}
                    </p>
                    <div className="mt-6">
                      <span className="neu-chip inline-flex px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                        {chapter.miniCta}
                      </span>
                    </div>
                  </article>
                </div>

                <div
                  className={
                    imageFirst ? "order-1 lg:order-1" : "order-1 lg:order-2"
                  }
                >
                  <div className="neu-surface overflow-hidden p-4">
                    <div className="relative aspect-4/3 overflow-hidden rounded-[24px] border border-white/80">
                      <Image
                        alt={chapter.title}
                        className="object-cover"
                        fill
                        sizes="(max-width: 1024px) 100vw, 50vw"
                        src={chapter.image}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </ScrollReveal>
        );
      })}
    </div>
  );
}
