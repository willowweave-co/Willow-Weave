"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ImagePlus, Trash2, Film } from "lucide-react";
import type { HeroSlide } from "@/lib/types";
import { saveHeroSlidesAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, Checkbox } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm";
const MAX_SLIDES = 8;

interface LinkOption {
  label: string;
  href: string;
}

function newId() {
  return `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function MediaThumb({ slide }: { slide: HeroSlide }) {
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg border border-line bg-linen sm:w-40 sm:shrink-0">
      {slide.mediaType === "video" ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption -- decorative preview */}
          <video src={slide.mediaUrl} muted playsInline preload="metadata" className="h-full w-full object-cover" />
          <span className="absolute right-1.5 bottom-1.5 flex items-center gap-1 rounded-full bg-ink/70 px-2 py-0.5 text-[0.65rem] font-medium text-ivory">
            <Film className="h-3 w-3" /> Video
          </span>
        </>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- tiny admin preview of arbitrary uploads
        <img src={slide.mediaUrl} alt="" className="h-full w-full object-cover" />
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
  const [uploading, setUploading] = useState(false);
  const [replacing, setReplacing] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);

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

  const upload = async (file: File): Promise<{ url: string; kind: "image" | "video" } | null> => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      return { url: data.url, kind: data.kind === "video" ? "video" : "image" };
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed", "error");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const addSlide = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const up = await upload(file);
    if (addRef.current) addRef.current.value = "";
    if (!up) return;
    setSlides((ss) => [
      ...ss,
      {
        id: newId(),
        mediaType: up.kind,
        mediaUrl: up.url,
        eyebrow: "",
        heading: "",
        href: "/products",
        ctaLabel: "Shop Now",
        enabled: true,
      },
    ]);
  };

  const replaceMedia = async (files: FileList | null) => {
    const file = files?.[0];
    const id = replacing;
    setReplacing(null);
    if (replaceRef.current) replaceRef.current.value = "";
    if (!file || !id) return;
    const up = await upload(file);
    if (up) patch(id, { mediaUrl: up.url, mediaType: up.kind });
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
                  onClick={() => {
                    setReplacing(s.id);
                    replaceRef.current?.click();
                  }}
                  disabled={uploading}
                  className="w-full rounded-lg border border-line px-2 py-1.5 text-xs font-medium text-bark transition-colors hover:border-walnut hover:text-walnut sm:w-40"
                >
                  Replace media
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

      {/* hidden input shared by all "Replace media" buttons */}
      <input
        ref={replaceRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => replaceMedia(e.target.files)}
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <input
            ref={addRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => addSlide(e.target.files)}
          />
          <Button
            variant="outline"
            onClick={() => addRef.current?.click()}
            loading={uploading}
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
    </section>
  );
}
