"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Trash2 } from "lucide-react";
import type { Collection, CollectionGroup } from "@/lib/types";
import { saveCollectionAction, deleteCollectionAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, Checkbox } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { slugify, cn } from "@/lib/utils";

interface ProductOption {
  id: string;
  title: string;
  image: string | null;
}

export function CollectionForm({
  initial,
  isNew,
  products,
}: {
  initial: Collection;
  isNew: boolean;
  products: ProductOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial.title);
  const [handle, setHandle] = useState(initial.handle);
  const [handleTouched, setHandleTouched] = useState(!isNew);
  const [description, setDescription] = useState(initial.descriptionHtml);
  const [image, setImage] = useState(initial.image ?? "");
  const [group, setGroup] = useState<CollectionGroup>(initial.group);
  const [featured, setFeatured] = useState(initial.featured);
  const [published, setPublished] = useState(initial.published);
  const [productIds, setProductIds] = useState<string[]>(initial.productIds);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredProducts = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const selected = new Set(productIds);
    return [...products].sort((a, b) => {
      const sa = selected.has(a.id) ? 0 : 1;
      const sb = selected.has(b.id) ? 0 : 1;
      return sa - sb || a.title.localeCompare(b.title);
    }).filter((p) => !q || p.title.toLowerCase().includes(q));
  }, [products, productIds, filter]);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveCollectionAction({
        ...initial,
        title,
        handle: handle || slugify(title),
        descriptionHtml: description,
        image: image.trim() || null,
        group,
        featured,
        published,
        productIds,
      });
      if (res.ok) {
        toast(isNew ? "Collection created." : "Collection saved.");
        router.push("/admin/collections");
        router.refresh();
      } else {
        setError(res.error ?? "Couldn't save.");
      }
    });
  };

  const remove = () => {
    if (!confirm(`Delete “${title}”? Products stay — only the grouping is removed.`)) return;
    startTransition(async () => {
      const res = await deleteCollectionAction(initial.id);
      if (res.ok) {
        toast("Collection deleted.");
        router.push("/admin/collections");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't delete.", "error");
      }
    });
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/admin/collections"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-umber hover:text-walnut"
      >
        <ArrowLeft className="h-4 w-4" /> All collections
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="heading-display text-2xl font-semibold text-ink">
          {isNew ? "New collection" : `Edit: ${initial.title}`}
        </h1>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          <Button onClick={save} loading={pending}>
            {isNew ? "Create collection" : "Save changes"}
          </Button>
        </div>
      </header>

      {error && (
        <p className="mb-5 rounded-xl border border-madder/30 bg-madder/8 px-4 py-3 text-sm text-madder">
          {error}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <section className="space-y-4 rounded-2xl border border-line bg-white/60 p-5">
            <div>
              <Label htmlFor="c-title">Title *</Label>
              <Input
                id="c-title"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!handleTouched) setHandle(slugify(e.target.value));
                }}
                placeholder="Volume 6 — Monsoon Muse"
              />
            </div>
            <div>
              <Label htmlFor="c-handle">URL handle *</Label>
              <Input
                id="c-handle"
                value={handle}
                onChange={(e) => {
                  setHandleTouched(true);
                  setHandle(slugify(e.target.value));
                }}
              />
              <p className="mt-1 text-xs text-umber">/collections/{handle || "…"}</p>
            </div>
            <div>
              <Label htmlFor="c-desc">Description</Label>
              <Textarea
                id="c-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="c-image">Cover image URL</Label>
              <Input
                id="c-image"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://…"
              />
              {image && (
                <div className="relative mt-2.5 h-32 w-24 overflow-hidden rounded-lg border border-line">
                  <Image src={image} alt="" fill sizes="96px" className="object-cover" />
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="c-group">Group</Label>
                <Select
                  id="c-group"
                  value={group}
                  onChange={(e) => setGroup(e.target.value as CollectionGroup)}
                >
                  <option value="volumes">Seasonal volume</option>
                  <option value="occasions">Occasion</option>
                  <option value="pieces">By piece</option>
                  <option value="fabrics">Fabric</option>
                </Select>
              </div>
              <div className="flex flex-col justify-end gap-2 pb-1">
                <Checkbox
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  label="Featured on homepage"
                />
                <Checkbox
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  label="Published"
                />
              </div>
            </div>
          </section>
        </div>

        {/* product membership */}
        <section className="flex max-h-[36rem] flex-col rounded-2xl border border-line bg-white/60">
          <div className="border-b border-line p-4">
            <h2 className="font-semibold text-ink">
              Products <span className="text-sm font-normal text-umber">({productIds.length})</span>
            </h2>
            <div className="relative mt-2.5">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-umber" />
              <Input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter products…"
                className="h-9 pl-9"
              />
            </div>
          </div>
          <ul className="flex-1 divide-y divide-line overflow-y-auto">
            {filteredProducts.map((p) => {
              const checked = productIds.includes(p.id);
              return (
                <li key={p.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-linen/50",
                      checked && "bg-parchment/50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setProductIds((cur) =>
                          e.target.checked ? [...cur, p.id] : cur.filter((x) => x !== p.id)
                        )
                      }
                      className="h-4 w-4 rounded border-line accent-walnut"
                    />
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt=""
                        width={32}
                        height={40}
                        className="h-10 w-8 shrink-0 rounded-md object-cover"
                      />
                    ) : (
                      <span className="block h-10 w-8 shrink-0 rounded-md bg-parchment" />
                    )}
                    <span className="line-clamp-2 text-sm text-bark">{p.title}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
