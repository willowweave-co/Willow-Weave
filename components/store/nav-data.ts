import type { Collection } from "@/lib/types";

export interface NavLink {
  title: string;
  href: string;
}

export interface NavData {
  volumes: NavLink[];
  occasions: NavLink[];
  pieces: NavLink[];
  fabrics: NavLink[];
}

export function buildNav(collections: Collection[]): NavData {
  const link = (c: Collection): NavLink => ({ title: c.title, href: `/collections/${c.handle}` });
  const byGroup = (g: Collection["group"]) =>
    collections.filter((c) => c.group === g && c.published).map(link);
  return {
    volumes: byGroup("volumes"),
    occasions: byGroup("occasions"),
    pieces: byGroup("pieces"),
    fabrics: byGroup("fabrics"),
  };
}

export const ABOUT_LINKS: NavLink[] = [
  { title: "About Us", href: "/about" },
  { title: "Philosophy Behind Logo", href: "/philosophy" },
  { title: "Contact", href: "/contact" },
];
