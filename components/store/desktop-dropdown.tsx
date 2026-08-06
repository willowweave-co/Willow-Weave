"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Nav dropdown, state-driven rather than CSS :hover/:focus-within — the CSS
 * version outlived client-side navigations (the clicked link kept focus, so
 * the panel sat on top of the new page until the user clicked elsewhere).
 * Closes on link click, on mouse-out, on route change and on focus leaving.
 * Styled as a translucent shelf expanding straight out of the header bar.
 */
export function DesktopDropdown({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div
      // h-full + relative: the panel anchors to the header's bottom edge,
      // and the full-height wrapper keeps hover unbroken from button to panel
      className="relative flex h-full items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="heading-display flex items-center gap-1.5 px-3.5 py-2 text-[1.125rem] font-medium text-bark transition-colors hover:text-walnut"
      >
        {label}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "absolute top-full left-1/2 z-50 origin-top -translate-x-1/2 transition-all duration-200",
          open ? "visible scale-y-100 opacity-100" : "invisible scale-y-95 opacity-0"
        )}
        onClick={() => setOpen(false)}
      >
        <div className="rounded-b-2xl border-x border-b border-line/50 bg-ivory/75 p-5 shadow-xl shadow-ink/10 backdrop-blur-md">
          {children}
        </div>
      </div>
    </div>
  );
}
