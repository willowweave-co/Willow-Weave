"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Crosshair, ImagePlus, Trash2, Film, Timer } from "lucide-react";
import type { HeroSlide } from "@/lib/types";
import {
  DEFAULT_HERO_INTERVAL_MS,
  MIN_HERO_INTERVAL_MS,
  MAX_HERO_INTERVAL_MS,
} from "@/lib/data/hero-defaults";
import { saveHeroSlidesAction } from "@/app/actions/admin";
import { MediaPickerDialog, type MediaItem } from "@/components/admin/media-library";
import { FocalPointDialog } from "@/components/admin/focal-point-dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Checkbox } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { focalCrop } from "@/lib/utils";

const MAX_SLIDES = 8;

/** Keep a half-typed or out-of-range entry from reaching the server. */
function clampSeconds(value: string): string {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return String(DEFAULT_HERO_INTERVAL_MS / 1000);
  const clamped = Math.min(
    MAX_HERO_INTERVAL_MS / 1000,
    Math.max(MIN_HERO_INTERVAL_MS / 1000, n)
  );
  // drop a trailing ".0" so the field reads "6" rather than "6.0"
  return String(Math.round(clamped * 2) / 2);
}

interface LinkOption {
  label: string;
  href: string;
}

function newId() {
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function MediaThumb({ slide }: { slide: HeroSlide }) {
  const style = focalCrop(slide.focalX, slide.focalY, slide.focalZoom);
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-line bg-linen sm:w-40 sm:shrink-0">
      {slide.mediaType === "video" ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- decorative preview */}
          <video src={slide.mediaUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" style={style} />
          <span className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-full bg-ink/70 px-2 py-0.5 text-[0.65rem] font-medium text-ivory">
            <Film className="h-3 w-3" /> Video
          </span>
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- tiny admin preview of arbitrary uploads
        <img src={slide.mediaUrl} alt="" className="h-full w-full object-cover" style={style} />
      )}
    </div>
  );
}

