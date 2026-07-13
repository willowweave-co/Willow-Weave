import Link from "next/link";
import { FileText, ChevronRight } from "lucide-react";
import { repo } from "@/lib/data";
import { EDITABLE_PAGES } from "@/lib/site-pages";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Pages" };

export default async function AdminPagesPage() {
  const overrides = await repo.getSitePages();

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="heading-display text-2xl font-semibold text-ink">Pages</h1>
        <p className="mt-1 text-sm text-umber">
          The store&rsquo;s written pages — about, policies and the contact intro. Edits go live
          as soon as you save; pages you haven&rsquo;t touched keep their original copy.
        </p>
      </header>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white/60">
        {EDITABLE_PAGES.map((p) => (
          <li key={p.handle}>
            <Link
              href={`/admin/pages/${p.handle}` as never}
              className="flex items-center gap-3.5 px-5 py-4 transition-colors hover:bg-linen/50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-walnut/10">
                <FileText className="h-4.5 w-4.5 text-walnut" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-ink">{p.label}</span>
                <span className="block text-xs text-umber">{p.path}</span>
              </span>
              {overrides[p.handle] && <Badge tone="success">Edited</Badge>}
              <ChevronRight className="h-4 w-4 shrink-0 text-umber/60" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
