"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Shirt,
  Boxes,
  Layers,
  Images,
  FileText,
  GalleryHorizontalEnd,
  TicketPercent,
  Ruler,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const LINKS = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/products", label: "Products", icon: Shirt },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/collections", label: "Collections", icon: Layers },
  { href: "/admin/library", label: "Library", icon: Images },
  { href: "/admin/homepage", label: "Homepage", icon: GalleryHorizontalEnd },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/discounts", label: "Discounts", icon: TicketPercent },
  { href: "/admin/size-charts", label: "Size Charts", icon: Ruler },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3" aria-label="Admin">
      {LINKS.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href as never}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-walnut font-medium text-ivory"
                : "text-bark hover:bg-linen hover:text-ink"
            )}
          >
            <l.icon className="h-4 w-4 shrink-0" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminNav({ mobile }: { role: "owner" | "staff"; mobile?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mobile) return <NavLinks />;

  // Portaled to <body>: the admin top bar uses backdrop-blur, which would
  // otherwise trap this fixed overlay inside the bar (containing-block rule).
  const drawer = (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Admin menu">
      <div className="absolute inset-0 bg-ink/45" onClick={() => setOpen(false)} aria-hidden />
      <div className="absolute inset-y-0 right-0 flex w-72 flex-col bg-ivory shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <span className="heading-display font-semibold">Dashboard</span>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="rounded-full p-1.5 text-bark hover:bg-linen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavLinks onNavigate={() => setOpen(false)} />
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open admin menu"
        className="rounded-full p-2 text-bark hover:bg-linen"
      >
        <Menu className="h-5 w-5" />
      </button>
      {mounted && open && createPortal(drawer, document.body)}
    </>
  );
}

export function AdminSignOut() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await createSupabaseBrowser().auth.signOut();
        router.push("/admin/login");
        router.refresh();
      }}
      className="flex items-center gap-1 text-xs text-umber transition-colors hover:text-madder"
    >
      <LogOut className="h-3 w-3" /> Sign out
    </button>
  );
}
