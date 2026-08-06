"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@/lib/types";
import { BottomMelt } from "@/components/store/bottom-melt";
import { cn, focalCrop } from "@/lib/utils";

const AUTOPLAY_MS = 6500;
const SWIPE_PX = 45;

/**
 * Full-bleed homepage hero slideshow (slides managed in Admin → Homepage).
 * Crossfades between slides; the edges melt into the ivory page background
 * with a blur + colour-matched gradient instead of a hard border.
 */
export function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  // `paused` is transient (hover, touch, focus). `stopped` is the visitor's
  // explicit decision via the pause button and outlives any of those — WCAG
  // 2.2.2 wants a real control, not just "it happens to pause while you
  // hover", and a hover pause that silently resumes is worse than none.
  const [paused, setPaused] = useState(false);
  const [stopped, setStopped] = useState(false);
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
    if (count < 2 || paused || stopped) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      if (!document.hidden) setIndex((i) => (i + 1) % count);
    }, AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [count, paused, stopped, index]);

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
      // pulled up behind the translucent sticky header (h-16 / md:h-20) so
      // the slide shows through it, as in the owner's mockup. These offsets
      // must stay in step with the header's height.
      className="group/hero relative -mt-16 h-[480px] w-full overflow-hidden md:-mt-20 md:h-[540px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // Keyboard users got no equivalent of the hover pause: tabbing to the
      // dots or the slide's own link left the carousel rotating, so the
      // target moved out from under them mid-decision. Focus anywhere inside
      // the hero now holds it still, and releases when focus leaves.
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
      // a slide advancing mid-tap would swap the link under the finger —
      // freeze the rotation the instant any pointer touches the hero
      onPointerDown={() => setPaused(true)}
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
                style={focalCrop(s.focalX, s.focalY, s.focalZoom)}
              />
            ) : (
              <Image
                src={s.mediaUrl}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover"
                style={focalCrop(s.focalX, s.focalY, s.focalZoom)}
              />
            )}

            {/* whole slide is clickable */}
            <Link href={s.href as never} aria-label={s.heading} className="absolute inset-0 z-[5]" />

            {/* Legibility wash. Strengthened from ink/35 → ink/10: the copy
                sits on whatever the merchandiser uploads, and on pale fabric
                shots the old ramp left the eyebrow at roughly 1.7:1. The
                weight is concentrated on the left third where the copy
                actually lives, so the right side of the image — usually the
                garment — stays as open as before. */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/60 via-ink/25 to-transparent" />

            {/* copy — left-aligned, vertically centred in the visible band below the header */}
            <div className="pointer-events-none absolute inset-0 z-[6]">
              <div className="container-site flex h-full items-center pt-16 md:pt-20">
                {/* extra left padding on md–xl clears the edge arrows; at 2xl
                    the centred container's gutter already does */}
                <div className="max-w-xl pb-16 md:pb-10 md:pl-10 lg:pl-12 2xl:pl-0">
                  {/* gold-light + .on-image: plain `gold` cannot be made
                      readable over arbitrary photography — even under a
                      heavy scrim it tops out near 1.7:1 on a bright frame.
                      The lighter champagne tone keeps the hue while
                      carrying the luminance the job needs, and .on-image
                      adds a tight halo that holds the glyph edges. */}
                  {s.eyebrow && (
                    <p className="on-image text-xs font-medium tracking-[0.28em] text-gold-light uppercase md:text-sm">
                      {s.eyebrow}
                    </p>
                  )}
                  <Heading className="heading-display on-image mt-2 text-4xl font-semibold text-ivory text-balance sm:text-5xl lg:text-6xl">
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
                className={cn(
                  "rounded-full bg-ivory/95 px-7 py-2.5 text-sm font-medium text-ink shadow-lg shadow-ink/15 backdrop-blur-sm transition-colors hover:bg-gold",
                  // pointer-events-auto on a child DEFEATS the parent's
                  // pointer-events-none, so every hidden pill (they all stack
                  // in the same spot) would swallow clicks meant for the
                  // visible one — the click always landed on the LAST slide's
                  // link. Only the active slide's pill may be interactive.
                  i === index ? "pointer-events-auto" : "pointer-events-none"
                )}
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
            className="focus-ring absolute top-[calc(50%+2rem)] left-2 z-20 hidden -translate-y-1/2 rounded-full p-2 text-ivory icon-on-image transition-transform hover:scale-110 md:flex lg:left-4"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={() => goTo(index + 1)}
            aria-label="Next slide"
            className="focus-ring absolute top-[calc(50%+2rem)] right-2 z-20 hidden -translate-y-1/2 rounded-full p-2 text-ivory icon-on-image transition-transform hover:scale-110 md:flex lg:right-4"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      {/* dots + the pause control, on one row so they read as one control set */}
      {count > 1 && (
        <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-center gap-2 md:bottom-7">
          {/* Drawn rather than iconed, so it belongs to the dots: same 8px
              height, same ink/25 → ink/45 colour, same filled-and-rounded
              language. A lucide glyph here read as a stray UI control
              borrowed from another site. */}
          <button
            onClick={() => setStopped((s) => !s)}
            aria-label={stopped ? "Resume the slideshow" : "Pause the slideshow"}
            className="focus-ring tap-tall mr-1.5 flex items-center text-ink/25 transition-colors hover:text-ink/45"
          >
            {stopped ? (
              <svg viewBox="0 0 8 8" className="h-2 w-2" aria-hidden>
                <path d="M1 0.4 L7.4 4 L1 7.6 Z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 8 8" className="h-2 w-2" aria-hidden>
                <rect x="0.5" y="0" width="2.6" height="8" rx="1.3" fill="currentColor" />
                <rect x="4.9" y="0" width="2.6" height="8" rx="1.3" fill="currentColor" />
              </svg>
            )}
          </button>
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === index}
              // tap-tall: the painted dot stays 8px, but the tappable area
              // becomes 44px tall — these were the hardest thing on the page
              // to hit with a thumb, and they are the only way to reach
              // slides 2+ on a phone.
              className={cn(
                "focus-ring tap-tall h-2 rounded-full transition-all duration-300",
                i === index ? "w-7 bg-walnut" : "w-2 bg-ink/25 hover:bg-ink/45"
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
