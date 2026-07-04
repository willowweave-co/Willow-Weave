"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle } from "lucide-react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error";
}

const ToastContext = createContext<{
  toast: (message: string, type?: "success" | "error") => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const toast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3800);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-5 z-[100] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "animate-fade-up pointer-events-auto flex items-center gap-2.5 rounded-full border px-4 py-2.5 text-sm shadow-lg backdrop-blur",
              t.type === "success"
                ? "border-moss/30 bg-ivory/95 text-ink"
                : "border-madder/30 bg-ivory/95 text-madder"
            )}
          >
            {t.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-moss" aria-hidden />
            ) : (
              <XCircle className="h-4 w-4 text-madder" aria-hidden />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
