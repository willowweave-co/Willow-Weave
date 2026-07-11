import { cn } from "@/lib/utils";

/**
 * Melts the bottom edge of a full-bleed banner into the ivory page:
 * five masked backdrop-blur layers ramp from 1px to 14px (they stack —
 * each blurs the layers painted beneath it, approximating a progressive
 * blur) under a colour fade with soft custom stops.
 *
 * The parent must be `relative overflow-hidden`; keep interactive content
 * above z-10. The gradient hardcodes --color-ivory (#faf6ef) because
 * arbitrary gradient stops can't reference theme tokens.
 */
export function BottomMelt({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-10 h-40 md:h-48",
        className
      )}
    >
      <div className="absolute inset-x-0 bottom-0 h-full backdrop-blur-[1px] [mask-image:linear-gradient(to_bottom,transparent,black_40%)]" />
      <div className="absolute inset-x-0 bottom-0 h-4/5 backdrop-blur-[2px] [mask-image:linear-gradient(to_bottom,transparent,black_45%)]" />
      <div className="absolute inset-x-0 bottom-0 h-3/5 backdrop-blur-[4px] [mask-image:linear-gradient(to_bottom,transparent,black_55%)]" />
      <div className="absolute inset-x-0 bottom-0 h-2/5 backdrop-blur-[8px] [mask-image:linear-gradient(to_bottom,transparent,black_65%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/4 backdrop-blur-[14px] [mask-image:linear-gradient(to_bottom,transparent,black_75%)]" />
      <div className="absolute inset-x-0 bottom-0 h-full bg-[linear-gradient(to_bottom,transparent_0%,rgba(250,246,239,0.5)_55%,#faf6ef_90%)]" />
    </div>
  );
}
