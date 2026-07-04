"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatPKR } from "@/lib/money";

/**
 * 30-day revenue trend. Single series (revenue) — orders ride along in the
 * tooltip rather than a second axis (dual axes mislead). Mark color #a15c2a
 * validated against the ivory surface (chroma, lightness, 3:1 contrast).
 */

const MARK = "#a15c2a";
const GRID = "#e5daca";
const MUTED = "#6e5c4b";

interface Point {
  date: string;
  revenue: number;
  orders: number;
}

function compactPKR(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-ivory px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-ink">
        {new Date(p.date + "T00:00:00").toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        })}
      </p>
      <p className="mt-1 text-bark">
        Revenue <strong className="text-ink">{formatPKR(p.revenue)}</strong>
      </p>
      <p className="text-bark">
        Orders <strong className="text-ink">{p.orders}</strong>
      </p>
    </div>
  );
}

export function RevenueChart({ data }: { data: Point[] }) {
  const hasAny = data.some((d) => d.revenue > 0 || d.orders > 0);

  return (
    <div className="h-64 w-full" role="img" aria-label="Revenue over the last 30 days">
      {hasAny ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={MARK} stopOpacity={0.22} />
                <stop offset="100%" stopColor={MARK} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) =>
                new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })
              }
              tick={{ fill: MUTED, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={compactPKR}
              tick={{ fill: MUTED, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={44}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: MUTED, strokeWidth: 1, strokeDasharray: "3 3" }}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={MARK}
              strokeWidth={2}
              fill="url(#revFill)"
              dot={false}
              activeDot={{ r: 4, fill: MARK, stroke: "#faf6ef", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-line text-sm text-umber">
          No sales in the last 30 days yet — revenue will chart here as orders come in.
        </div>
      )}
    </div>
  );
}
