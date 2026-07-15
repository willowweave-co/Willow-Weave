"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Loader2, ArrowRight, Package, Layers, FileText } from "lucide-react";
import type { SearchResult } from "@/lib/types";
import { formatPKR } from "@/lib/money";
import { cn } from "@/lib/utils";
import { OPEN_SEARCH_EVENT } from "./search-events";

const TYPE_META = {
  product: { label: "Products", icon: Package },
  collection: { label: "Collections", icon: Layers },
  page: { label: "Pages & Guides", icon: FileText },
} as const;

export function SearchCommand() {
  const [open, setOpen] = useState(false);
  // stays true through the 200ms exit animation, then the overlay unmounts
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // open triggers: header button event + ⌘K / Ctrl+K
  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setTimeout(() => inputRef.current?.focus(), 30);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      setQuery("");
      setResults([]);
      setActive(0);
      // let the fade-out play before unmounting
      const t = setTimeout(() => setVisible(false), 200);
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // debounced fetch
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        const data = (await res.json()) as { results: SearchResult[] };
        setResults(data.results);
        setActive(0);
      } catch {
        /* aborted or offline */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 160);
    return () => clearTimeout(t);
  }, [query, open]);

  const grouped = useMemo(() => {
    const groups: { type: keyof typeof TYPE_META; items: { r: SearchResult; index: number }[] }[] = [];
    results.forEach((r, index) => {
      let g = groups.find((x) => x.type === r.type);
      if (!g) {
        g = { type: r.type, items: [] };
        groups.push(g);
      }
      g.items.push({ r, index });
    });
    return groups;
  }, [results]);

  const go = useCallback(
    (url: string) => {
      setOpen(false);
      router.push(url as Parameters<typeof router.push>[0]);
    },
    [router]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[active];
      if (target) go(target.url);
      else if (query.trim()) go(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  if (!visible) return null;
  const closing = !open;

  return (
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label="Search">
      <div
        className={cn(
          "absolute inset-0 bg-ink/50 backdrop-blur-[2px]",
          closing ? "animate-fade-out" : "animate-fade-in"
        )}
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div
        className={cn(
          "absolute top-[10vh] left-1/2 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2",
          closing ? "animate-fade-down" : "animate-fade-up"
        )}
      >
        <div className="overflow-hidden rounded-2xl border border-line bg-ivory shadow-2xl">
          <div className="flex items-center gap-3 border-b border-line px-4">
            {loading ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin text-umber" />
            ) : (
              <Search className="h-4.5 w-4.5 text-umber" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search suits, fabrics, collections, size guide…"
              className="h-13 w-full bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-umber/50"
              aria-label="Search query"
            />
            <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[0.65rem] text-umber sm:block">
              ESC
            </kbd>
          </div>

          <div className="max-h-[55vh] overflow-y-auto overscroll-contain">
            {query.trim().length < 2 ? (
              <p className="px-5 py-8 text-center text-sm text-umber">
                Type to search the entire store — products, fabrics, collections, policies, size
                charts…
              </p>
            ) : results.length === 0 && !loading ? (
              <p className="px-5 py-8 text-center text-sm text-umber">
                Nothing found for “{query}”. Try a fabric like <em>chiffon</em>, or{" "}
                <em>3-piece</em>.
              </p>
            ) : (
              grouped.map((group) => {
                const Meta = TYPE_META[group.type];
                return (
                  <div key={group.type} className="px-2 py-2">
                    <p className="flex items-center gap-1.5 px-3 pt-1 pb-1.5 text-[0.65rem] font-semibold tracking-[0.14em] text-umber uppercase">
                      <Meta.icon className="h-3 w-3" />
                      {Meta.label}
                    </p>
                    {group.items.map(({ r, index }) => (
                      <button
                        key={r.url + index}
                        onClick={() => go(r.url)}
                        onMouseEnter={() => setActive(index)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                          index === active ? "bg-linen" : "hover:bg-linen/60"
                        )}
                      >
                        {r.image ? (
                          <Image
                            src={r.image}
                            alt=""
                            width={40}
                            height={50}
                            className="h-12 w-10 shrink-0 rounded-md object-cover"
                          />
                        ) : (
                          <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-md bg-parchment">
                            <Meta.icon className="h-4 w-4 text-umber" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">
                            {r.title}
                          </span>
                          {r.subtitle && (
                            <span className="block truncate text-xs text-umber">{r.subtitle}</span>
                          )}
                        </span>
                        {r.price != null && (
                          <span className="shrink-0 text-sm font-semibold text-walnut">
                            {formatPKR(r.price)}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                );
              })
            )}
          </div>

          {query.trim().length >= 2 && (
            <button
              onClick={() => go(`/search?q=${encodeURIComponent(query.trim())}`)}
              className="flex w-full items-center justify-center gap-2 border-t border-line px-4 py-3 text-sm font-medium text-walnut transition-colors hover:bg-linen/60"
            >
              View all results <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
