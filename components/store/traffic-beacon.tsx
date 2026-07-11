"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const VID_KEY = "ww_vid"; // persistent visitor id (localStorage)
const UTM_KEY = "ww_utm"; // ad-click attribution for this tab (sessionStorage)

/**
 * Anonymous pageview beacon → /api/track, feeding the dashboard's Live
 * traffic section. No cookies, no third parties: a random visitor id in
 * localStorage, the path, the external referrer, and any utm_* params from
 * the landing URL (kept for the rest of the tab session so ad campaigns get
 * credit for every page the visitor goes on to view).
 */
export function TrafficBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") return; // don't count dev browsing

      let vid = localStorage.getItem(VID_KEY);
      if (!vid) {
        vid = crypto.randomUUID();
        localStorage.setItem(VID_KEY, vid);
      }

      // capture utm params once per tab, on whatever URL the visitor landed on
      let utm: { source?: string; medium?: string; campaign?: string } | null = null;
      const stored = sessionStorage.getItem(UTM_KEY);
      if (stored) {
        utm = JSON.parse(stored);
      } else {
        const q = new URLSearchParams(window.location.search);
        const source = q.get("utm_source");
        if (source) {
          utm = {
            source,
            medium: q.get("utm_medium") ?? undefined,
            campaign: q.get("utm_campaign") ?? undefined,
          };
        }
        sessionStorage.setItem(UTM_KEY, JSON.stringify(utm));
      }

      const ref = document.referrer;
      const external = ref && new URL(ref).hostname !== host ? ref : undefined;

      fetch("/api/track", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vid, path: pathname, ref: external, utm: utm ?? undefined }),
      }).catch(() => {});
    } catch {
      // storage blocked / malformed referrer — skip this view, never break the page
    }
  }, [pathname]);

  return null;
}
