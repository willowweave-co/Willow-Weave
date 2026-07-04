"use client";

import { Search } from "lucide-react";
import { OPEN_SEARCH_EVENT } from "@/components/store/search-events";

/**
 * The homepage's prominent search entry — opens the site-wide command
 * palette (products, collections, pages, size charts, policies).
 */
export function HomeSearch() {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT))}
      className="group mx-auto flex w-full max-w-2xl items-center gap-3 rounded-full border border-line bg-white/80 px-5 py-4 text-left shadow-sm transition-all hover:border-walnut/40 hover:shadow-md"
      aria-label="Search the store"
    >
      <Search className="h-5 w-5 shrink-0 text-umber transition-colors group-hover:text-walnut" />
      <span className="flex-1 truncate text-[0.95rem] text-umber/70">
        Search anything — “chiffon”, “3-piece”, “size chart”, “Eid”…
      </span>
      <kbd className="hidden shrink-0 rounded-md border border-line bg-parchment px-2 py-1 text-[0.7rem] font-medium text-umber sm:block">
        Ctrl K
      </kbd>
    </button>
  );
}
