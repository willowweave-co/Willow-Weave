"use client";

import { useState } from "react";
import Image from "next/image";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, title }: { images: ProductImage[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  if (!images.length) {
    return <div className="aspect-[4/5] w-full rounded-2xl bg-linen" />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-linen">
        <Image
          key={current.id}
          src={current.src}
          alt={current.alt || title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="animate-fade-in object-cover transition-transform duration-500 group-hover:scale-[1.6]"
          style={{ transformOrigin: "var(--zoom-x, 50%) var(--zoom-y, 50%)" }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            e.currentTarget.style.setProperty("--zoom-x", `${((e.clientX - rect.left) / rect.width) * 100}%`);
            e.currentTarget.style.setProperty("--zoom-y", `${((e.clientY - rect.top) / rect.height) * 100}%`);
          }}
        />
        {images.length > 1 && (
          <div className="absolute right-3 bottom-3 rounded-full bg-ink/60 px-2.5 py-1 text-[0.7rem] text-ivory">
            {active + 1} / {images.length}
          </div>
        )}
      </div>
      {images.length > 1 && (
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
              <Image src={img.src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
