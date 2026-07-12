"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FocalPoint {
  x: number;
  y: number;
}

interface FocalPointDialogProps {
  open: boolean;
  onClose: () => void;
  src: string;
  mediaType?: "image" | "video";
  /** Current focal point, or null = centre. */
  initial: FocalPoint | null;
  /** Called on save; null = reset to centre. */
  onSave: (point: FocalPoint | null) => void;
  title?: string;
}

/** The crops the storefront actually uses, as live previews. */
const PREVIEWS: { label: string; aspect: string }[] = [
  { label: "Product card (4:5)", aspect: "4 / 5" },
  { label: "Square (1:1)", aspect: "1 / 1" },
  { label: "Banner (16:9)", aspect: "16 / 9" },
];

export function FocalPointDialog({
  open,
  onClose,
  src,
  mediaType = "image",
  initial,
  onSave,
  title = "Choose the image focus",
}: FocalPointDialogProps) {
  const [point, setPoint] = useState<FocalPoint | null>(initial);
  const areaRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (open) setPoint(initial);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const place = (clientX: number, clientY: number) => {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setPoint({ x: Math.round(x), y: Math.round(y) });
  };

  const objectPosition = `${point?.x ?? 50}% ${point?.y ?? 50}%`;

  return createPortal(
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="animate-fade-in absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute top-1/2 left-1/2 flex max-h-[90vh] w-[min(100vw-2rem,52rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-ivory shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="heading-display text-lg text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-bark transition-colors hover:bg-linen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5 md:flex-row">
          {/* the image — click or drag to place the focus */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div
              ref={areaRef}
              className="relative inline-block max-w-full cursor-crosshair touch-none select-none"
              onPointerDown={(e) => {
                dragging.current = true;
                e.currentTarget.setPointerCapture(e.pointerId);
                place(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => dragging.current && place(e.clientX, e.clientY)}
              onPointerUp={() => (dragging.current = false)}
            >
              {mediaType === "video" ? (
                <video
                  src={src}
                  muted
                  playsInline
                  preload="metadata"
                  className="pointer-events-none block max-h-[55vh] w-auto max-w-full rounded-xl"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- needs to hug its
                // natural aspect ratio so click coordinates map 1:1 onto the image
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="pointer-events-none block max-h-[55vh] w-auto max-w-full rounded-xl"
                />
              )}
              {point && (
                <span
                  className="pointer-events-none absolute z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ivory shadow-[0_0_0_2px_rgba(41,33,26,0.6),inset_0_0_0_1px_rgba(41,33,26,0.4)]"
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                >
                  <span className="absolute top-1/2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ivory shadow-[0_0_0_1px_rgba(41,33,26,0.5)]" />
                </span>
              )}
            </div>
            <p className="text-xs text-umber">
              Click (or drag) the spot that must stay in view — a face, the embroidery, the neckline.
            </p>
          </div>

          {/* live previews of the storefront crops */}
          <div className="shrink-0 md:w-44">
            <p className="mb-2 text-[0.65rem] font-semibold tracking-[0.14em] text-umber uppercase">
              How it will crop
            </p>
            <div className="flex flex-row gap-3 md:flex-col">
              {PREVIEWS.map((p) => (
                <figure key={p.label} className="min-w-0 flex-1 md:flex-none">
                  <div
                    className="w-full overflow-hidden rounded-lg border border-line bg-parchment"
                    style={{ aspectRatio: p.aspect }}
                  >
                    {mediaType === "video" ? (
                      <video
                        src={src}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                        style={{ objectPosition }}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- tiny live preview
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                        style={{ objectPosition }}
                      />
                    )}
                  </div>
                  <figcaption className="mt-1 text-[0.65rem] text-umber">{p.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
          <Button variant="ghost" size="sm" onClick={() => setPoint(null)} disabled={!point}>
            Reset to centre
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onSave(point);
                onClose();
              }}
            >
              Save focus
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
