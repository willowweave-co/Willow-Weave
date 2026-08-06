"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, RotateCcw, Trash2 } from "lucide-react";
import type { NavChild, NavConfig, NavItem } from "@/lib/types";
import { saveNavConfigAction } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

interface LinkOption {
  label: string;
  href: string;
}

const uid = (p: string) => `${p}:${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/** Move item i by dir within a list, or return the list unchanged at the ends. */
function moved<T>(list: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

function RowButtons({
  onUp,
  onDown,
  onToggle,
  onRemove,
  hidden,
  label,
}: {
  onUp: () => void;
  onDown: () => void;
  onToggle: () => void;
  onRemove: () => void;
  hidden?: boolean;
  label: string;
}) {
  const base =
    "focus-ring tap-44 rounded-lg border border-line p-1.5 text-bark transition-colors hover:border-walnut hover:text-walnut disabled:opacity-30";
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button onClick={onUp} aria-label={`Move ${label} up`} className={base}>
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button onClick={onDown} aria-label={`Move ${label} down`} className={base}>
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onToggle}
        aria-label={hidden ? `Show ${label}` : `Hide ${label}`}
        className={cn(base, hidden && "border-walnut/50 text-walnut")}
      >
        {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
      <button
        onClick={onRemove}
        aria-label={`Remove ${label}`}
        className={cn(base, "hover:border-madder hover:text-madder")}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function NavMenuManager({
  initial,
  isCustom,
  linkOptions,
}: {
  initial: NavConfig;
  /** false = currently following the collections automatically */
  isCustom: boolean;
  linkOptions: LinkOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<NavConfig>(initial);

  const patchItem = (id: string, p: Partial<NavItem>) =>
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const patchChild = (itemId: string, colId: string, childId: string, p: Partial<NavChild>) =>
    setItems((xs) =>
      xs.map((x) =>
        x.id !== itemId
          ? x
          : {
              ...x,
              columns: x.columns?.map((c) =>
                c.id !== colId
                  ? c
                  : { ...c, links: c.links.map((l) => (l.id === childId ? { ...l, ...p } : l)) }
              ),
            }
      )
    );

  const moveChild = (itemId: string, colId: string, i: number, dir: -1 | 1) =>
    setItems((xs) =>
      xs.map((x) =>
        x.id !== itemId
          ? x
          : {
              ...x,
              columns: x.columns?.map((c) =>
                c.id !== colId ? c : { ...c, links: moved(c.links, i, dir) }
              ),
            }
      )
    );

  const removeChild = (itemId: string, colId: string, childId: string) =>
    setItems((xs) =>
      xs.map((x) =>
        x.id !== itemId
          ? x
          : {
              ...x,
              columns: x.columns?.map((c) =>
                c.id !== colId ? c : { ...c, links: c.links.filter((l) => l.id !== childId) }
              ),
            }
      )
    );

  const addChild = (itemId: string, colId: string) =>
    setItems((xs) =>
      xs.map((x) =>
        x.id !== itemId
          ? x
          : {
              ...x,
              columns: x.columns?.map((c) =>
                c.id !== colId
                  ? c
                  : {
                      ...c,
                      links: [
                        ...c.links,
                        { id: uid("l"), label: "New link", href: linkOptions[0]?.href ?? "/" },
                      ],
                    }
              ),
            }
      )
    );

  const addItem = (kind: "link" | "dropdown") =>
    setItems((xs) => [
      ...xs,
      kind === "link"
        ? { id: uid("n"), label: "New item", href: linkOptions[0]?.href ?? "/" }
        : {
            id: uid("n"),
            label: "New menu",
            layout: "list" as const,
            columns: [
              {
                id: uid("c"),
                heading: "",
                links: [{ id: uid("l"), label: "New link", href: linkOptions[0]?.href ?? "/" }],
              },
            ],
          },
    ]);

  const removeItem = async (item: NavItem) => {
    const ok = await confirm({
      title: `Remove “${item.label}” from the menu?`,
      body: "Nothing is deleted from the store — only this entry in the header. You can add it back, or use the eye icon to hide it temporarily instead.",
      confirmLabel: "Remove",
      danger: true,
    });
    if (!ok) return;
    setItems((xs) => xs.filter((x) => x.id !== item.id));
  };

  const save = () =>
    startTransition(async () => {
      const res = await saveNavConfigAction(items);
      if (res.ok) {
        toast("Menu saved.");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't save the menu.", "error");
      }
    });

  const reset = async () => {
    const ok = await confirm({
      title: "Go back to the automatic menu?",
      body: "The header returns to listing your published collections by group, and any renaming, reordering or hiding you've done here is discarded.",
      confirmLabel: "Reset menu",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await saveNavConfigAction(null);
      if (res.ok) {
        toast("Menu reset to automatic.");
        router.refresh();
      } else {
        toast(res.error ?? "Couldn't reset the menu.", "error");
      }
    });
  };

  return (
    <section className="rounded-2xl border border-line bg-white/60 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-ink">Header menu</h2>
        <span className="rounded-full bg-parchment px-2.5 py-1 text-xs font-medium text-bark">
          {isCustom ? "Custom menu" : "Following collections automatically"}
        </span>
      </div>

      {!isCustom && (
        <p className="mb-4 rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-xs leading-relaxed text-walnut-dark">
          Right now the menu builds itself from your published collections, so new collections
          appear on their own. Saving any change below switches to a fixed menu — after that,
          new collections have to be added here by hand. You can always come back to automatic.
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item, i) => {
          const isLink = !!item.href;
          return (
            <li
              key={item.id}
              className={cn(
                "rounded-xl border border-line bg-white/70 p-4",
                item.hidden && "opacity-60"
              )}
            >
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-40 flex-1">
                  <Label htmlFor={`label-${item.id}`}>
                    {isLink ? "Button name" : "Dropdown name"}
                  </Label>
                  <Input
                    id={`label-${item.id}`}
                    value={item.label}
                    onChange={(e) => patchItem(item.id, { label: e.target.value })}
                  />
                </div>
                {isLink && (
                  <div className="min-w-48 flex-1">
                    <Label htmlFor={`href-${item.id}`}>Links to</Label>
                    <Select
                      id={`href-${item.id}`}
                      value={item.href}
                      onChange={(e) => patchItem(item.id, { href: e.target.value })}
                    >
                      {!linkOptions.some((o) => o.href === item.href) && (
                        <option value={item.href}>{item.href}</option>
                      )}
                      {linkOptions.map((o) => (
                        <option key={o.href} value={o.href}>
                          {o.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
                <RowButtons
                  label={item.label}
                  hidden={item.hidden}
                  onUp={() => setItems((xs) => moved(xs, i, -1))}
                  onDown={() => setItems((xs) => moved(xs, i, 1))}
                  onToggle={() => patchItem(item.id, { hidden: !item.hidden })}
                  onRemove={() => removeItem(item)}
                />
              </div>

              {!isLink && (
                <div className="mt-4 space-y-4 border-t border-line pt-4">
                  {item.columns?.map((col) => (
                    <div key={col.id}>
                      <div className="mb-2 flex items-center gap-2">
                        <Input
                          value={col.heading}
                          placeholder="Group heading (optional)"
                          onChange={(e) =>
                            patchItem(item.id, {
                              columns: item.columns?.map((c) =>
                                c.id === col.id ? { ...c, heading: e.target.value } : c
                              ),
                            })
                          }
                          className="max-w-56 text-xs"
                        />
                        <span className="text-xs text-umber">
                          {col.links.length} link{col.links.length === 1 ? "" : "s"}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {col.links.map((l, li) => (
                          <li
                            key={l.id}
                            className={cn(
                              "flex flex-wrap items-center gap-2 rounded-lg bg-parchment/40 p-2",
                              l.hidden && "opacity-60"
                            )}
                          >
                            <Input
                              value={l.label}
                              aria-label="Link name"
                              onChange={(e) =>
                                patchChild(item.id, col.id, l.id, { label: e.target.value })
                              }
                              className="min-w-32 flex-1 text-xs"
                            />
                            <Select
                              value={l.href}
                              aria-label="Link destination"
                              onChange={(e) =>
                                patchChild(item.id, col.id, l.id, { href: e.target.value })
                              }
                              className="min-w-40 flex-1 text-xs"
                            >
                              {!linkOptions.some((o) => o.href === l.href) && (
                                <option value={l.href}>{l.href}</option>
                              )}
                              {linkOptions.map((o) => (
                                <option key={o.href} value={o.href}>
                                  {o.label}
                                </option>
                              ))}
                            </Select>
                            <RowButtons
                              label={l.label}
                              hidden={l.hidden}
                              onUp={() => moveChild(item.id, col.id, li, -1)}
                              onDown={() => moveChild(item.id, col.id, li, 1)}
                              onToggle={() =>
                                patchChild(item.id, col.id, l.id, { hidden: !l.hidden })
                              }
                              onRemove={() => removeChild(item.id, col.id, l.id)}
                            />
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => addChild(item.id, col.id)}
                        className="focus-ring mt-2 inline-flex items-center gap-1 rounded-lg border border-dashed border-line px-2.5 py-1.5 text-xs text-bark transition-colors hover:border-walnut hover:text-walnut"
                      >
                        <Plus className="h-3 w-3" /> Add link
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => addItem("link")}>
            <Plus className="h-4 w-4" /> Add button
          </Button>
          <Button variant="outline" size="sm" onClick={() => addItem("dropdown")}>
            <Plus className="h-4 w-4" /> Add dropdown
          </Button>
          {isCustom && (
            <Button variant="ghost" size="sm" onClick={reset} disabled={pending}>
              <RotateCcw className="h-4 w-4" /> Back to automatic
            </Button>
          )}
        </div>
        <Button onClick={save} loading={pending}>
          Save menu
        </Button>
      </div>
    </section>
  );
}
