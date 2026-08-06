"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/fields";

/**
 * Replaces window.confirm() across the dashboard.
 *
 * The native dialog was unstyleable OS chrome dropped into the middle of the
 * store's own world, and — more to the point — it is one reflexive Enter away
 * from deleting a product. This keeps the same call shape so handlers read
 * almost identically:
 *
 *   if (!(await confirm({ title: "…" }))) return;
 *
 * `typeToConfirm` adds a name-matching gate for the actions that genuinely
 * cannot be undone.
 */
export interface ConfirmOptions {
  title: string;
  /** What will actually happen, in plain language. */
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red confirm button, for destructive actions. */
  danger?: boolean;
  /** Hold the confirm button until this exact text is typed back. */
  typeToConfirm?: string;
}

const ConfirmContext = createContext<{
  confirm: (options: ConfirmOptions) => Promise<boolean>;
} | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // kept through the exit animation so the panel doesn't blank mid-fade
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState("");
  const resolverRef = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    setTyped("");
    setOptions(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  // Cancel is the safe default, so Escape and the backdrop both land here.
  const settle = useCallback((ok: boolean) => {
    resolverRef.current?.(ok);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  const gate = options?.typeToConfirm;
  const locked = !!gate && typed.trim() !== gate;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={open} onClose={() => settle(false)} title={options?.title ?? ""}>
        {options?.body && (
          <div className="text-sm leading-relaxed text-bark">{options.body}</div>
        )}
        {gate && (
          <div className="mt-4">
            <Label htmlFor="confirm-gate">
              Type <span className="font-semibold normal-case">{gate}</span> to confirm
            </Label>
            <Input
              id="confirm-gate"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => settle(false)}>
            {options?.cancelLabel ?? "Cancel"}
          </Button>
          <Button
            variant={options?.danger ? "danger" : "primary"}
            disabled={locked}
            onClick={() => settle(true)}
          >
            {options?.confirmLabel ?? "Confirm"}
          </Button>
        </div>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx.confirm;
}
