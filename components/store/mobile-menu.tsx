"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import type { NavData, NavLink } from "./nav-data";
import { ABOUT_LINKS } from "./nav-data";
import { THEME_IMAGES } from "@/lib/content-constants";
import { cn } from "@/lib/utils";

function Section({ label, links }: { label: string; links: NavLink[] }) {
  if (!links.length) return null;
  return (
    <details className="group border-b border-line">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[0.95rem] font-medium text-ink select-none [&::-webkit-details-marker]:hidden">
        {label}
        {/* -m/p: grow the chevron's touch area without shifting the layout */}
        <ChevronDown className="-m-2 box-content h-4 w-4 p-2 text-umber transition-transform group-open:rotate-180" />
      </summary>
      <ul className="pb-3 pl-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="block py-2 text-sm text-bark hover:text-walnut">
              {l.title}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function MobileMenu({ nav }: { nav: NavData }) {
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
  const drawer = (
    <div
      className={cn(
        "fixed inset-0 z-[80] transition-opacity md:hidden",
        open ? "opacity-100" : "pointer-events-none opacity-0"
      )}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <div className="absolute inset-0 bg-ink/45" onClick={() => setOpen(false)} aria-hidden />
      <div
        className={cn(
          "absolute inset-y-0 left-0 flex w-[85vw] max-w-sm flex-col bg-ivory shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <Image
            src={THEME_IMAGES.logo}
            alt="Willow Weave"
            width={44}
            height={44}
            className="h-11 w-11 object-contain"
          />
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-full p-2.5 text-bark hover:bg-linen"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-5 pb-8" aria-label="Mobile">
          <Link
            href="/products"
            className="block border-b border-line py-4 text-[0.95rem] font-medium text-ink"
          >
            Shop All Products
          </Link>
          <Section label="Volumes" links={nav.volumes} />
          <Section label="Occasions" links={nav.occasions} />
          <Section label="Shop by Piece" links={nav.pieces} />
          <Section label="Fabrics" links={nav.fabrics} />
          <Link
            href="/collections"
            className="block border-b border-line py-4 text-[0.95rem] font-medium text-ink"
          >
            All Collections
          </Link>
          <Link
            href="/size-guide"
            className="block border-b border-line py-4 text-[0.95rem] font-medium text-ink"
          >
            Size Guide
          </Link>
          <Section label="About" links={ABOUT_LINKS} />
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
