"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import type { NavChild, NavConfig } from "./nav-data";
import { isDropdown } from "./nav-data";
import { THEME_IMAGES } from "@/lib/content-constants";
import { cn } from "@/lib/utils";

function Section({ label, links }: { label: string; links: NavChild[] }) {
  if (!links.length) return null;
  return (
    // details-animated: the header's desktop shelves animate open, but these
    // snapped. Same disclosure, same expectation.
    <details className="details-animated group border-b border-line">
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between py-4 text-[0.95rem] font-medium text-ink select-none [&::-webkit-details-marker]:hidden">
        {label}
        {/* -m/p: grow the chevron's touch area without shifting the layout */}
        <ChevronDown className="-m-2 box-content h-4 w-4 p-2 text-umber transition-transform group-open:rotate-180" />
      </summary>
      <ul className="pb-3 pl-2">
        {links.map((l) => (
          <li key={l.id}>
            <Link href={l.href as never} className="block py-2 text-sm text-bark hover:text-walnut">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function MobileMenu({ nav }: { nav: NavConfig }) {
  const [open, setOpen] = useState(false);
  // Portal only after mount so server and first client render agree.
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // The drawer MUST be portaled to <body>: the sticky header uses
  // backdrop-blur, and a filter on an ancestor turns it into the containing
  // block for position:fixed — trapping the overlay inside the 64px header.
  // Backdrop and panel share one 300ms clock (opacity on the backdrop itself,
  // not the wrapper) so opening and closing are exact mirrors — previously the
  // wrapper faded at the default 150ms while the panel slid at 300ms, making
  // the close read as a different, abrupt animation.
  const drawer = (
    <div
      className={cn("fixed inset-0 z-[80] md:hidden", open ? "" : "pointer-events-none")}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <div
        className={cn(
          "absolute inset-0 bg-ink/45 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        className={cn(
          "absolute inset-y-0 left-0 flex w-[85vw] max-w-sm flex-col bg-ivory shadow-2xl transition-transform duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          {/* h-16 to match the header's mark on a phone — at h-11 it read as
              a different, smaller brand than the one just behind the drawer */}
          <Image
            src={THEME_IMAGES.logo}
            alt="Willow Weave"
            width={64}
            height={64}
            className="logo-shadow h-16 w-16 p-1.5 object-contain"
          />
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="focus-ring tap-44 rounded-full p-2.5 text-bark hover:bg-linen"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        {/* Same menu as the desktop bar, flattened one level: a dropdown with
            headed columns becomes one collapsible section per column (so
            "Volumes" and "Occasions" stay top-level here, as they always
            have), while a single unheaded column collapses under the item's
            own label. */}
        <nav className="flex-1 overflow-y-auto px-5 pb-8" aria-label="Mobile">
          {nav.map((item) => {
            if (!isDropdown(item)) {
              return (
                <Link
                  key={item.id}
                  href={(item.href ?? "/") as never}
                  className="block border-b border-line py-4 text-[0.95rem] font-medium text-ink"
                >
                  {item.label}
                </Link>
              );
            }
            const columns = item.columns ?? [];
            const headed = columns.filter((c) => c.heading);
            if (headed.length) {
              return columns.map((c) => (
                <Section key={c.id} label={c.heading || item.label} links={c.links} />
              ));
            }
            return (
              <Section
                key={item.id}
                label={item.label}
                links={columns.flatMap((c) => c.links)}
              />
            );
          })}
        </nav>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="rounded-full p-2.5 text-bark hover:bg-linen"
      >
        <Menu className="h-6 w-6" />
      </button>
      {mounted && createPortal(drawer, document.body)}
    </>
  );
}
