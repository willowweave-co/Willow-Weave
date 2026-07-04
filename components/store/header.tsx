import Image from "next/image";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { NavData, NavLink } from "./nav-data";
import { ABOUT_LINKS } from "./nav-data";
import { THEME_IMAGES } from "@/lib/content";
import { HeaderActions } from "./header-actions";
import { MobileMenu } from "./mobile-menu";

function DesktopDropdown({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group relative">
      <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium tracking-wide text-bark transition-colors hover:text-walnut">
        {label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
      </button>
      <div className="invisible absolute top-full left-1/2 z-50 -translate-x-1/2 pt-2 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="rounded-2xl border border-line bg-ivory p-5 shadow-xl shadow-ink/10">
          {children}
        </div>
      </div>
    </div>
  );
}

function LinkColumn({ heading, links }: { heading: string; links: NavLink[] }) {
  if (!links.length) return null;
  return (
    <div className="min-w-36">
      <p className="mb-2.5 text-[0.68rem] font-semibold tracking-[0.14em] text-umber uppercase">
        {heading}
      </p>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block text-sm whitespace-nowrap text-bark transition-colors hover:text-walnut hover:underline hover:underline-offset-4"
            >
              {l.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Header({ nav }: { nav: NavData }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ivory/90 backdrop-blur-md">
      <div className="container-site flex h-16 items-center justify-between gap-3 md:h-[4.5rem]">
        {/* mobile menu */}
        <div className="flex flex-1 items-center md:hidden">
          <MobileMenu nav={nav} />
        </div>

        {/* brand */}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5"
          aria-label="Willow Weave — home"
        >
          <Image
            src={THEME_IMAGES.logo}
            alt=""
            width={44}
            height={44}
            className="h-10 w-10 object-contain md:h-11 md:w-11"
            priority
          />
          <span className="heading-display text-xl leading-none font-semibold tracking-tight text-ink md:text-[1.35rem]">
            Willow Weave
          </span>
        </Link>

        {/* desktop nav */}
        <nav className="hidden flex-1 items-center justify-center md:flex" aria-label="Main">
          <DesktopDropdown label="Collections">
            <div className="flex gap-8">
              <LinkColumn heading="Volumes" links={nav.volumes} />
              <LinkColumn heading="Occasions" links={nav.occasions} />
              <LinkColumn
                heading="Shop by Piece"
                links={[...nav.pieces, { title: "All Products", href: "/products" }]}
              />
            </div>
          </DesktopDropdown>
          <DesktopDropdown label="Fabrics">
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
              {nav.fabrics.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-sm whitespace-nowrap text-bark transition-colors hover:text-walnut hover:underline hover:underline-offset-4"
                >
                  {l.title}
                </Link>
              ))}
            </div>
          </DesktopDropdown>
          <Link
            href="/products"
            className="px-3 py-2 text-sm font-medium tracking-wide text-bark transition-colors hover:text-walnut"
          >
            Shop All
          </Link>
          <Link
            href="/size-guide"
            className="px-3 py-2 text-sm font-medium tracking-wide text-bark transition-colors hover:text-walnut"
          >
            Size Guide
          </Link>
          <DesktopDropdown label="About">
            <ul className="space-y-1.5">
              {ABOUT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block text-sm whitespace-nowrap text-bark transition-colors hover:text-walnut hover:underline hover:underline-offset-4"
                  >
                    {l.title}
                  </Link>
                </li>
              ))}
            </ul>
          </DesktopDropdown>
        </nav>

        {/* actions */}
        <div className="flex flex-1 items-center justify-end md:flex-none">
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}
