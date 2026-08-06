"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Crosshair, ImagePlus, Search, Trash2 } from "lucide-react";
import type { Collection, CollectionGroup } from "@/lib/types";
import { saveCollectionAction, deleteCollectionAction } from "@/app/actions/admin";
import { MediaPickerDialog } from "@/components/admin/media-library";
import { FocalPointDialog, type FocalPoint } from "@/components/admin/focal-point-dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Checkbox } from "@/components/ui/fields";
import { RichTextEditor } from "@/components/ui/rich-text";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { slugify, cn, focalPosition, focalCrop } from "@/lib/utils";

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
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(initial.title);
  const [handle, setHandle] = useState(initial.handle);
  const [handleTouched, setHandleTouched] = useState(!isNew);
  const [description, setDescription] = useState(initial.descriptionHtml);
  const [image, setImage] = useState(initial.image ?? "");
  const [imageFocal, setImageFocal] = useState<FocalPoint | null>(
    initial.imageFocalX != null || initial.imageFocalY != null
      ? { x: initial.imageFocalX ?? 50, y: initial.imageFocalY ?? 50 }
      : null
  );
  const [bannerFocal, setBannerFocal] = useState<FocalPoint | null>(
    initial.bannerFocalX != null || initial.bannerFocalY != null
      ? { x: initial.bannerFocalX ?? 50, y: initial.bannerFocalY ?? 50 }
      : null
  );
  const [bannerZoom, setBannerZoom] = useState<number | null>(initial.bannerFocalZoom ?? null);
  const [focusOpen, setFocusOpen] = useState<"tile" | "banner" | null>(null);
  const [group, setGroup] = useState<CollectionGroup>(initial.group);
  const [featured, setFeatured] = useState(initial.featured);
  const [published, setPublished] = useState(initial.published);
  const [productIds, setProductIds] = useState<string[]>(initial.productIds);
  const [filter, setFilter] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
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
        imageFocalX: imageFocal?.x ?? null,
        imageFocalY: imageFocal?.y ?? null,
        bannerFocalX: bannerFocal?.x ?? null,
        bannerFocalY: bannerFocal?.y ?? null,
        bannerFocalZoom: bannerZoom,
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

  const remove = async () => {
    const ok = await confirm({
      title: `Delete “${title}”?`,
      body: "Products stay in the catalogue — only the grouping is removed.",
      confirmLabel: "Delete collection",
      danger: true,
    });
    if (!ok) return;
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
              <RichTextEditor
                id="c-desc"
                value={description}
                onChange={setDescription}
                placeholder="A few lines about this collection…"
              />
            </div>
            <div>
              <Label htmlFor="c-image">Cover image</Label>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setLibraryOpen(true)}>
                  <ImagePlus className="h-4 w-4" /> Choose from library
                </Button>
                <span className="text-xs text-umber">or</span>
                <Input
                  id="c-image"
                  value={image}
                  onChange={(e) => {
                    setImage(e.target.value);
                    setImageFocal(null); // different photo → old focus no longer applies
                    setBannerFocal(null);
                    setBannerZoom(null);
                  }}
                  placeholder="Paste an image URL…"
                  className="h-9 min-w-0 flex-1"
                />
              </div>
              {image && (
                <div className="mt-2.5 flex flex-wrap items-end gap-4">
                  {/* the two crops this cover is shown in, each with its own focus */}
                  <div>
                    <div className="relative h-32 w-24 overflow-hidden rounded-lg border border-line">
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover"
                        style={focalPosition(imageFocal?.x, imageFocal?.y)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFocusOpen("tile")}
                      className="mt-1.5 flex w-24 items-center justify-center gap-1 rounded-lg border border-line px-1.5 py-1 text-[0.65rem] font-medium text-bark transition-colors hover:border-walnut hover:text-walnut"
                    >
                      <Crosshair className="h-3 w-3" /> Tile focus
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="relative h-20 max-w-72 overflow-hidden rounded-lg border border-line">
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="288px"
                        className="object-cover"
                        style={focalCrop(bannerFocal?.x, bannerFocal?.y, bannerZoom)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFocusOpen("banner")}
                      className="mt-1.5 flex w-full max-w-72 items-center justify-center gap-1 rounded-lg border border-line px-1.5 py-1 text-[0.65rem] font-medium text-bark transition-colors hover:border-walnut hover:text-walnut"
                    >
                      <Crosshair className="h-3 w-3" /> Banner focus
                    </button>
                  </div>
                </div>
              )}
              {image && (
                <p className="mt-1.5 text-xs text-umber">
                  Tile = homepage & collection-list cards · Banner = the wide header on this
                  collection&rsquo;s own page.
                </p>
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

      <MediaPickerDialog
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onSelect={(items) => {
          setImage(items[0]?.url ?? "");
          setImageFocal(null); // different photo → old focus no longer applies
          setBannerFocal(null);
          setBannerZoom(null);
        }}
        title="Choose a cover image"
      />

      {image && focusOpen === "tile" && (
        <FocalPointDialog
          open
          onClose={() => setFocusOpen(null)}
          src={image}
          initial={imageFocal}
          onSave={setImageFocal}
          title="Tile focus — homepage & collection cards"
          previews={[
            { label: "Card (4:5)", aspect: "4 / 5" },
            { label: "Wide tile (16:9)", aspect: "16 / 9" },
          ]}
        />
      )}
      {image && focusOpen === "banner" && (
        <FocalPointDialog
          open
          onClose={() => setFocusOpen(null)}
          src={image}
          initial={bannerFocal}
          withZoom
          initialZoom={bannerZoom}
          onSave={(pt, zoom) => {
            setBannerFocal(pt);
            setBannerZoom(zoom);
          }}
          title="Banner focus — this collection's page header"
          previews={[
            { label: "Desktop banner", aspect: "9 / 2" },
            { label: "Phone banner", aspect: "3 / 2" },
          ]}
        />
      )}
    </div>
  );
}
