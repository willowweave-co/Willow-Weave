"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Crosshair,
  ImagePlus,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";
import type { Product, ProductImage, ProductVariant } from "@/lib/types";
import { saveProductAction, deleteProductAction } from "@/app/actions/admin";
import { MediaPickerDialog, type MediaItem } from "@/components/admin/media-library";
import { FocalPointDialog } from "@/components/admin/focal-point-dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select, Checkbox, FieldError } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { slugify, cn, focalPosition } from "@/lib/utils";

interface Props {
  initial: Product;
  isNew: boolean;
  collections: { id: string; title: string; group: string }[];
  sizeCharts: { id: string; name: string }[];
  knownTypes: string[];
  knownFabrics: string[];
  initialCollectionIds: string[];
}

let tempId = 0;
const newId = () => `new-${Date.now()}-${tempId++}`;

export function ProductForm({
  initial,
  isNew,
  collections,
  sizeCharts,
  knownTypes,
  knownFabrics,
  initialCollectionIds,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const dragFrom = useRef<number | null>(null);

  const [title, setTitle] = useState(initial.title);
  const [handle, setHandle] = useState(initial.handle);
  const [handleTouched, setHandleTouched] = useState(!isNew);
  const [description, setDescription] = useState(initial.descriptionHtml);
  const [productType, setProductType] = useState(initial.productType);
  const [fabrics, setFabrics] = useState<string[]>(initial.fabrics);
  const [customFabric, setCustomFabric] = useState("");
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [published, setPublished] = useState(!!initial.publishedAt);
  const [sizeChartId, setSizeChartId] = useState(initial.sizeChartId ?? "");
  const [collectionIds, setCollectionIds] = useState<string[]>(initialCollectionIds);
  const [images, setImages] = useState<ProductImage[]>(initial.images);
  const [variants, setVariants] = useState<ProductVariant[]>(
    initial.variants.length
      ? initial.variants
      : [
          { id: newId(), title: "S", size: "S", color: null, price: 0, compareAtPrice: null, stock: 10, sku: null, position: 0 },
          { id: newId(), title: "M", size: "M", color: null, price: 0, compareAtPrice: null, stock: 10, sku: null, position: 1 },
          { id: newId(), title: "L", size: "L", color: null, price: 0, compareAtPrice: null, stock: 10, sku: null, position: 2 },
        ]
  );
  const [imageUrl, setImageUrl] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setVariant = (i: number, patch: Partial<ProductVariant>) =>
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)));

  const moveImage = (i: number, dir: -1 | 1) =>
    setImages((imgs) => {
      const next = [...imgs];
      const j = i + dir;
      if (j < 0 || j >= next.length) return imgs;
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((img, idx) => ({ ...img, position: idx }));
    });

  const addImageUrl = () => {
    const url = imageUrl.trim();
    if (!url) return;
    try {
      new URL(url, window.location.origin);
    } catch {
      toast("That doesn't look like a valid URL.", "error");
      return;
    }
    setImages((imgs) => [
      ...imgs,
      { id: newId(), src: url, alt: title, width: null, height: null, position: imgs.length },
    ]);
    setImageUrl("");
  };

  const addFromLibrary = (picked: MediaItem[]) =>
    setImages((imgs) => [
      ...imgs,
      ...picked.map((m, k) => ({
        id: newId(),
        src: m.url,
        alt: title,
        width: m.width,
        height: m.height,
        position: imgs.length + k,
      })),
    ]);

  const dropImage = (to: number) => {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from === null || from === to) return;
    setImages((imgs) => {
      const next = [...imgs];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((img, idx) => ({ ...img, position: idx }));
    });
  };

  const save = () => {
    setError(null);
    const product: Product = {
      ...initial,
      title,
      handle: handle || slugify(title),
      descriptionHtml: description,
      productType,
      fabrics,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      publishedAt: published ? (initial.publishedAt ?? new Date().toISOString()) : null,
      sizeChartId: sizeChartId || null,
      images: images.map((img, i) => ({ ...img, position: i })),
      variants: variants.map((v, i) => ({
        ...v,
        title: v.title || [v.color, v.size].filter(Boolean).join(" / "),
        price: Number(v.price) || 0,
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
        stock: Math.max(0, Math.floor(Number(v.stock) || 0)),
        position: i,
      })),
      collectionIds,
    };
    startTransition(async () => {
      const res = await saveProductAction(product);
      if (res.ok) {
        toast(isNew ? "Product created." : "Product saved.");
        router.push("/admin/products");
        router.refresh();
      } else {
        setError(res.error ?? "Couldn't save.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  };

  const remove = () => {
    if (!confirm(`Delete “${title}”? This can't be undone.`)) return;
    startTransition(async () => {
      const res = await deleteProductAction(initial.id);
      if (res.ok) {
        toast("Product deleted.");
        router.push("/admin/products");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't delete.", "error");
      }
    });
  };

  const collectionGroups = ["occasions", "volumes", "pieces", "fabrics"].map((g) => ({
    group: g,
    items: collections.filter((c) => c.group === g),
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/products"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-umber hover:text-walnut"
      >
        <ArrowLeft className="h-4 w-4" /> All products
      </Link>

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="heading-display text-2xl font-semibold text-ink">
          {isNew ? "New product" : `Edit: ${initial.title}`}
        </h1>
        <div className="flex items-center gap-2">
          {!isNew && (
            <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          )}
          <Button onClick={save} loading={pending}>
            {isNew ? "Create product" : "Save changes"}
          </Button>
        </div>
      </header>

      {error && (
        <p className="mb-5 rounded-xl border border-madder/30 bg-madder/8 px-4 py-3 text-sm text-madder">
          {error}
        </p>
      )}

      {/* min-w-0: keep the variants table's scroll INSIDE its card instead of
          letting the grid column (min-width:auto) widen the whole page */}
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 space-y-6">
          {/* basics */}
          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="mb-4 font-semibold text-ink">Details</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="p-title">Title *</Label>
                <Input
                  id="p-title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!handleTouched) setHandle(slugify(e.target.value));
                  }}
                  placeholder="Sage Green Embroidered 3-Piece Suit"
                />
              </div>
              <div>
                <Label htmlFor="p-handle">URL handle *</Label>
                <Input
                  id="p-handle"
                  value={handle}
                  onChange={(e) => {
                    setHandleTouched(true);
                    setHandle(slugify(e.target.value));
                  }}
                  placeholder="sage-green-embroidered-3-piece-suit"
                />
                <p className="mt-1 text-xs text-umber">/products/{handle || "…"}</p>
              </div>
              <div>
                <Label htmlFor="p-desc">Description (HTML allowed)</Label>
                <Textarea
                  id="p-desc"
                  rows={7}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="<p>Crafted from breathable premium lawn…</p>"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="p-type">Type</Label>
                  <Input
                    id="p-type"
                    list="known-types"
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    placeholder="3-piece"
                  />
                  <datalist id="known-types">
                    {knownTypes.map((t) => (
                      <option key={t} value={t} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="p-tags">Tags (comma separated)</Label>
                  <Input
                    id="p-tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="3-Piece, Lawn"
                  />
                </div>
              </div>
              <div>
                <Label>Fabrics</Label>
                <div className="flex flex-wrap gap-2">
                  {[...new Set([...knownFabrics, ...fabrics])].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() =>
                        setFabrics((cur) =>
                          cur.includes(f) ? cur.filter((x) => x !== f) : [...cur, f]
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-colors",
                        fabrics.includes(f)
                          ? "border-walnut bg-walnut text-ivory"
                          : "border-line bg-white/60 text-bark hover:border-walnut/50"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                  <span className="inline-flex items-center gap-1">
                    <Input
                      value={customFabric}
                      onChange={(e) => setCustomFabric(e.target.value)}
                      placeholder="Add fabric…"
                      className="h-8 w-28 rounded-full px-3 py-1 text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && customFabric.trim()) {
                          e.preventDefault();
                          setFabrics((cur) => [...new Set([...cur, customFabric.trim()])]);
                          setCustomFabric("");
                        }
                      }}
                    />
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* variants */}
          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold text-ink">Variants, prices & stock</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setVariants((vs) => [
                    ...vs,
                    {
                      id: newId(),
                      title: "",
                      size: null,
                      color: vs[vs.length - 1]?.color ?? null,
                      price: vs[vs.length - 1]?.price ?? 0,
                      compareAtPrice: vs[vs.length - 1]?.compareAtPrice ?? null,
                      stock: 0,
                      sku: null,
                      position: vs.length,
                    },
                  ])
                }
              >
                <Plus className="h-4 w-4" /> Add variant
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="text-left text-[0.65rem] tracking-[0.12em] text-umber uppercase">
                    <th className="pb-2 pr-2 font-medium">Colour</th>
                    <th className="pb-2 pr-2 font-medium">Size</th>
                    <th className="pb-2 pr-2 font-medium">Price (Rs) *</th>
                    <th className="pb-2 pr-2 font-medium">Was (Rs)</th>
                    <th className="pb-2 pr-2 font-medium">Stock</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={v.id} className="border-t border-line">
                      <td className="py-2 pr-2">
                        <Input
                          value={v.color ?? ""}
                          onChange={(e) => setVariant(i, { color: e.target.value || null })}
                          placeholder="—"
                          className="h-9"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          value={v.size ?? ""}
                          onChange={(e) =>
                            setVariant(i, { size: e.target.value.toUpperCase() || null })
                          }
                          placeholder="M"
                          className="h-9 w-16"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          inputMode="numeric"
                          value={v.price || ""}
                          onChange={(e) =>
                            setVariant(i, { price: Number(e.target.value.replace(/\D/g, "")) })
                          }
                          placeholder="4999"
                          className="h-9 w-24"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          inputMode="numeric"
                          value={v.compareAtPrice ?? ""}
                          onChange={(e) => {
                            const n = e.target.value.replace(/\D/g, "");
                            setVariant(i, { compareAtPrice: n ? Number(n) : null });
                          }}
                          placeholder="—"
                          className="h-9 w-24"
                        />
                      </td>
                      <td className="py-2 pr-2">
                        <Input
                          inputMode="numeric"
                          value={v.stock}
                          onChange={(e) =>
                            setVariant(i, { stock: Number(e.target.value.replace(/\D/g, "")) || 0 })
                          }
                          className="h-9 w-20"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => setVariants((vs) => vs.filter((_, idx) => idx !== i))}
                          aria-label="Remove variant"
                          className="p-1.5 text-umber/60 transition-colors hover:text-madder"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-umber">
              “Was” = original price; when set higher than the price, the storefront shows a sale
              badge with the saving.
            </p>
          </section>

          {/* images */}
          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="mb-1 font-semibold text-ink">Images</h2>
            <p className="mb-4 text-xs text-umber">
              Drag to reorder — the first image is the storefront cover.
            </p>
            {images.length > 0 && (
              <ul className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {images.map((img, i) => (
                  <li
                    key={img.id}
                    draggable
                    onDragStart={() => (dragFrom.current = i)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      dropImage(i);
                    }}
                    onDragEnd={() => (dragFrom.current = null)}
                    className="group relative cursor-grab overflow-hidden rounded-xl border border-line active:cursor-grabbing"
                  >
                    <div className="relative aspect-[4/5] bg-parchment">
                      <Image
                        src={img.src}
                        alt=""
                        fill
                        sizes="150px"
                        className="object-cover"
                        style={focalPosition(img.focalX, img.focalY)}
                      />
                    </div>
                    {i === 0 && (
                      <span className="absolute top-1.5 left-1.5 rounded-full bg-walnut px-2 py-0.5 text-[0.6rem] font-semibold text-ivory">
                        Cover
                      </span>
                    )}
                    <div className="absolute right-1.5 bottom-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => setFocusIdx(i)}
                        aria-label="Set image focus"
                        title="Set which part stays in view"
                        className="rounded-full bg-ivory/95 p-1.5 text-bark shadow hover:text-walnut"
                      >
                        <Crosshair className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveImage(i, -1)}
                        aria-label="Move earlier"
                        className="rounded-full bg-ivory/95 p-1.5 text-bark shadow hover:text-walnut"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => moveImage(i, +1)}
                        aria-label="Move later"
                        className="rounded-full bg-ivory/95 p-1.5 text-bark shadow hover:text-walnut"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setImages((imgs) => imgs.filter((_, idx) => idx !== i))}
                        aria-label="Remove image"
                        className="rounded-full bg-ivory/95 p-1.5 text-madder shadow"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setLibraryOpen(true)}>
                <ImagePlus className="h-4 w-4" /> Add images
              </Button>
              <span className="text-xs text-umber">or</span>
              <div className="relative min-w-56 flex-1">
                <Link2 className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-umber" />
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addImageUrl()}
                  placeholder="Paste an image URL…"
                  className="h-9 pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={addImageUrl}>
                <ImagePlus className="h-4 w-4" /> Add
              </Button>
            </div>
          </section>
        </div>

        {/* sidebar */}
        <div className="min-w-0 space-y-6">
          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="mb-3 font-semibold text-ink">Visibility</h2>
            <Checkbox
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              label="Published (visible in the store)"
            />
          </section>

          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="mb-3 font-semibold text-ink">Size chart</h2>
            <Select value={sizeChartId} onChange={(e) => setSizeChartId(e.target.value)}>
              <option value="">No chart</option>
              {sizeCharts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <p className="mt-2 text-xs text-umber">
              Shown first in the product page's “Size chart” popup.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-white/60 p-5">
            <h2 className="mb-3 font-semibold text-ink">Collections</h2>
            <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
              {collectionGroups.map(
                (g) =>
                  g.items.length > 0 && (
                    <div key={g.group}>
                      <p className="mb-1.5 text-[0.65rem] font-semibold tracking-[0.14em] text-umber uppercase">
                        {g.group}
                      </p>
                      <div className="space-y-1">
                        {g.items.map((c) => (
                          <Checkbox
                            key={c.id}
                            checked={collectionIds.includes(c.id)}
                            onChange={(e) =>
                              setCollectionIds((cur) =>
                                e.target.checked ? [...cur, c.id] : cur.filter((x) => x !== c.id)
                              )
                            }
                            label={c.title}
                          />
                        ))}
                      </div>
                    </div>
                  )
              )}
            </div>
          </section>

          <Button onClick={save} loading={pending} className="w-full">
            {isNew ? "Create product" : "Save changes"}
          </Button>
        </div>
      </div>

      <MediaPickerDialog
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        multiple
        onSelect={addFromLibrary}
        title="Add product images"
      />

      {focusIdx !== null && images[focusIdx] && (
        <FocalPointDialog
          open
          onClose={() => setFocusIdx(null)}
          src={images[focusIdx].src}
          initial={
            images[focusIdx].focalX != null || images[focusIdx].focalY != null
              ? { x: images[focusIdx].focalX ?? 50, y: images[focusIdx].focalY ?? 50 }
              : null
          }
          onSave={(pt) =>
            setImages((imgs) =>
              imgs.map((im, idx) =>
                idx === focusIdx ? { ...im, focalX: pt?.x ?? null, focalY: pt?.y ?? null } : im
              )
            )
          }
          title="Product image focus"
        />
      )}
    </div>
  );
}
