"use client";

import { useEffect, useRef } from "react";
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

export function Dialog({ open, onClose, title, children, side = "center", className }: DialogProps) {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);

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

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="animate-fade-in absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className={cn(
          "absolute bg-ivory shadow-2xl",
          side === "center" &&
            "top-1/2 left-1/2 max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl",
          side === "right" &&
            "top-0 right-0 flex h-dvh w-full max-w-md flex-col animate-[slide-in_0.28s_ease-out]",
          className
        )}
        style={side === "right" ? { animationName: "ww-slide-in" } : undefined}
      >
        <style>{`@keyframes ww-slide-in { from { transform: translateX(100%);} to { transform: translateX(0);} }`}</style>
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
