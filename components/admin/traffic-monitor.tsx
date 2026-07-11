"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, Radio } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const POLL_MS = 30_000;

// same validated chart tokens as revenue-chart.tsx (mark passes chroma,
// lightness and 3:1 contrast against the ivory surface)
const MARK = "#a15c2a";
const GRID = "#e5daca";
const MUTED = "#6e5c4b";

interface HourPoint {
  hour: string;
  visitors: number;
  views: number;
}

interface Snapshot {
  liveVisitors: number;
  livePaths: { path: string; visitors: number }[];
  visitorsToday: number;
  viewsToday: number;
  hourly: HourPoint[];
  sources: { source: string; visitors: number }[];
  campaigns: { campaign: string; source: string; visitors: number }[];
}

type State =
  | { kind: "loading" }
  | { kind: "local" }
  | { kind: "pending" }
  | { kind: "ready"; data: Snapshot };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: HourPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-ivory px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">{p.hour}</p>
      <p className="mt-1 text-bark">
        Visitors <strong className="text-ink">{p.visitors}</strong>
      </p>
      <p className="text-bark">
        Pageviews <strong className="text-ink">{p.views}</strong>
      </p>
    </div>
  );
}

function HourlyChart({ data }: { data: HourPoint[] }) {
  const hasAny = data.some((d) => d.views > 0);
  return (
    <div
      className="mt-4 h-36 w-full sm:h-44"
      role="img"
      aria-label="Visitors per hour over the last 24 hours"
    >
      {hasAny ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={MARK} stopOpacity={0.22} />
                <stop offset="100%" stopColor={MARK} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fill: MUTED, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              minTickGap={32}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: MUTED, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: MUTED, strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="visitors"
              stroke={MARK}
              strokeWidth={2}
              fill="url(#trafficFill)"
              dot={false}
              activeDot={{ r: 4, fill: MARK, stroke: "#faf6ef", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-line px-4 text-center text-sm text-umber">
          No visits in the last 24 hours yet — the chart fills in as people browse the store.
        </div>
      )}
    </div>
  );
}

/**
 * Shopify-style live view: visitors on the store right now, today's traffic,
 * an hourly trend, and where the last 7 days of visitors came from (referrer
 * or utm_* tags — how ad posts are tracked). Polls /api/admin/traffic every
 * 30s while the tab is visible.
 */
export function TrafficMonitor() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/traffic", { cache: "no-store" });
      if (!res.ok) return;
      const body = await res.json();
      if (body.mode === "local") setState({ kind: "local" });
      else if (body.pending) setState({ kind: "pending" });
      else setState({ kind: "ready", data: body as Snapshot });
    } catch {
      /* offline blip — next tick catches up */
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  if (state.kind === "local" || state.kind === "pending") {
    return (
      <section className="mt-4 rounded-2xl border border-line bg-white/60 p-4 sm:mt-6 sm:p-5">
        <h2 className="flex items-center gap-2 font-semibold text-ink">
          <Radio className="h-4 w-4 text-umber/60" /> Live traffic
        </h2>
        <p className="mt-2 text-sm text-umber">
          {state.kind === "local"
            ? "Visitor tracking starts once the store runs on Supabase (production mode) — local preview doesn't record traffic."
            : "Almost there — paste supabase/migrations/0004_traffic.sql into the Supabase SQL editor (same as the earlier migrations) and this panel starts counting visitors."}
        </p>
      </section>
    );
  }

  const data = state.kind === "ready" ? state.data : null;

  return (
    <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[1.7fr_1fr]">
      {/* live now + 24h trend */}
      <section className="rounded-2xl border border-line bg-white/60 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-semibold text-ink">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            Live traffic
          </h2>
          <span className="text-xs text-umber">updates every 30s</span>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
          <div>
            <p className="heading-display text-3xl font-semibold text-ink sm:text-4xl">
              {data ? data.liveVisitors : "–"}
            </p>
            <p className="text-xs font-medium tracking-wide text-umber uppercase">
              Visitors right now
            </p>
          </div>
          <p className="pb-1 text-sm text-umber">
            {data ? (
              <>
                <strong className="font-semibold text-ink">{data.visitorsToday}</strong>{" "}
                {data.visitorsToday === 1 ? "visitor" : "visitors"} ·{" "}
                <strong className="font-semibold text-ink">{data.viewsToday}</strong> pageviews
                today
              </>
            ) : (
              "loading…"
            )}
          </p>
        </div>

        <HourlyChart data={data?.hourly ?? []} />

        {data && data.livePaths.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-1.5 text-xs font-medium tracking-wide text-umber uppercase">
              Being viewed right now
            </p>
            <ul className="space-y-1">
              {data.livePaths.map((p) => (
                <li key={p.path} className="flex items-center justify-between gap-3 text-sm">
                  <Link
                    href={p.path as never}
                    className="line-clamp-1 text-bark hover:text-walnut hover:underline"
                  >
                    {p.path}
                  </Link>
                  <span className="shrink-0 text-xs text-umber">
                    {p.visitors} {p.visitors === 1 ? "visitor" : "visitors"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* where visitors come from */}
      <section className="rounded-2xl border border-line bg-white/60 p-4 sm:p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-ink">
          <Megaphone className="h-4 w-4 text-umber/60" /> Traffic sources (7d)
        </h2>
        {data && data.sources.length > 0 ? (
          <ul className="space-y-2">
            {data.sources.map((s) => (
              <li key={s.source} className="flex items-center justify-between gap-3 text-sm">
                <span className="line-clamp-1 text-bark">{s.source}</span>
                <span className="shrink-0 text-xs text-umber">
                  {s.visitors} {s.visitors === 1 ? "visitor" : "visitors"}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-umber">
            No visits recorded yet. Sources appear here as people arrive — Instagram, Google,
            direct, and any ad links you tag.
          </p>
        )}

        {data && data.campaigns.length > 0 && (
          <div className="mt-4 border-t border-line pt-3">
            <p className="mb-1.5 text-xs font-medium tracking-wide text-umber uppercase">
              Ad campaigns
            </p>
            <ul className="space-y-2">
              {data.campaigns.map((c) => (
                <li
                  key={`${c.campaign}-${c.source}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0">
                    <span className="line-clamp-1 text-bark">{c.campaign}</span>
                    <span className="text-xs text-umber">via {c.source}</span>
                  </span>
                  <span className="shrink-0 text-xs text-umber">
                    {c.visitors} {c.visitors === 1 ? "visitor" : "visitors"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 rounded-lg bg-linen px-3 py-2 text-xs leading-relaxed text-umber">
          Tracking an ad? Link it to{" "}
          <code className="text-bark">
            willowweave.co/?utm_source=instagram&amp;utm_campaign=your-ad-name
          </code>{" "}
          and it shows up here by name.
        </p>
      </section>
    </div>
  );
}
