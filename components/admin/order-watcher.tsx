"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const POLL_MS = 30_000;

/**
 * Live "new order" alerts everywhere in the dashboard:
 *  - Supabase Realtime INSERT subscription → instant (needs the orders table
 *    in the realtime publication; see supabase/migrations/0002_realtime.sql)
 *  - 30s heartbeat poll as fallback (also covers local mode / dropped sockets)
 * On a new order: toast + router.refresh() so the visible page re-renders.
 */
export function OrderWatcher() {
  const router = useRouter();
  const { toast } = useToast();
  const countRef = useRef<number | null>(null);
  const lastAnnouncedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const announce = (orderNumber: string | null) => {
      const key = orderNumber ?? `count-${countRef.current}`;
      if (lastAnnouncedRef.current === key) return; // realtime + poll dedupe
      lastAnnouncedRef.current = key;
      toast(`🛍️ New order ${orderNumber ?? ""} just came in`);
      router.refresh();
    };

    const check = async () => {
      try {
        const res = await fetch("/api/admin/orders-pulse", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { count: number; latestNumber: string | null };
        if (countRef.current !== null && data.count > countRef.current) {
          announce(data.latestNumber);
        }
        countRef.current = data.count;
      } catch {
        /* offline blip — next tick will catch up */
      }
    };

    check(); // establish baseline
    const interval = setInterval(check, POLL_MS);

    // realtime push (Supabase mode only)
    let cleanupRealtime: (() => void) | null = null;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const supabase = createSupabaseBrowser();
      const channel = supabase
        .channel("ww-orders-watch")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders" },
          (payload: { new: Record<string, unknown> }) => {
            if (cancelled) return;
            const num =
              typeof payload.new?.order_number === "string" ? payload.new.order_number : null;
            if (countRef.current !== null) countRef.current += 1;
            announce(num);
          }
        )
        .subscribe();
      cleanupRealtime = () => {
        supabase.removeChannel(channel);
      };
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      cleanupRealtime?.();
    };
  }, [router, toast]);

  return null;
}