export function HeroSlidesManager({
  initial,
  initialIntervalMs,
  linkOptions,
}: {
  initial: HeroSlide[];
  initialIntervalMs: number;
  linkOptions: LinkOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [slides, setSlides] = useState<HeroSlide[]>(initial);
  // held as a string so the field can be cleared mid-edit without snapping
  // back to a number under the owner's cursor
  const [seconds, setSeconds] = useState(String(initialIntervalMs / 1000));
  const enabledCount = slides.filter((s) => s.enabled).length;
  /** "add" = new slide, otherwise the id of the slide whose media to replace */
  const [pickerFor, setPickerFor] = useState<"add" | string | null>(null);
  /** id of the slide whose focal point is being adjusted */
  const [focusFor, setFocusFor] = useState<string | null>(null);

  const patch = (id: string, p: Partial<HeroSlide>) =>
    setSlides((ss) => ss.map((s) => (s.id === id ? { ...s, ...p } : s)));

  const move = (i: number, dir: -1 | 1) =>
    setSlides((ss) => {
      const j = i + dir;
      if (j < 0 || j >= ss.length) return ss;
      const next = [...ss];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const onPick = (items: MediaItem[]) => {
    const m = items[0];
    if (!m || !pickerFor) return;
    if (pickerFor === "add") {
      setSlides((ss) =>
        ss.length >= MAX_SLIDES
          ? ss
          : [
              ...ss,
              {
                id: newId(),
                mediaType: m.kind,
                mediaUrl: m.url,
                focalX: null,
                focalY: null,
                focalZoom: null,
                eyebrow: "",
                heading: "",
                href: "/products",
                ctaLabel: "Shop Now",
                enabled: true,
              },
            ]
      );
    } else {
      // different media → old focal point no longer applies
      patch(pickerFor, {
        mediaUrl: m.url,
        mediaType: m.kind,
        focalX: null,
        focalY: null,
        focalZoom: null,
      });
    }
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveHeroSlidesAction(slides, Number(clampSeconds(seconds)) * 1000);
      if (res.ok) {
        // a warning means it saved but something needs the owner's attention,
        // so it gets the louder tone rather than a green "all done"
        toast(res.warning ?? "Hero saved.", res.warning ? "error" : "success");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't save the slides.", "error");
      }
    });

  return (
    <section className="rounded-2xl border border-line bg-white/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Hero slides</h2>
        <span className="text-xs text-umber">
          {slides.length}/{MAX_SLIDES} · drag-free — use the arrows to reorder
        </span>
      </div>

      {slides.length === 0 && (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-umber">
          No slides yet — the homepage shows no hero until you add one.
        </p>
      )}

      <ul className="space-y-4">
        {slides.map((s, i) => (
          <li key={s.id} className="rounded-xl border border-line bg-white/70 p-4">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="space-y-2">
                <MediaThumb slide={s} />
                <button
                  onClick={() => setPickerFor(s.id)}
                  className="w-full rounded-lg border border-line px-2 py-1.5 text-xs font-medium text-bark transition-colors hover:border-walnut hover:text-walnut sm:w-40"
                >
                  Replace media
                </button>
                <button
                  onClick={() => setFocusFor(s.id)}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line px-2 py-1.5 text-xs font-medium text-bark transition-colors hover:border-walnut hover:text-walnut sm:w-40"
                >
                  <Crosshair className="h-3.5 w-3.5" /> Adjust focus
                </button>
              </div>

              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`eyebrow-${s.id}`}>Small label (optional)</Label>
                  <Input
                    id={`eyebrow-${s.id}`}
                    value={s.eyebrow}
                    onChange={(e) => patch(s.id, { eyebrow: e.target.value })}
                    placeholder="Volume 5"
                  />
                </div>
                <div>
                  <Label htmlFor={`heading-${s.id}`}>Heading</Label>
                  <Input
                    id={`heading-${s.id}`}
                    value={s.heading}
                    onChange={(e) => patch(s.id, { heading: e.target.value })}
                    placeholder="Sun Kissed Threads"
                  />
                </div>
                <div>
                  <Label htmlFor={`href-${s.id}`}>Links to</Label>
                  {(() => {
                    const isCustom = !linkOptions.some((o) => o.href === s.href);
                    return (
                      <>
                        <Select
                          id={`href-${s.id}`}
                          value={isCustom ? "__custom" : s.href}
                          onChange={(e) =>
                            // "" for custom → the URL input below appears empty, ready to type
                            patch(s.id, { href: e.target.value === "__custom" ? "" : e.target.value })
                          }
                        >
                          {linkOptions.map((o) => (
                            <option key={o.href} value={o.href}>
                              {o.label}
                            </option>
                          ))}
                          <option value="__custom">Custom URL…</option>
                        </Select>
                        {isCustom && (
                          <Input
                            value={s.href}
                            onChange={(e) => patch(s.id, { href: e.target.value })}
                            placeholder="/products or https://…"
                            className="mt-2 h-9"
                          />
                        )}
                      </>
                    );
                  })()}
                </div>
                <div>
                  <Label htmlFor={`cta-${s.id}`}>Button text (empty = no button)</Label>
                  <Input
                    id={`cta-${s.id}`}
                    value={s.ctaLabel}
                    onChange={(e) => patch(s.id, { ctaLabel: e.target.value })}
                    placeholder="Shop Now"
                  />
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
              <Checkbox
                label="Show this slide"
                checked={s.enabled}
                onChange={(e) => patch(s.id, { enabled: e.target.checked })}
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move slide ${i + 1} up`}
                  className="rounded-full p-1.5 text-bark transition-colors hover:bg-linen hover:text-walnut disabled:opacity-30"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === slides.length - 1}
                  aria-label={`Move slide ${i + 1} down`}
                  className="rounded-full p-1.5 text-bark transition-colors hover:bg-linen hover:text-walnut disabled:opacity-30"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSlides((ss) => ss.filter((x) => x.id !== s.id))}
                  aria-label={`Delete slide ${i + 1}`}
                  className="rounded-full p-1.5 text-umber/70 transition-colors hover:bg-linen hover:text-madder"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Timing. Shown in seconds because that's how the owner thinks about
          it; stored in ms because that's what setInterval takes. Only
          meaningful with more than one slide, so it says so rather than
          sitting there looking broken. */}
      <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-parchment/40 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <Timer className="h-4 w-4 shrink-0 text-umber" />
          <Label htmlFor="hero-interval" className="mb-0 whitespace-nowrap">
            Seconds per slide
          </Label>
          <Input
            id="hero-interval"
            type="number"
            min={MIN_HERO_INTERVAL_MS / 1000}
            max={MAX_HERO_INTERVAL_MS / 1000}
            step={0.5}
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            onBlur={() => setSeconds(clampSeconds(seconds))}
            className="w-24"
          />
        </div>
        <p className="min-w-48 flex-1 text-xs leading-relaxed text-umber">
          {enabledCount > 1 ? (
            <>
              How long each slide holds before the next one.{" "}
              {MIN_HERO_INTERVAL_MS / 1000}–{MAX_HERO_INTERVAL_MS / 1000} seconds.
            </>
          ) : (
            <>
              Only takes effect with more than one slide switched on — right now the hero
              shows a single, static slide.
            </>
          )}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button
            variant="outline"
            onClick={() => setPickerFor("add")}
            disabled={slides.length >= MAX_SLIDES}
          >
            <ImagePlus className="h-4 w-4" /> Add slide (image or video)
          </Button>
          <p className="mt-1.5 text-xs text-umber">
            Wide images work best (≈1600×900). Videos: MP4/WebM, max 40 MB, they play muted.
          </p>
        </div>
        <Button onClick={save} loading={pending}>
          Save hero
        </Button>
      </div>

      <MediaPickerDialog
        open={pickerFor !== null}
        onClose={() => setPickerFor(null)}
        kind="all"
        onSelect={onPick}
        title={pickerFor === "add" ? "Add a hero slide" : "Replace slide media"}
      />

      {(() => {
        const slide = slides.find((s) => s.id === focusFor);
        return slide ? (
          <FocalPointDialog
            open
            onClose={() => setFocusFor(null)}
            src={slide.mediaUrl}
            mediaType={slide.mediaType}
            initial={
              slide.focalX != null || slide.focalY != null
                ? { x: slide.focalX ?? 50, y: slide.focalY ?? 50 }
                : null
            }
            withZoom
            initialZoom={slide.focalZoom ?? null}
            onSave={(pt, zoom) =>
              patch(slide.id, { focalX: pt?.x ?? null, focalY: pt?.y ?? null, focalZoom: zoom })
            }
            title="Hero slide focus"
            previews={[
              { label: "Desktop hero (wide)", aspect: "8 / 3" },
              { label: "Phone hero (tall)", aspect: "4 / 5" },
            ]}
          />
        ) : null;
      })()}
    </section>
  );
}
