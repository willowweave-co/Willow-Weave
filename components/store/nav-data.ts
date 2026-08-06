import type { Collection, NavChild, NavColumn, NavConfig, NavItem } from "@/lib/types";

export type { NavChild, NavColumn, NavConfig, NavItem };

export interface NavLink {
  title: string;
  href: string;
}

export const ABOUT_LINKS: NavLink[] = [
  { title: "About Us", href: "/about" },
  { title: "Philosophy Behind Logo", href: "/philosophy" },
  { title: "Contact", href: "/contact" },
];

// Ids are derived from the href/key rather than generated: a saved menu then
// keeps lining up with a freshly-seeded default, and React keys don't churn
// every time the collection list changes.
const child = (label: string, href: string): NavChild => ({ id: `l:${href}`, label, href });

const column = (key: string, heading: string, links: NavChild[]): NavColumn => ({
  id: `c:${key}`,
  heading,
  links,
});

/**
 * The navigation as it stood before it became editable — dropdown groups
 * filled straight from the published collections. This is both the seed the
 * dashboard editor starts from and the fallback when no custom menu is saved.
 */
export function defaultNavConfig(collections: Collection[]): NavConfig {
  const byGroup = (g: Collection["group"]) =>
    collections
      .filter((c) => c.group === g && c.published)
      .map((c) => child(c.title, `/collections/${c.handle}`));

  return [
    {
      id: "n:collections",
      label: "Collections",
      layout: "columns",
      columns: [
        column("volumes", "Volumes", byGroup("volumes")),
        column("occasions", "Occasions", byGroup("occasions")),
        // "All Collections" used to be a mobile-drawer-only link; folding it in
        // here keeps it reachable from both without adding a sixth item to the
        // desktop bar.
        column("pieces", "Shop by Piece", [
          ...byGroup("pieces"),
          child("All Products", "/products"),
          child("All Collections", "/collections"),
        ]),
      ],
    },
    {
      id: "n:fabrics",
      label: "Fabrics",
      layout: "grid",
      columns: [column("fabrics", "", byGroup("fabrics"))],
    },
    { id: "n:shop-all", label: "Shop All", href: "/products" },
    { id: "n:size-guide", label: "Size Guide", href: "/size-guide" },
    {
      id: "n:about",
      label: "About",
      layout: "list",
      columns: [column("about", "", ABOUT_LINKS.map((l) => child(l.title, l.href)))],
    },
  ];
}

/**
 * What the header and mobile drawer actually render: the owner's saved menu if
 * there is one, otherwise the automatic default. Hidden entries are dropped
 * here so no consumer has to remember to filter, and a dropdown left with
 * nothing to show is dropped too — an empty panel is worse than no panel.
 */
export function resolveNav(collections: Collection[], saved: NavConfig | null): NavConfig {
  const source = saved?.length ? saved : defaultNavConfig(collections);
  return source
    .filter((item) => !item.hidden)
    .map((item) => ({
      ...item,
      columns: item.columns
        ?.map((col) => ({ ...col, links: col.links.filter((l) => !l.hidden) }))
        .filter((col) => col.links.length > 0),
    }))
    .filter((item) => !!item.href || (item.columns?.length ?? 0) > 0);
}

/** True when the item renders as a dropdown rather than a plain link. */
export function isDropdown(item: NavItem): boolean {
  return !item.href && (item.columns?.length ?? 0) > 0;
}
