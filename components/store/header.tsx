import Image from "next/image";
import Link from "next/link";
import type { NavConfig, NavColumn, NavItem } from "./nav-data";
import { isDropdown } from "./nav-data";
import { THEME_IMAGES } from "@/lib/content";
import { DesktopDropdown } from "./desktop-dropdown";
import { HeaderActions } from "./header-actions";
import { MobileMenu } from "./mobile-menu";

const LINK_CLASS =
  "block text-base whitespace-nowrap text-bark transition-colors hover:text-walnut hover:underline hover:underline-offset-4";

function LinkColumn({ column }: { column: NavColumn }) {
  if (!column.links.length) return null;
  return (
    <div className="min-w-36">
      {column.heading && (
        <p className="mb-2.5 text-[0.78rem] font-semibold tracking-[0.14em] text-umber uppercase">
          {column.heading}
        </p>
      )}
      <ul className="space-y-1.5">
        {column.links.map((l) => (
          <li key={l.id}>
            <Link href={l.href as never} className={LINK_CLASS}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * The three panel shapes the header has always used, kept as an explicit
 * choice on the item rather than inferred from its contents — "one column, no
 * heading" is ambiguous between the Fabrics grid and the About list, and
 * guessing would silently restyle one of them whenever the owner edits.
 */
function DropdownPanel({ item }: { item: NavItem }) {
  const columns = item.columns ?? [];
  if (item.layout === "grid") {
    return (
      // max-content tracks: fr-based columns collapse inside this
      // shrink-to-fit absolute panel and the nowrap labels overlap
      <div className="grid grid-cols-[repeat(2,max-content)] gap-x-10 gap-y-1.5">
        {columns.flatMap((c) => c.links).map((l) => (
          <Link key={l.id} href={l.href as never} className={LINK_CLASS}>
            {l.label}
          </Link>
        ))}
      </div>
    );
  }
  if (item.layout === "list") {
    return (
      <ul className="space-y-1.5">
        {columns.flatMap((c) => c.links).map((l) => (
          <li key={l.id}>
            <Link href={l.href as never} className={LINK_CLASS}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="flex gap-8">
      {columns.map((c) => (
        <LinkColumn key={c.id} column={c} />
      ))}
    </div>
  );
}

export function Header({ nav }: { nav: NavConfig }) {
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
          {/* p-1.5/p-2: logo-mark.png is cropped tight to the artwork, so at
              the full box height the leaves ran right into the header's top
              and bottom edges. The padding is inside the box, so the bar's
              height is unchanged — the mark just breathes, and the lifted
              shadow has somewhere to fall. */}
          <Image
            src={THEME_IMAGES.logo}
            alt="Willow Weave"
            width={80}
            height={80}
            className="logo-shadow h-16 w-16 p-1.5 object-contain md:h-20 md:w-20 md:p-2"
            priority
          />
        </Link>

        {/* desktop nav — self-stretch so dropdown shelves anchor to the bar's
            bottom edge and hover stays unbroken from trigger to panel */}
        <nav className="hidden flex-1 items-center justify-center self-stretch md:flex" aria-label="Main">
          {nav.map((item) =>
            isDropdown(item) ? (
              <DesktopDropdown key={item.id} label={item.label}>
                <DropdownPanel item={item} />
              </DesktopDropdown>
            ) : (
              <Link
                key={item.id}
                href={(item.href ?? "/") as never}
                className="heading-display px-3.5 py-2 text-[1.125rem] font-medium text-bark transition-colors hover:text-walnut"
              >
                {item.label}
              </Link>
            )
          )}
        </nav>

        {/* actions */}
        <div className="flex flex-1 items-center justify-end md:flex-none">
          <HeaderActions />
        </div>
      </div>
    </header>
  );
}
