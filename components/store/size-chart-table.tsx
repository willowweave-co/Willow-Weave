import type { SizeChart } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SizeChartTable({ chart, className }: { chart: SizeChart; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-96 border-collapse text-sm">
        <thead>
          <tr className="bg-parchment">
            {chart.columns.map((col, i) => (
              <th
                key={i}
                className={cn(
                  "border border-line px-3.5 py-2.5 text-left font-semibold text-ink",
                  i === 0 && "min-w-32"
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
                    "border border-line px-3.5 py-2.5",
                    ci === 0 ? "font-medium text-ink" : "text-bark"
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
