import { cn } from "@/lib/utils";

/** --color-ivory, as r,g,b — arbitrary gradient stops can't use theme tokens */
const IVORY = "250,246,239";

/**
 * Each band applies one blur strength, masked as a trapezoid that overlaps
 * its neighbours: a band fades in while the previous one fades out, so the
 * hand-off between blur levels crossfades instead of leaving a seam. Bands
 * paint in order, and each backdrop-filter also samples the layers below
 * it, compounding into a smooth sharp→soft ramp.
 */
const BLUR_BANDS = [
  { blur: 1, mask: "linear-gradient(to bottom,transparent 5%,black 30%,black 42%,transparent 58%)" },
  { blur: 2, mask: "linear-gradient(to bottom,transparent 30%,black 45%,black 57%,transparent 72%)" },
  { blur: 4, mask: "linear-gradient(to bottom,transparent 45%,black 60%,black 72%,transparent 86%)" },
  { blur: 8, mask: "linear-gradient(to bottom,transparent 60%,black 75%,black 88%,transparent 100%)" },
  { blur: 14, mask: "linear-gradient(to bottom,transparent 75%,black 92%)" },
];

/**
 * Eased (smoothstep-like) opacity ramp. A plain two/three-stop gradient has
 * abrupt slope changes at its endpoints that the eye picks out as horizontal
 * lines (Mach bands); many gently-curved stops hide both edges. The last
 * stop is fully opaque ivory exactly at the container's bottom edge, so the
 * melt ends indistinguishably in the page background.
 */
const FADE = `linear-gradient(to bottom,rgba(${IVORY},0) 0%,rgba(${IVORY},0.03) 18%,rgba(${IVORY},0.12) 34%,rgba(${IVORY},0.3) 50%,rgba(${IVORY},0.55) 64%,rgba(${IVORY},0.78) 77%,rgba(${IVORY},0.93) 88%,rgb(${IVORY}) 100%)`;

/**
 * Melts the bottom edge of a full-bleed banner into the ivory page.
 * The parent must be `relative overflow-hidden`; keep interactive content
 * above z-10. Override the height via className for shorter banners —
 * all layers are percentage-based and scale with it.
 */
export function BottomMelt({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-48 md:h-60",
        className
      )}
    >
      {BLUR_BANDS.map((b) => (
        <div
          key={b.blur}
          className="absolute inset-0"
          style={{
            backdropFilter: `blur(${b.blur}px)`,
            WebkitBackdropFilter: `blur(${b.blur}px)`,
            maskImage: b.mask,
            WebkitMaskImage: b.mask,
          }}
        />
      ))}
      <div className="absolute inset-0" style={{ backgroundImage: FADE }} />
    </div>
  );
}
