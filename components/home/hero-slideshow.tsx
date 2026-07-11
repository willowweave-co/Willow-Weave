"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@/lib/types";
import { BottomMelt } from "@/components/store/bottom-melt";
import { cn } from "@/lib/utils";

const AUTOPLAY_MS = 6500;
const SWIPE_PX = 45;

/**
 * Full-bleed homepage hero slideshow (slides managed in Admin → Homepage).
 * Crossfades between slides; the edges melt into the ivory page background
 * with a blur + colour-matched gradient instead of a hard border.
 */
export function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const touchX = useRef<number | null>(null);
  const count = slides.length;

  const goTo = useCallback(
    (i: number) => setIndex(((i % count) + count) % count),
    [count]
  );

  // Autoplay — recreated whenever the index changes, so manual navigation
  // naturally resets the timer. Respects reduced-motion and hidden tabs.
  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [count, paused, index]);

  // Only the visible slide's video should play.
  useEffect(() => {
    videoRefs.current.forEach((v, i) => {
      if (!v) return;
      if (i === index) v.play().catch(() => {});
      else v.pause();
    });
  }, [index]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured collections and offers"
      // pulled up behind the translucent sticky header (h-16 / md:h-[4.5rem])
      // so the slide shows through it, as in the owner's mockup
      className="group/hero relative -mt-14 h-[480px] w-full overflow-hidden md:-mt-16 md:h-[540px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        touchX.current = null;
        setPaused(false);
        if (start == null) return;
        const dx = e.changedTouches[0].clientX - start;
        if (Math.abs(dx) > SWIPE_PX) goTo(index + (dx < 0 ? 1 : -1));
      }}
    >
      {slides.map((s, i) => {
        const active = i === index;
        const Heading = i === 0 ? "h1" : "h2";
        return (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={!active}
            inert={!active}
            className={cn(
              "absolute inset-0 transition-opacity duration-[1100ms] ease-out",
              active ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            {s.mediaType === "video" ? (
              <video
                ref={(el) => {
                  videoRefs.current[i] = el;
                }}
                src={s.mediaUrl}
                muted
                loop
                playsInline
                preload={i === 0 ? "auto" : "metadata"}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <Image
                src={s.mediaUrl}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
              />
            )}

            {/* whole slide is clickable */}
            <Link href={s.href as never} aria-label={s.heading} className="absolute inset-0 z-[5]" />

            {/* soft legibility wash behind the copy — kept gentle on purpose */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/35 via-ink/10 to-transparent" />

            {/* copy — left-aligned, vertically centred in the visible band below the header */}
            <div className="pointer-events-none absolute inset-0 z-[6]">
              <div className="container-site flex h-full items-center pt-14 md:pt-16">
                {/* extra left padding on md–xl clears the edge arrows; at 2xl
                    the centred container's gutter already does */}
                <div className="max-w-xl pb-16 md:pb-10 md:pl-10 lg:pl-12 2xl:pl-0">
                  {s.eyebrow && (
                    <p className="text-xs font-medium tracking-[0.28em] text-gold uppercase drop-shadow-[0_1px_10px_rgba(41,33,26,0.55)] md:text-sm">
                      {s.eyebrow}
                    </p>
                  )}
                  <Heading className="heading-display mt-2 text-4xl font-semibold text-ivory drop-shadow-[0_2px_18px_rgba(41,33,26,0.5)] text-balance sm:text-5xl lg:text-6xl">
                    {s.heading}
                  </Heading>
                </div>
              </div>
            </div>

          </div>
        );
      })}

      {/* CTAs live OUTSIDE the fading slides: a mid-fade slide's opacity
          animation creates a stacking context that would trap the button
          below the z-10 blend layers, so each button crossfades on its own
          inside this always-on-top z-20 layer. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-16 z-20 md:bottom-[4.5rem]">
        {slides.map((s, i) =>
          s.ctaLabel ? (
            <div
              key={s.id}
              className={cn(
                // bottom-0: the wrapper is zero-height (children are absolute),
                // so anchor each row to its bottom edge and grow upward —
                // otherwise the pill hangs down into the dot indicators
                "absolute inset-x-0 bottom-0 flex justify-center transition-opacity duration-[1100ms] ease-out",
                i === index ? "opacity-100" : "pointer-events-none opacity-0"
              )}
            >
              <Link
                href={s.href as never}
                tabIndex={i === index ? 0 : -1}
                aria-hidden={i !== index}
                className="pointer-events-auto rounded-full bg-ivory/95 px-7 py-2.5 text-sm font-medium text-ink shadow-lg shadow-ink/15 backdrop-blur-sm transition-colors hover:bg-gold"
              >
                {s.ctaLabel}
              </Link>
            </div>
          ) : null
        )}
      </div>

      {/* ── edge blending: only the bottom melts into the ivory page ──
          (the top runs under the translucent header instead of fading) */}
      <BottomMelt />

      {/* arrows (desktop) */}
      {count > 1 && (
        <>
          <button
            onClick={() => goTo(index - 1)}
            aria-label="Previous slide"
            className="absolute top-[calc(50%+2rem)] left-2 z-20 hidden -translate-y-1/2 p-2 text-ivory drop-shadow-[0_1px_10px_rgba(41,33,26,0.8)] transition-transform hover:scale-110 md:flex lg:left-4"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={() => goTo(index + 1)}
            aria-label="Next slide"
            className="absolute top-[calc(50%+2rem)] right-2 z-20 hidden -translate-y-1/2 p-2 text-ivory drop-shadow-[0_1px_10px_rgba(41,33,26,0.8)] transition-transform hover:scale-110 md:flex lg:right-4"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      {/* dots */}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center gap-2 md:bottom-7">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                i === index ? "w-7 bg-walnut" : "w-2 bg-ink/25 hover:bg-ink/45"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
