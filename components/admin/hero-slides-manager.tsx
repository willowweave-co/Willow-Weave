"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Crosshair, ImagePlus, Trash2, Film } from "lucide-react";
import type { HeroSlide } from "@/lib/types";
import { saveHeroSlidesAction } from "@/app/actions/admin";
import { MediaPickerDialog, type MediaItem } from "@/components/admin/media-library";
import { FocalPointDialog } from "@/components/admin/focal-point-dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Checkbox } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { focalPosition } from "@/lib/utils";

const MAX_SLIDES = 8;

interface LinkOption {
  label: string;
  href: string;
}

function newId() {
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function MediaThumb({ slide }: { slide: HeroSlide }) {
  const style = focalPosition(slide.focalX, slide.focalY);
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
  linkOptions,
}: {
  initial: HeroSlide[];
  linkOptions: LinkOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [slides, setSlides] = useState<HeroSlide[]>(initial);
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
      patch(pickerFor, { mediaUrl: m.url, mediaType: m.kind, focalX: null, focalY: null });
    }
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveHeroSlidesAction(slides);
      if (res.ok) {
        toast("Homepage hero saved.");
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
                  <Input
                    id={`href-${s.id}`}
                    value={s.href}
                    onChange={(e) => patch(s.id, { href: e.target.value })}
                    placeholder="/collections/…"
                    list="hero-link-options"
                  />
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

      <datalist id="hero-link-options">
        {linkOptions.map((o) => (
          <option key={o.href} value={o.href}>
            {o.label}
          </option>
        ))}
      </datalist>

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
          Save homepage
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
            onSave={(pt) =>
              patch(slide.id, { focalX: pt?.x ?? null, focalY: pt?.y ?? null })
            }
            title="Hero slide focus"
          />
        ) : null;
      })()}
    </section>
  );
}
