import Image from "next/image";
import Link from "next/link";
import type { NavData, NavLink } from "./nav-data";
import { ABOUT_LINKS } from "./nav-data";
import { THEME_IMAGES } from "@/lib/content";
import { DesktopDropdown } from "./desktop-dropdown";
import { HeaderActions } from "./header-actions";
import { MobileMenu } from "./mobile-menu";

function LinkColumn({ heading, links }: { heading: string; links: NavLink[] }) {
  if (!links.length) return null;
  return (
    <div className="min-w-36">
      <p className="mb-2.5 text-[0.72rem] font-semibold tracking-[0.14em] text-umber uppercase">
        {heading}
      </p>
      <ul className="space-y-1.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="block text-[0.9375rem] whitespace-nowrap text-bark transition-colors hover:text-walnut hover:underline hover:underline-offset-4"
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
    // The bar's frost lives on a ::before layer, NOT on <header> itself:
    // backdrop-filter is disabled on any element whose ancestor also has
    // one, so blur directly on the header would kill the dropdown shelves'
    // matching frost. As siblings, both layers blur the page behind them.
    <header className="sticky top-0 z-50 border-b border-line/50 before:absolute before:inset-0 before:-z-10 before:bg-ivory/75 before:backdrop-blur-md before:content-['']">
      {/* h-16 / md:h-20, up from h-14 / md:h-16, to carry the larger mark and
          the bumped nav type. The hero and the collection banner pull
          themselves up by exactly this much to sit under the translucent
          bar — if this changes, `-mt-16 md:-mt-20` there has to change with
          it or a strip of page background appears above the image. */}
      <div className="container-site flex h-16 items-center justify-between gap-3 md:h-20">
        {/* mobile menu */}
        <div className="flex flex-1 items-center md:hidden">
          <MobileMenu nav={nav} />
        </div>

        {/* brand — logo only, the mark carries the name */}
        <Link
          href="/"
          className="flex shrink-0 items-center"
          aria-label="Willow Weave — home"
        >
          <Image
            src={THEME_IMAGES.logo}
            alt="Willow Weave"
            width={80}
            height={80}
            className="logo-shadow h-16 w-16 object-contain md:h-20 md:w-20"
            priority
          />
        </Link>

        {/* desktop nav — self-stretch so dropdown shelves anchor to the bar's
            bottom edge and hover stays unbroken from trigger to panel */}
        <nav className="hidden flex-1 items-center justify-center self-stretch md:flex" aria-label="Main">
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
            {/* max-content tracks: fr-based columns collapse inside this
                shrink-to-fit absolute panel and the nowrap labels overlap */}
            <div className="grid grid-cols-[repeat(2,max-content)] gap-x-10 gap-y-1.5">
              {nav.fabrics.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-[0.9375rem] whitespace-nowrap text-bark transition-colors hover:text-walnut hover:underline hover:underline-offset-4"
                >
                  {l.title}
                </Link>
              ))}
            </div>
          </DesktopDropdown>
          <Link
            href="/products"
            className="heading-display px-3.5 py-2 text-[1.0625rem] font-medium text-bark transition-colors hover:text-walnut"
          >
            Shop All
          </Link>
          <Link
            href="/size-guide"
            className="heading-display px-3.5 py-2 text-[1.0625rem] font-medium text-bark transition-colors hover:text-walnut"
          >
            Size Guide
          </Link>
          <DesktopDropdown label="About">
            <ul className="space-y-1.5">
              {ABOUT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="block text-[0.9375rem] whitespace-nowrap text-bark transition-colors hover:text-walnut hover:underline hover:underline-offset-4"
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
