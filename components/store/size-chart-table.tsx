import type { SizeChart } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SizeChartTable({ chart, className }: { chart: SizeChart; className?: string }) {
  return (
    // overflow wrapper stays only as a safety net for very narrow screens —
    // the compact table is designed to fit a 390px viewport without scrolling
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-[0.8rem]">
        <thead>
          <tr className="bg-parchment">
            {chart.columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  "border border-line px-2 py-2 font-semibold text-ink",
                  i === 0 ? "text-left" : "text-center"
                )}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {chart.rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 ? "bg-parchment/40" : "bg-white/50"}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "border border-line px-2 py-2",
                    ci === 0 ? "font-medium text-ink" : "text-center text-bark"
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {chart.note && <p className="mt-2.5 text-xs leading-relaxed text-umber">{chart.note}</p>}
    </div>
  );
}
