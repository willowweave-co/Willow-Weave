"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Check,
  Copy,
  Film,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/fields";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface MediaItem {
  /** Cloudinary public_id, or the /uploads/… path in local mode */
  id: string;
  url: string;
  kind: "image" | "video";
  width: number | null;
  height: number | null;
  bytes: number | null;
  createdAt: string | null;
  filename: string;
}

function formatBytes(n: number | null): string {
  if (!n) return "";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/* Upload dropzone                                                     */
/* ------------------------------------------------------------------ */

function UploadDropzone({
  kind,
  onUploaded,
}: {
  kind: "image" | "all";
  onUploaded: (item: MediaItem) => void;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);

  const upload = async (fileList: FileList | null) => {
    let files = fileList ? Array.from(fileList) : [];
    if (kind === "image") files = files.filter((f) => f.type.startsWith("image/"));
    if (!files.length) return;
    setBusy({ done: 0, total: files.length });
    for (const [i, file] of files.entries()) {
      const body = new FormData();
      body.append("file", file);
      try {
        const res = await fetch("/api/admin/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        onUploaded({
          id: data.publicId ?? data.url,
          url: data.url,
          kind: data.kind === "video" ? "video" : "image",
          width: null,
          height: null,
          bytes: null,
          createdAt: new Date().toISOString(),
          filename: file.name,
        });
      } catch (e) {
        toast(e instanceof Error ? e.message : `Couldn't upload ${file.name}`, "error");
      }
      setBusy({ done: i + 1, total: files.length });
    }
    setBusy(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        void upload(e.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors",
        dragOver
          ? "border-walnut bg-walnut/5"
          : "border-line bg-white/40 hover:border-walnut/50 hover:bg-white/70"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={kind === "image" ? "image/*" : "image/*,video/mp4,video/webm"}
        multiple
        className="hidden"
        onChange={(e) => void upload(e.target.files)}
      />
      {busy ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin text-walnut" />
          <p className="text-sm text-bark">
            Uploading {Math.min(busy.done + 1, busy.total)} of {busy.total}…
          </p>
        </>
      ) : (
        <>
          <Upload className="h-5 w-5 text-walnut" />
          <p className="text-sm font-medium text-bark">
            Drag & drop {kind === "image" ? "images" : "images or videos"} here
          </p>
          <p className="text-xs text-umber">
            or click to browse — uploads are compressed automatically
          </p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Library grid                                                        */
/* ------------------------------------------------------------------ */

interface MediaLibraryProps {
  /** Show copy-URL / delete actions on each tile (the /admin/library page). */
  manage?: boolean;
  /** Restrict listing + uploads to images (product/collection pickers). */
  kind?: "image" | "all";
  /** Selected items when used as a picker. */
  selected?: MediaItem[];
  /** Tile click handler when used as a picker. */
  onToggle?: (item: MediaItem) => void;
  /** Fired for each successful dropzone upload. */
  onUploaded?: (item: MediaItem) => void;
  className?: string;
}

export function MediaLibrary({
  manage = false,
  kind = "all",
  selected = [],
  onToggle,
  onUploaded,
  className,
}: MediaLibraryProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [q, setQ] = useState("");

  const fetchPage = useCallback(
    async (query: string, cursor: string | null) => {
      const params = new URLSearchParams();
      if (kind === "image") params.set("kind", "image");
      if (query) params.set("q", query);
      if (cursor) params.set("cursor", cursor);
      const res = await fetch(`/api/admin/media?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't load the media library");
      return data as { items: MediaItem[]; nextCursor: string | null };
    },
    [kind]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Debounce typing; the first load fires immediately.
    const t = setTimeout(
      async () => {
        try {
          const data = await fetchPage(q, null);
          if (cancelled) return;
          setItems(data.items);
          setNextCursor(data.nextCursor);
        } catch (e) {
          if (!cancelled) toast(e instanceof Error ? e.message : "Couldn't load media", "error");
        } finally {
          if (!cancelled) setLoading(false);
        }
      },
      q ? 300 : 0
    );
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, fetchPage, toast]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await fetchPage(q, nextCursor);
      setItems((cur) => {
        const seen = new Set(cur.map((i) => i.id));
        return [...cur, ...data.items.filter((i) => !seen.has(i.id))];
      });
      setNextCursor(data.nextCursor);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't load more", "error");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleUploaded = (item: MediaItem) => {
    setItems((cur) => [item, ...cur.filter((i) => i.id !== item.id)]);
    onUploaded?.(item);
  };

  const copyUrl = async (item: MediaItem) => {
    try {
      await navigator.clipboard.writeText(item.url);
      toast("URL copied to clipboard.");
    } catch {
      toast("Couldn't copy — your browser blocked clipboard access.", "error");
    }
  };

  const remove = async (item: MediaItem) => {
    if (
      !confirm(
        `Delete “${item.filename}” permanently?\n\nAny product, collection or page still using it will show a broken image.`
      )
    )
      return;
    try {
      const res = await fetch("/api/admin/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, kind: item.kind }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      setItems((cur) => cur.filter((i) => i.id !== item.id));
      toast("Media deleted.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't delete", "error");
    }
  };

  const selectedIds = new Set(selected.map((i) => i.id));

  return (
    <div className={cn("flex min-h-0 flex-col gap-4", className)}>
      <UploadDropzone kind={kind} onUploaded={handleUploaded} />

      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-umber" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by product or file name…"
          className="h-9 pl-9"
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-umber">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading media…
          </div>
        ) : items.length === 0 ? (
          <p className="py-14 text-center text-sm text-umber">
            {q ? "Nothing matches that search." : "No media yet — drop a file above to upload."}
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((item) => {
                const isSelected = selectedIds.has(item.id);
                return (
                  <li
                    key={item.id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border bg-parchment transition-shadow",
                      isSelected ? "border-walnut ring-2 ring-walnut" : "border-line"
                    )}
                  >
                    <button
                      type="button"
                      onClick={onToggle ? () => onToggle(item) : undefined}
                      className={cn("block w-full text-left", onToggle && "cursor-pointer")}
                      aria-pressed={onToggle ? isSelected : undefined}
                      aria-label={item.filename}
                    >
                      <div className="relative aspect-square">
                        {item.kind === "image" ? (
                          <Image
                            src={item.url}
                            alt={item.filename}
                            fill
                            sizes="200px"
                            className="object-cover"
                          />
                        ) : (
                          <video
                            src={item.url}
                            preload="metadata"
                            muted
                            playsInline
                            className="h-full w-full object-cover"
                          />
                        )}
                        {item.kind === "video" && (
                          <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-ink/70 px-2 py-0.5 text-[0.6rem] font-semibold text-ivory">
                            <Film className="h-3 w-3" /> Video
                          </span>
                        )}
                        {isSelected && (
                          <span className="absolute top-1.5 right-1.5 rounded-full bg-walnut p-1 text-ivory shadow">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-1 border-t border-line/70 bg-white/70 px-2 py-1.5">
                      <span
                        className="min-w-0 flex-1 truncate text-[0.65rem] text-bark"
                        title={item.filename}
                      >
                        {item.filename}
                        {item.bytes ? (
                          <span className="text-umber/70"> · {formatBytes(item.bytes)}</span>
                        ) : null}
                      </span>
                      {manage && (
                        <>
                          <button
                            type="button"
                            onClick={() => copyUrl(item)}
                            aria-label={`Copy URL of ${item.filename}`}
                            title="Copy URL"
                            className="rounded p-1 text-umber/70 transition-colors hover:text-walnut"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(item)}
                            aria-label={`Delete ${item.filename}`}
                            title="Delete"
                            className="rounded p-1 text-umber/70 transition-colors hover:text-madder"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            {nextCursor && (
              <div className="flex justify-center py-4">
                <Button variant="outline" size="sm" loading={loadingMore} onClick={loadMore}>
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Picker dialog                                                       */
/* ------------------------------------------------------------------ */

interface MediaPickerDialogProps {
  open: boolean;
  onClose: () => void;
  /** Allow picking several items (product galleries) vs one (covers). */
  multiple?: boolean;
  /** "all" also lists/accepts videos (hero slides). */
  kind?: "image" | "all";
  onSelect: (items: MediaItem[]) => void;
  title?: string;
}

export function MediaPickerDialog({
  open,
  onClose,
  multiple = false,
  kind = "image",
  onSelect,
  title = "Choose from library",
}: MediaPickerDialogProps) {
  const [selected, setSelected] = useState<MediaItem[]>([]);

  useEffect(() => {
    if (open) setSelected([]);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const toggle = (item: MediaItem) =>
    setSelected((cur) => {
      if (cur.some((x) => x.id === item.id)) return cur.filter((x) => x.id !== item.id);
      return multiple ? [...cur, item] : [item];
    });

  const confirmSelection = () => {
    if (!selected.length) return;
    onSelect(selected);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="animate-fade-in absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div className="absolute top-1/2 left-1/2 flex h-[min(85vh,44rem)] w-[min(100vw-2rem,64rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-ivory shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="heading-display text-lg text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-bark transition-colors hover:bg-linen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 p-5">
          <MediaLibrary
            kind={kind}
            selected={selected}
            onToggle={toggle}
            // Fresh uploads are selected right away so "upload → add" is one flow.
            onUploaded={(item) => setSelected((cur) => (multiple ? [...cur, item] : [item]))}
            className="h-full"
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3.5">
          <p className="text-sm text-umber">
            {selected.length === 0
              ? multiple
                ? `Pick one or more ${kind === "all" ? "files" : "images"}`
                : `Pick ${kind === "all" ? "a file" : "an image"}`
              : `${selected.length} selected`}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" disabled={!selected.length} onClick={confirmSelection}>
              {multiple
                ? `Add ${selected.length || ""} image${selected.length === 1 ? "" : "s"}`
                : kind === "all"
                  ? "Use this"
                  : "Use image"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
