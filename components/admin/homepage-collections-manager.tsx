"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Crosshair, RotateCcw } from "lucide-react";
import {
  saveHomepageCollectionsAction,
  setCollectionTileFocusAction,
} from "@/app/actions/admin";
import { FocalPointDialog } from "@/components/admin/focal-point-dialog";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { focalPosition } from "@/lib/utils";

interface CollectionOption {
  id: string;
  title: string;
  group: string;
  image: string | null;
  imageFocalX: number | null;
  imageFocalY: number | null;
}

/** Mirrors the storefront grid: slots 1 and 6 span the full row. */
const SLOTS = [
  { label: "Slot 1 — wide (top row)", wide: true },
  { label: "Slot 2 — tile", wide: false },
  { label: "Slot 3 — tile", wide: false },
  { label: "Slot 4 — tile", wide: false },
  { label: "Slot 5 — tile", wide: false },
  { label: "Slot 6 — wide (bottom row)", wide: true },
];

export function HomepageCollectionsManager({
  collections,
  initial,
}: {
  collections: CollectionOption[];
  /** Saved slot ids, or null = automatic picks. */
  initial: string[] | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [slots, setSlots] = useState<string[]>(() => {
    const s = [...(initial ?? [])];
    while (s.length < SLOTS.length) s.push("");
    return s.slice(0, SLOTS.length);
  });

  const byId = new Map(collections.map((c) => [c.id, c]));
  const chosen = slots.filter(Boolean);
  const isAuto = chosen.length === 0;
  const [focusId, setFocusId] = useState<string | null>(null);
  const focusTarget = focusId ? byId.get(focusId) : undefined;

  const saveTileFocus = (pt: { x: number; y: number } | null) => {
    if (!focusId) return;
    startTransition(async () => {
      const res = await setCollectionTileFocusAction(focusId, pt?.x ?? null, pt?.y ?? null);
      if (res.ok) {
        toast("Tile focus saved.");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't save the focus.", "error");
      }
    });
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveHomepageCollectionsAction(chosen);
      if (res.ok) {
        toast(isAuto ? "Homepage collections reset to automatic." : "Homepage collections saved.");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't save.", "error");
      }
    });

  return (
    <section className="rounded-2xl border border-line bg-white/60 p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">&ldquo;The Collections&rdquo; section</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSlots(SLOTS.map(() => ""))}
          disabled={pending || isAuto}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Clear all
        </Button>
      </div>
      <p className="mb-4 text-xs text-umber">
        Pick which collections appear in the grid under the hero. Leave every slot empty to let
        the store choose automatically (newest volumes, occasions and pieces).
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {SLOTS.map((slot, i) => {
          const sel = byId.get(slots[i]);
          return (
            <div
              key={slot.label}
              className={slot.wide ? "sm:col-span-2" : undefined}
            >
              <Label htmlFor={`hc-slot-${i}`}>{slot.label}</Label>
              <div className="flex items-center gap-2.5">
                {sel?.image ? (
                  <Image
                    src={sel.image}
                    alt=""
                    width={slot.wide ? 64 : 36}
                    height={44}
                    className={
                      (slot.wide ? "h-11 w-16" : "h-11 w-9") +
                      " shrink-0 rounded-md border border-line object-cover"
                    }
                    style={focalPosition(sel.imageFocalX, sel.imageFocalY)}
                  />
                ) : (
                  <span
                    className={
                      (slot.wide ? "w-16" : "w-9") +
                      " block h-11 shrink-0 rounded-md border border-dashed border-line bg-parchment/60"
                    }
                  />
                )}
                <Select
                  id={`hc-slot-${i}`}
                  value={slots[i]}
                  onChange={(e) =>
                    setSlots((cur) => cur.map((v, idx) => (idx === i ? e.target.value : v)))
                  }
                  className="min-w-0 flex-1"
                >
                  <option value="">— empty —</option>
                  {collections.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={slots.includes(c.id) && slots[i] !== c.id}
                    >
                      {c.title} ({c.group})
                    </option>
                  ))}
                </Select>
                {sel?.image && (
                  <button
                    type="button"
                    onClick={() => setFocusId(sel.id)}
                    aria-label={`Adjust image focus for ${sel.title}`}
                    title="Adjust which part of the cover stays in view"
                    className="rounded-full border border-line p-2 text-bark transition-colors hover:border-walnut hover:text-walnut"
                  >
                    <Crosshair className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {focusTarget?.image && (
        <FocalPointDialog
          open
          onClose={() => setFocusId(null)}
          src={focusTarget.image}
          initial={
            focusTarget.imageFocalX != null || focusTarget.imageFocalY != null
              ? { x: focusTarget.imageFocalX ?? 50, y: focusTarget.imageFocalY ?? 50 }
              : null
          }
          onSave={saveTileFocus}
          title={`Tile focus — ${focusTarget.title}`}
          previews={[
            { label: "Card (4:5)", aspect: "4 / 5" },
            { label: "Wide tile (16:9)", aspect: "16 / 9" },
          ]}
        />
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-umber">
          {isAuto
            ? "Currently: automatic picks."
            : `Currently: ${chosen.length} hand-picked collection${chosen.length === 1 ? "" : "s"}.`}
        </p>
        <Button onClick={save} loading={pending}>
          Save collections
        </Button>
      </div>
    </section>
  );
}
