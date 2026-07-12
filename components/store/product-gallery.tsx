"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImage } from "@/lib/types";
import { cn, focalPosition } from "@/lib/utils";

const SWIPE_PX = 45;

export function ProductGallery({ images, title }: { images: ProductImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const current = images[active];
  const count = images.length;

  const goTo = (i: number) => setActive(((i % count) + count) % count);

  if (!count) {
    return <div className="aspect-[4/5] w-full rounded-2xl bg-linen" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-linen"
        onTouchStart={(e) => {
          touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          const start = touch.current;
          touch.current = null;
          if (!start || count < 2) return;
          const dx = e.changedTouches[0].clientX - start.x;
          const dy = e.changedTouches[0].clientY - start.y;
          // horizontal intent only — don't hijack vertical page scrolling
          if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
            goTo(active + (dx < 0 ? 1 : -1));
          }
        }}
      >
        <Image
          key={current.id}
          src={current.src}
          alt={current.alt || title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="animate-fade-in object-cover transition-transform duration-500 group-hover:scale-[1.6]"
          style={{
            transformOrigin: "var(--zoom-x, 50%) var(--zoom-y, 50%)",
            ...focalPosition(current.focalX, current.focalY),
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--zoom-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
            e.currentTarget.style.setProperty("--zoom-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
          }}
        />
        {count > 1 && (
          <>
            <button
              onClick={() => goTo(active - 1)}
              aria-label="Previous image"
              className="absolute top-1/2 left-1.5 z-10 hidden -translate-y-1/2 p-2 text-ivory drop-shadow-[0_1px_8px_rgba(41,33,26,0.75)] transition-transform hover:scale-110 md:block"
            >
              <ChevronLeft className="h-7 w-7" />
            </button>
            <button
              onClick={() => goTo(active + 1)}
              aria-label="Next image"
              className="absolute top-1/2 right-1.5 z-10 hidden -translate-y-1/2 p-2 text-ivory drop-shadow-[0_1px_8px_rgba(41,33,26,0.75)] transition-transform hover:scale-110 md:block"
            >
              <ChevronRight className="h-7 w-7" />
            </button>
            <div className="absolute right-3 bottom-3 rounded-full bg-ink/60 px-2.5 py-1 text-[0.7rem] text-ivory">
              {active + 1} / {count}
            </div>
          </>
        )}
      </div>
      {count > 1 && (
        <div className="scrollbar-none flex gap-2.5 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                "relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                i === active ? "border-walnut" : "border-transparent hover:border-line"
              )}
            >
              <Image
                src={img.src}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
                style={focalPosition(img.focalX, img.focalY)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
