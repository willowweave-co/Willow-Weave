"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** "center" = modal dialog, "right" = slide-over drawer */
  side?: "center" | "right";
  className?: string;
}

/** Longest exit animation (slide-out-right, 240ms) — unmount after it ends. */
const EXIT_MS = 240;

export function Dialog({ open, onClose, title, children, side = "center", className }: DialogProps) {
  // Stay mounted through the exit animation: `open` flips off immediately,
  // `visible` follows EXIT_MS later, and the gap plays the exit keyframes —
  // the drawer slides back out the way it slid in instead of vanishing.
  const [visible, setVisible] = useState(open);
  useEffect(() => {
    if (open) {
      setVisible(true);
      return;
    }
    const t = setTimeout(() => setVisible(false), EXIT_MS);
    return () => clearTimeout(t);
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

  if (!visible || typeof document === "undefined") return null;
  const closing = !open;

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={cn(
          "absolute inset-0 bg-ink/45 backdrop-blur-[2px]",
          closing ? "animate-fade-out" : "animate-fade-in"
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "absolute bg-ivory shadow-2xl",
          side === "center" && [
            "top-1/2 left-1/2 max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl",
            closing ? "animate-pop-out" : "animate-pop-in",
          ],
          side === "right" && [
            "top-0 right-0 flex h-dvh w-full max-w-md flex-col",
            closing ? "animate-slide-out-right" : "animate-slide-in-right",
          ],
          className
        )}
      >
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
        <div className={cn(side === "right" ? "flex min-h-0 flex-1 flex-col" : "p-5")}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
